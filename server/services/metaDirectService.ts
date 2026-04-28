import { getDb } from "../db";
import { adsPerformance, creativeLibrary, conceptSummary } from "../../drizzle/schema";
import { ENV } from "../_core/env";
import { eq, avg, sum, count } from "drizzle-orm";

const GRAPH_API = "https://graph.facebook.com/v19.0";

// THB spend threshold for SCALE / KILL decisions (FR-09)
const DECISION_SPEND_THRESHOLD = 500;

const META_AD_ACCOUNTS = [
  { id: "790515286671002", name: "idee 06" },
  { id: "1167175972155988", name: "idee 05" },
  { id: "664116972397842", name: "idee 03" },
  { id: "890040690415091", name: "idee 07" },
];

// ─── Meta Graph API helpers ───────────────────────────────────────────────────

async function graphGet(path: string, params: Record<string, string>) {
  const url = new URL(`${GRAPH_API}/${path}`);
  url.searchParams.set("access_token", ENV.metaAccessToken);
  for (const [k, v] of Object.entries(params)) {
    url.searchParams.set(k, v);
  }
  const res = await fetch(url.toString());
  const json = await res.json();
  if (json.error) {
    throw new Error(`Meta Graph API error: ${json.error.message} (code ${json.error.code})`);
  }
  return json;
}

// ─── FR-01: Performance insights ─────────────────────────────────────────────

async function fetchInsightsDirect(accountId: string) {
  console.log(`[MetaDirect] Fetching insights for act_${accountId}`);
  const data = await graphGet(`act_${accountId}/insights`, {
    level: "ad",
    date_preset: "last_30d",
    fields: [
      "ad_id", "ad_name", "campaign_id", "adset_id",
      "spend", "impressions", "clicks", "reach", "cpm",
      "actions", "action_values", "purchase_roas",
    ].join(","),
    limit: "500",
  });
  return (data.data as any[]) ?? [];
}

// ─── FR-02: Creative metadata (thumbnail + caption) via batch API ────────────

type CreativeMeta = { thumbnailUrl: string | null; caption: string | null; creativeUrl: string | null };

function parseCreative(c: any): CreativeMeta {
  const caption: string | null =
    c.body ||
    c.object_story_spec?.video_data?.message ||
    c.object_story_spec?.link_data?.message ||
    null;

  const creativeUrl: string | null =
    c.object_story_spec?.video_data?.video_id
      ? `https://www.facebook.com/video.php?v=${c.object_story_spec.video_data.video_id}`
      : c.object_story_spec?.link_data?.picture || null;

  return { thumbnailUrl: c.thumbnail_url ?? null, caption, creativeUrl };
}

// Uses the Graph batch API — different rate limit bucket from /act_{id}/ads
async function fetchCreativeMetadataBatch(adIds: string[]): Promise<Map<string, CreativeMeta>> {
  const map = new Map<string, CreativeMeta>();
  const BATCH = 50;
  const fields = "creative{body,title,thumbnail_url,object_story_spec}";

  for (let i = 0; i < adIds.length; i += BATCH) {
    const chunk = adIds.slice(i, i + BATCH);
    const batchParam = JSON.stringify(
      chunk.map((id) => ({ method: "GET", relative_url: `${id}?fields=${fields}` }))
    );

    try {
      const url = new URL(`${GRAPH_API}/`);
      url.searchParams.set("access_token", ENV.metaAccessToken);
      const res = await fetch(url.toString(), {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: `batch=${encodeURIComponent(batchParam)}`,
      });

      const results: any[] = await res.json();
      for (let j = 0; j < results.length; j++) {
        const item = results[j];
        if (!item || item.code !== 200) continue;
        const body = JSON.parse(item.body);
        const c = body?.creative;
        if (!c) continue;
        map.set(chunk[j], parseCreative(c));
      }
    } catch (err) {
      console.warn(`[MetaDirect] Batch creative fetch error (chunk ${i}):`, err);
    }
  }

  console.log(`[MetaDirect] Fetched creative metadata for ${map.size}/${adIds.length} ads`);
  return map;
}

async function fetchCreativeMetadata(adIds: string[]): Promise<Map<string, CreativeMeta>> {
  return fetchCreativeMetadataBatch(adIds);
}

// ─── Metric parsers ───────────────────────────────────────────────────────────

// Order priority: messaging orders (Messenger commerce) → omni_purchase → onsite purchase
const ORDER_ACTION_TYPES = [
  "onsite_conversion.messaging_order_created_v2",
  "omni_purchase",
  "onsite_conversion.purchase",
  "purchase",
];

// Revenue priority: omni covers all channels; fall back to web/app individually
const REVENUE_ACTION_TYPES = [
  "omni_purchase",
  "onsite_web_purchase",
  "onsite_app_purchase",
  "onsite_conversion.purchase",
];

function parseOrders(actions: any[]): number {
  if (!Array.isArray(actions)) return 0;
  for (const type of ORDER_ACTION_TYPES) {
    const hit = actions.find((a) => a.action_type === type);
    if (hit) return parseInt(hit.value ?? "0");
  }
  return 0;
}

function parseRevenue(actionValues: any[]): number {
  if (!Array.isArray(actionValues)) return 0;
  for (const type of REVENUE_ACTION_TYPES) {
    const hit = actionValues.find((a) => a.action_type === type);
    if (hit) return parseFloat(hit.value ?? "0");
  }
  return 0;
}

function parseRoasFromMeta(purchaseRoas: any[]): number {
  if (!Array.isArray(purchaseRoas) || purchaseRoas.length === 0) return 0;
  return parseFloat(purchaseRoas[0]?.value ?? "0");
}

// ─── FR-09: Rule-based SCALE / ITERATE / KILL ────────────────────────────────

function decideStatus(avgRoas: number, totalSpend: number): "SCALE" | "ITERATE" | "KILL" {
  if (totalSpend < DECISION_SPEND_THRESHOLD) return "ITERATE"; // not enough data
  if (avgRoas >= 3) return "SCALE";
  if (avgRoas < 1.5) return "KILL";
  return "ITERATE";
}

async function aggregateConceptDecisions(db: NonNullable<Awaited<ReturnType<typeof getDb>>>) {
  console.log("[MetaDirect] Aggregating concept decisions...");
  try {
    // Get all tagged ads with their performance
    const rows = await db
      .select({
        concept: creativeLibrary.concept,
        spend: adsPerformance.spend,
        roas: adsPerformance.roas,
        cpa: adsPerformance.cpa,
      })
      .from(creativeLibrary)
      .leftJoin(adsPerformance, eq(creativeLibrary.adId, adsPerformance.adId))
      .where(eq(creativeLibrary.status, "READY")); // only tagged ads

    // Group by concept in JS
    const byConceptMap = new Map<string, { spends: number[]; roases: number[]; cpas: number[] }>();
    for (const row of rows) {
      const concept = row.concept;
      if (!concept) continue;
      if (!byConceptMap.has(concept)) byConceptMap.set(concept, { spends: [], roases: [], cpas: [] });
      const g = byConceptMap.get(concept)!;
      g.spends.push(parseFloat(row.spend ?? "0"));
      g.roases.push(parseFloat(row.roas ?? "0"));
      g.cpas.push(parseFloat(row.cpa ?? "0"));
    }

    for (const [concept, g] of byConceptMap) {
      const totalSpend = g.spends.reduce((a, b) => a + b, 0);
      const avgRoas = g.roases.reduce((a, b) => a + b, 0) / g.roases.length;
      const avgCpa = g.cpas.reduce((a, b) => a + b, 0) / g.cpas.length;
      const adsCount = g.spends.length;
      const decision = decideStatus(avgRoas, totalSpend);

      await db
        .insert(conceptSummary)
        .values({
          concept,
          totalSpend: totalSpend.toFixed(2),
          avgRoas: avgRoas.toFixed(4),
          avgCpa: avgCpa.toFixed(2),
          adsCount,
          decision,
        })
        .onDuplicateKeyUpdate({
          set: {
            totalSpend: totalSpend.toFixed(2),
            avgRoas: avgRoas.toFixed(4),
            avgCpa: avgCpa.toFixed(2),
            adsCount,
            decision,
            updatedAt: new Date(),
          },
        });

      console.log(`[MetaDirect] Concept "${concept}": ROAS=${avgRoas.toFixed(2)} Spend=${totalSpend.toFixed(0)} → ${decision}`);
    }
  } catch (err) {
    console.error("[MetaDirect] Error aggregating concepts:", err);
  }
}

// ─── FR-03: Per-account sync (insights + creative metadata merged) ────────────

async function syncAccountDirect(
  account: { id: string; name: string },
  db: NonNullable<Awaited<ReturnType<typeof getDb>>>,
  withThumbnails = false
) {
  // Fetch insights first, then use those ad IDs for batch creative fetch
  const insights = await fetchInsightsDirect(account.id);
  const adIds = insights.map((row: any) => row.ad_id).filter(Boolean);
  const creativeMeta = withThumbnails && adIds.length > 0
    ? await fetchCreativeMetadata(adIds)
    : new Map();

  if (insights.length === 0) {
    console.log(`[MetaDirect] No insights returned for ${account.name}`);
    return { account: account.name, status: "success" as const, adsSynced: 0 };
  }

  let synced = 0;
  for (const row of insights) {
    try {
      const adId: string = row.ad_id;
      if (!adId) continue;

      const adName: string = row.ad_name ?? adId;
      const spend = parseFloat(row.spend ?? "0");
      const impressions = parseInt(row.impressions ?? "0");
      const clicks = parseInt(row.clicks ?? "0");
      const reach = parseInt(row.reach ?? "0");
      const cpm = parseFloat(row.cpm ?? (impressions > 0 ? ((spend / impressions) * 1000).toFixed(2) : "0"));
      const purchases = parseOrders(row.actions);
      // Revenue: from action_values first, then fall back to purchase_roas × spend
      const revenue = parseRevenue(row.action_values) || parseRoasFromMeta(row.purchase_roas) * spend;
      const roas = spend > 0 ? revenue / spend : 0;
      const cpa = purchases > 0 ? spend / purchases : 0;
      console.log(`[MetaDirect] ${adName.slice(0, 40)} | spend=${spend} orders=${purchases} revenue=${revenue} roas=${roas.toFixed(2)}`);

      // FR-02: merge creative metadata
      const meta = creativeMeta.get(adId);

      await db
        .insert(adsPerformance)
        .values({
          adId,
          accountId: `act_${account.id}`,
          adName,
          campaignId: row.campaign_id ?? null,
          adsetId: row.adset_id ?? null,
          spend: spend.toFixed(2),
          roas: roas.toFixed(4),
          cpa: cpa.toFixed(2),
          cpm: cpm.toFixed(2),
          impressions,
          reach,
          clicks,
          purchases,
          revenue: revenue.toFixed(2),
          metricDate: new Date(),
        })
        .onDuplicateKeyUpdate({
          set: {
            adName,
            spend: spend.toFixed(2),
            roas: roas.toFixed(4),
            cpa: cpa.toFixed(2),
            cpm: cpm.toFixed(2),
            impressions,
            reach,
            clicks,
            purchases,
            revenue: revenue.toFixed(2),
            updatedAt: new Date(),
          },
        });

      // FR-04: new creative → NEED_TAGGING; existing → preserve tags + never blank-out media or caption
      const mediaUpdate: Record<string, any> = { updatedAt: new Date() };
      if (meta?.caption)      mediaUpdate.caption      = meta.caption;
      if (meta?.thumbnailUrl) mediaUpdate.thumbnailUrl = meta.thumbnailUrl;
      if (meta?.creativeUrl)  mediaUpdate.creativeUrl  = meta.creativeUrl;

      await db
        .insert(creativeLibrary)
        .values({
          creativeId: `${adId}_creative`,
          adId,
          caption: meta?.caption ?? adName,
          thumbnailUrl: meta?.thumbnailUrl ?? null,
          creativeUrl: meta?.creativeUrl ?? null,
          status: "NEED_TAGGING",
        })
        .onDuplicateKeyUpdate({ set: mediaUpdate });

      synced++;
    } catch (err) {
      console.error(`[MetaDirect] Error saving ad ${row.ad_id}:`, err);
    }
  }

  console.log(`[MetaDirect] Synced ${synced} ads for ${account.name}`);
  return { account: account.name, status: "success" as const, adsSynced: synced };
}

// ─── Public: full sync ────────────────────────────────────────────────────────

// withThumbnails=true on manual sync, false on scheduled auto-sync to avoid rate limits
export async function syncAllAccountsDirect(withThumbnails = true) {
  const db = await getDb();
  if (!db) {
    return { success: false, message: "Database not available", totalAdsSynced: 0, results: [] };
  }

  const results = [];
  let totalAdsSynced = 0;

  for (const account of META_AD_ACCOUNTS) {
    try {
      const result = await syncAccountDirect(account, db, withThumbnails);
      results.push(result);
      totalAdsSynced += result.adsSynced;
    } catch (err: any) {
      console.error(`[MetaDirect] Error syncing ${account.name}:`, err.message);
      results.push({ account: account.name, status: "error" as const, adsSynced: 0, message: err.message });
    }
  }

  // Auto-tag concepts + hooks from caption keywords
  const { runAutoTagging } = await import("./autoTagService");
  await runAutoTagging(db);

  // FR-09: run rule-based decisions after every sync
  await aggregateConceptDecisions(db);

  return {
    success: true,
    message: `Synced ${totalAdsSynced} ads from ${META_AD_ACCOUNTS.length} accounts`,
    totalAdsSynced,
    results,
  };
}
