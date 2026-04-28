import { getDb } from "../db";
import { adsPerformance, creativeLibrary } from "../../drizzle/schema";
import { ENV } from "../_core/env";

const BUILT_IN_FORGE_API_KEY = ENV.forgeApiKey;
const BUILT_IN_FORGE_API_URL = ENV.forgeApiUrl;

export const META_AD_ACCOUNTS = [
  { id: "790515286671002", name: "idee 06" },
  { id: "1167175972155988", name: "idee 05" },
  { id: "664116972397842", name: "idee 03" },
  { id: "890040690415091", name: "idee 07" },
];

async function callForgeApi(tool: string, input: Record<string, unknown>) {
  const response = await fetch(`${BUILT_IN_FORGE_API_URL}/api/mcp/invoke`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${BUILT_IN_FORGE_API_KEY}`,
    },
    body: JSON.stringify({
      connector: "meta-marketing",
      tool,
      input,
    }),
  });

  if (!response.ok) {
    throw new Error(`Forge API error: ${response.status} ${response.statusText}`);
  }

  return response.json();
}

/**
 * Fetch ads from Meta Ads using Manus Forge API
 */
export async function fetchAdsFromMetaForge(accountId: string) {
  try {
    console.log(`[MetaForgeService] Fetching ads for account: ${accountId}`);

    const accountIdWithoutPrefix = accountId.replace(/^act_/, "");

    const data = await callForgeApi("meta_marketing_get_ads", {
      ad_account_id: accountIdWithoutPrefix,
      limit: 100,
    });

    if (!data.result || !data.result.ads) {
      console.warn(`[MetaForgeService] No ads found in response for ${accountId}`);
      return [];
    }

    const ads = data.result.ads.map((ad: any) => ({
      id: ad.id,
      name: ad.name,
      status: ad.effective_status,
      campaign_id: ad.campaign_id,
      adset_id: ad.adset_id,
    }));

    console.log(`[MetaForgeService] Fetched ${ads.length} ads for ${accountId}`);
    return ads;
  } catch (error) {
    console.error(`[MetaForgeService] Error fetching ads:`, error);
    return [];
  }
}

/**
 * Fetch ad-level insights (real performance metrics) for an account
 */
export async function fetchInsightsFromMetaForge(accountId: string) {
  try {
    console.log(`[MetaForgeService] Fetching insights for account: ${accountId}`);

    const accountIdWithoutPrefix = accountId.replace(/^act_/, "");

    const data = await callForgeApi("meta_marketing_get_insights", {
      ad_account_id: accountIdWithoutPrefix,
      level: "ad",
      date_preset: "last_30d",
      fields: [
        "ad_id",
        "ad_name",
        "campaign_id",
        "adset_id",
        "spend",
        "impressions",
        "clicks",
        "reach",
        "cpm",
        "actions",
        "purchase_roas",
      ],
    });

    // Handle various response shapes from the Meta API
    const insights =
      data?.result?.data ||
      data?.result?.insights ||
      data?.result ||
      [];

    if (!Array.isArray(insights) || insights.length === 0) {
      console.warn(`[MetaForgeService] No insights found for ${accountId}`);
      return [];
    }

    console.log(`[MetaForgeService] Fetched ${insights.length} insights for ${accountId}`);
    return insights;
  } catch (error) {
    console.error(`[MetaForgeService] Error fetching insights:`, error);
    return [];
  }
}

function parsePurchases(actions: any[]): number {
  if (!Array.isArray(actions)) return 0;
  const purchase = actions.find(
    (a) => a.action_type === "purchase" || a.action_type === "omni_purchase"
  );
  return purchase ? parseInt(purchase.value || "0") : 0;
}

function parseRoas(purchaseRoas: any[]): number {
  if (!Array.isArray(purchaseRoas)) return 0;
  const entry = purchaseRoas[0];
  return entry ? parseFloat(entry.value || "0") : 0;
}

/**
 * Sync a single account using Forge API — fetches real insights and upserts to DB
 */
async function syncAccountWithForge(
  account: { id: string; name: string },
  db: NonNullable<Awaited<ReturnType<typeof getDb>>>
) {
  const accountTag = `act_${account.id}`;

  // Prefer insights (richer data) but fall back to ads-only if insights unavailable
  const insights = await fetchInsightsFromMetaForge(account.id);

  let rows: any[] = insights;
  if (insights.length === 0) {
    console.log(`[MetaForgeService] No insights for ${account.name}, trying ads endpoint`);
    rows = await fetchAdsFromMetaForge(account.id);
  }

  if (rows.length === 0) {
    return { account: account.name, status: "success" as const, adsSynced: 0 };
  }

  let synced = 0;
  for (const row of rows) {
    try {
      const adId: string = row.ad_id || row.id;
      if (!adId) continue;

      const adName: string = row.ad_name || row.name || adId;
      const spend = parseFloat(row.spend || "0");
      const impressions = parseInt(row.impressions || "0");
      const clicks = parseInt(row.clicks || row.link_clicks || "0");
      const reach = parseInt(row.reach || "0");
      const cpm = impressions > 0 ? (spend / impressions) * 1000 : parseFloat(row.cpm || "0");
      const purchases = parsePurchases(row.actions);
      const roas = parseRoas(row.purchase_roas);
      const revenue = roas * spend;
      const cpa = purchases > 0 ? spend / purchases : 0;
      const campaignId: string | null = row.campaign_id || null;
      const adsetId: string | null = row.adset_id || null;

      await db
        .insert(adsPerformance)
        .values({
          adId,
          accountId: accountTag,
          adName,
          campaignId,
          adsetId,
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

      await db
        .insert(creativeLibrary)
        .values({
          creativeId: `${adId}_creative`,
          adId,
          caption: adName,
          creativeUrl: row.creative_url || null,
          thumbnailUrl: row.thumbnail_url || null,
          status: "NEED_TAGGING",
        })
        .onDuplicateKeyUpdate({
          set: {
            caption: adName,
            updatedAt: new Date(),
          },
        });

      synced++;
    } catch (err) {
      console.error(`[MetaForgeService] Error saving ad row:`, err);
    }
  }

  return { account: account.name, status: "success" as const, adsSynced: synced };
}

/**
 * Sync all configured Meta Ad accounts.
 * Priority: Forge API (production) → direct Meta Graph API (local with token) → sample data (dev fallback)
 */
export async function syncAllAccountsWithForge(withThumbnails = true) {
  if (!BUILT_IN_FORGE_API_URL || !BUILT_IN_FORGE_API_KEY) {
    if (ENV.metaAccessToken) {
      console.log("[MetaForgeService] Using direct Meta Graph API (META_ACCESS_TOKEN set)");
      const { syncAllAccountsDirect } = await import("./metaDirectService");
      return syncAllAccountsDirect(withThumbnails);
    }
    console.warn("[MetaForgeService] No API credentials — using sample data for local dev");
    const { syncSampleData } = await import("./simpleSyncService");
    return syncSampleData();
  }

  const db = await getDb();
  if (!db) {
    return { success: false, message: "Database not available", totalAdsSynced: 0, results: [] };
  }

  const results = [];
  let totalAdsSynced = 0;

  for (const account of META_AD_ACCOUNTS) {
    console.log(`[MetaForgeService] Syncing account: ${account.name}`);
    try {
      const result = await syncAccountWithForge(account, db);
      results.push(result);
      totalAdsSynced += result.adsSynced;
    } catch (err) {
      console.error(`[MetaForgeService] Error syncing ${account.name}:`, err);
      results.push({ account: account.name, status: "error" as const, adsSynced: 0 });
    }
  }

  return {
    success: true,
    message: `Synced ${totalAdsSynced} ads from ${META_AD_ACCOUNTS.length} accounts`,
    totalAdsSynced,
    results,
  };
}
