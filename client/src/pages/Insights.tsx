import { useMemo } from "react";
import { trpc } from "@/lib/trpc";
import BrandFilterBar from "@/components/BrandFilterBar";
import { useBrandFilter } from "@/hooks/useBrandFilter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Lightbulb, TrendingUp, TrendingDown, Minus, AlertTriangle, Layers, Target, Shuffle } from "lucide-react";

// ─── EntityID helpers ─────────────────────────────────────────────────────────
// In Meta Andromeda, an EntityID is a unique creative identity.
// We approximate it as a distinct (concept + hookType) combination.
// Same concept + same hook = same EntityID = same auction ticket.

type EntityGroup = {
  entityId: string;
  concept: string;
  hookType: string | null;
  ads: any[];
  avgRoas: number;
  totalSpend: number;
  decision: "SCALE" | "ITERATE" | "KILL" | "TESTING";
};

function buildEntityGroups(ads: any[]): EntityGroup[] {
  const map = new Map<string, any[]>();

  for (const ad of ads) {
    if (!ad.concept) continue;
    const key = `${ad.concept}||${ad.hookType ?? ""}`;
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(ad);
  }

  return Array.from(map.entries()).map(([key, group]) => {
    const [concept, hookType] = key.split("||");
    const totalSpend = group.reduce((s, a) => s + parseFloat(a.spend ?? 0), 0);
    const avgRoas = group.reduce((s, a) => s + parseFloat(a.roas ?? 0), 0) / group.length;

    let decision: EntityGroup["decision"] = "TESTING";
    if (totalSpend >= 500) {
      if (avgRoas >= 3) decision = "SCALE";
      else if (avgRoas < 1.5) decision = "KILL";
      else decision = "ITERATE";
    }

    return {
      entityId: key,
      concept,
      hookType: hookType || null,
      ads: group,
      avgRoas,
      totalSpend,
      decision,
    };
  }).sort((a, b) => b.avgRoas - a.avgRoas);
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function DecisionBadge({ decision }: { decision: EntityGroup["decision"] }) {
  if (decision === "SCALE")   return <Badge className="bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300 gap-1"><TrendingUp className="w-3 h-3" />SCALE</Badge>;
  if (decision === "KILL")    return <Badge className="bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300 gap-1"><TrendingDown className="w-3 h-3" />KILL</Badge>;
  if (decision === "ITERATE") return <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 gap-1"><Minus className="w-3 h-3" />ITERATE</Badge>;
  return <Badge variant="outline" className="text-xs text-muted-foreground">TESTING</Badge>;
}

function EntityDiversityScore({ entities, totalAds }: { entities: EntityGroup[]; totalAds: number }) {
  const entityCount = entities.length;
  // Target: 10-15 genuine EntityIDs (per Meta Andromeda recommendation)
  const TARGET = 12;
  const score = Math.min(100, Math.round((entityCount / TARGET) * 100));
  const avgAdsPerEntity = totalAds > 0 ? (totalAds / Math.max(entityCount, 1)).toFixed(1) : "–";

  const color = score >= 80 ? "text-green-600" : score >= 50 ? "text-amber-600" : "text-red-500";
  const barColor = score >= 80 ? "bg-green-500" : score >= 50 ? "bg-amber-500" : "bg-red-500";

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
      <div className="p-6 rounded-xl border bg-card">
        <p className="text-xs text-muted-foreground mb-1">Genuine EntityIDs</p>
        <p className={`text-3xl font-bold ${color}`}>{entityCount}</p>
        <p className="text-xs text-muted-foreground mt-1">target: 10–15</p>
      </div>
      <div className="p-6 rounded-xl border bg-card">
        <p className="text-xs text-muted-foreground mb-1">Auction tickets</p>
        <p className="text-3xl font-bold">{entityCount}</p>
        <p className="text-xs text-muted-foreground mt-1">across {totalAds} ads</p>
      </div>
      <div className="p-6 rounded-xl border bg-card">
        <p className="text-xs text-muted-foreground mb-1">Avg ads / EntityID</p>
        <p className="text-3xl font-bold">{avgAdsPerEntity}</p>
        <p className="text-xs text-muted-foreground mt-1">lower = more unique</p>
      </div>
      <div className="p-6 rounded-xl border bg-card">
        <p className="text-xs text-muted-foreground mb-1">Diversity score</p>
        <p className={`text-3xl font-bold ${color}`}>{score}%</p>
        <div className="mt-2 h-1.5 rounded-full bg-muted overflow-hidden">
          <div className={`h-full rounded-full ${barColor} transition-all`} style={{ width: `${score}%` }} />
        </div>
      </div>
    </div>
  );
}

function DuplicateRiskRow({ entity }: { entity: EntityGroup }) {
  const risk = entity.ads.length >= 5 ? "high" : entity.ads.length >= 3 ? "medium" : null;
  if (!risk) return null;
  return (
    <div className={`flex items-start gap-4 p-5 rounded-xl border text-sm ${risk === "high" ? "border-red-200 bg-red-50 dark:bg-red-950/20" : "border-amber-200 bg-amber-50 dark:bg-amber-950/20"}`}>
      <AlertTriangle className={`w-4 h-4 mt-0.5 shrink-0 ${risk === "high" ? "text-red-500" : "text-amber-500"}`} />
      <div>
        <p className="font-medium">{entity.concept} × {entity.hookType ?? "no hook"} — {entity.ads.length} ads share 1 EntityID</p>
        <p className="text-muted-foreground text-xs mt-0.5">
          {risk === "high"
            ? "High duplication risk — Meta Andromeda collapses these into 1 auction ticket. Create genuinely different concepts."
            : "Consider diversifying the hook or format to earn a separate EntityID."}
        </p>
      </div>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function Insights() {
  const { accountSuffix } = useBrandFilter();
  const { data: ads, isLoading } = trpc.analytics.getRankedAds.useQuery({ sortBy: "roas", limit: 500, accountSuffix });

  const { entities, taggedAds, untaggedCount, uniqueConcepts, uniqueHooks, uniqueFormats, uniquePersonas } = useMemo(() => {
    if (!ads) return { entities: [], taggedAds: [], untaggedCount: 0, uniqueConcepts: 0, uniqueHooks: 0, uniqueFormats: 0, uniquePersonas: 0 };

    const tagged = ads.filter((a: any) => a.concept);
    const untagged = ads.filter((a: any) => !a.concept).length;
    const entities = buildEntityGroups(tagged);

    return {
      entities,
      taggedAds: tagged,
      untaggedCount: untagged,
      uniqueConcepts: new Set(tagged.map((a: any) => a.concept)).size,
      uniqueHooks: new Set(tagged.filter((a: any) => a.hookType).map((a: any) => a.hookType)).size,
      uniqueFormats: new Set(tagged.filter((a: any) => a.format).map((a: any) => a.format)).size,
      uniquePersonas: new Set(tagged.filter((a: any) => a.persona).map((a: any) => a.persona)).size,
    };
  }, [ads]);

  const winners = entities.filter((e) => e.decision === "SCALE");
  const killers = entities.filter((e) => e.decision === "KILL");
  const iterators = entities.filter((e) => e.decision === "ITERATE");
  const duplicateRisks = entities.filter((e) => e.ads.length >= 3);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!ads || taggedAds.length === 0) {
    return (
      <div className="space-y-6">
        <Card>
          <CardContent className="py-12 text-center">
            <Lightbulb className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
            <p className="font-medium">No tagged ads yet</p>
            <p className="text-sm text-muted-foreground mt-1">Go to Analytics → Your Ads and tag concepts + hooks first, then come back for insights.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-12">
      <BrandFilterBar />
      {/* EntityID diversity panel */}
      <section>
        <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide mb-3 flex items-center gap-2">
          <Layers className="w-4 h-4" /> EntityID Coverage
        </h2>
        <EntityDiversityScore entities={entities} totalAds={taggedAds.length} />
      </section>

      {/* Dimension breakdown */}
      <section>
        <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide mb-3 flex items-center gap-2">
          <Shuffle className="w-4 h-4" /> Creative Dimensions
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
          {[
            { label: "Concepts", count: uniqueConcepts, target: 6, desc: "distinct themes" },
            { label: "Hooks", count: uniqueHooks, target: 5, desc: "entry angles" },
            { label: "Formats", count: uniqueFormats, target: 3, desc: "UGC, Static, Reels…" },
            { label: "Personas", count: uniquePersonas, target: 3, desc: "audience segments" },
          ].map(({ label, count, target, desc }) => {
            const pct = Math.min(100, Math.round((count / target) * 100));
            const c = pct >= 80 ? "text-green-600" : pct >= 40 ? "text-amber-600" : "text-red-500";
            const bar = pct >= 80 ? "bg-green-500" : pct >= 40 ? "bg-amber-500" : "bg-red-500";
            return (
              <div key={label} className="p-4 rounded-lg border bg-card">
                <p className="text-xs text-muted-foreground mb-1">{label}</p>
                <p className={`text-2xl font-bold ${c}`}>{count}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{desc}</p>
                <div className="mt-2 h-1 rounded-full bg-muted overflow-hidden">
                  <div className={`h-full rounded-full ${bar}`} style={{ width: `${pct}%` }} />
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Duplication risk */}
      {duplicateRisks.length > 0 && (
        <section>
          <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide mb-3 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-500" /> Duplication Risk (same EntityID)
          </h2>
          <div className="space-y-2">
            {duplicateRisks.map((e) => <DuplicateRiskRow key={e.entityId} entity={e} />)}
          </div>
        </section>
      )}

      {/* Winners */}
      {winners.length > 0 && (
        <section>
          <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide mb-3 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-green-600" /> Scale These EntityIDs
          </h2>
          <div className="space-y-3">
            {winners.map((e) => (
              <Card key={e.entityId} className="border-l-4 border-l-green-500">
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <CardTitle className="text-base">{e.concept}</CardTitle>
                      {e.hookType && <CardDescription>Hook: {e.hookType}</CardDescription>}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-sm font-bold text-green-600">{e.avgRoas.toFixed(2)}x ROAS</span>
                      <DecisionBadge decision={e.decision} />
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-0 space-y-2">
                  <div className="flex gap-4 text-xs text-muted-foreground">
                    <span>{e.ads.length} ads share this EntityID</span>
                    <span>฿{e.totalSpend.toLocaleString("th-TH", { maximumFractionDigits: 0 })} total spend</span>
                  </div>
                  <div className="bg-green-50 dark:bg-green-950/20 rounded p-3 text-xs space-y-1">
                    <p className="font-medium text-green-800 dark:text-green-300">Andromeda signal: strong EntityID</p>
                    <p className="text-green-700 dark:text-green-400">→ Increase budget on this concept + hook combo</p>
                    <p className="text-green-700 dark:text-green-400">→ Create variations with different personas or formats — each earns a new EntityID</p>
                    {e.ads.length >= 3 && <p className="text-green-700 dark:text-green-400">→ {e.ads.length} ads in this EntityID — additional ads here won't add auction tickets</p>}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      )}

      {/* ITERATE */}
      {iterators.length > 0 && (
        <section>
          <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide mb-3 flex items-center gap-2">
            <Minus className="w-4 h-4 text-amber-500" /> Iterate These EntityIDs
          </h2>
          <div className="space-y-3">
            {iterators.map((e) => (
              <Card key={e.entityId} className="border-l-4 border-l-amber-400">
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <CardTitle className="text-base">{e.concept}</CardTitle>
                      {e.hookType && <CardDescription>Hook: {e.hookType}</CardDescription>}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-sm font-semibold text-amber-600">{e.avgRoas.toFixed(2)}x ROAS</span>
                      <DecisionBadge decision={e.decision} />
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="flex gap-4 text-xs text-muted-foreground mb-2">
                    <span>{e.ads.length} ads · ฿{e.totalSpend.toLocaleString("th-TH", { maximumFractionDigits: 0 })} spend</span>
                  </div>
                  <div className="bg-amber-50 dark:bg-amber-950/20 rounded p-3 text-xs space-y-1">
                    <p className="font-medium text-amber-800 dark:text-amber-300">Concept shows signal — hook may be the weak point</p>
                    <p className="text-amber-700 dark:text-amber-400">→ Keep concept, test a different hook to create a new EntityID</p>
                    <p className="text-amber-700 dark:text-amber-400">→ Try a different persona or format variation</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      )}

      {/* KILL */}
      {killers.length > 0 && (
        <section>
          <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide mb-3 flex items-center gap-2">
            <TrendingDown className="w-4 h-4 text-red-500" /> Kill These EntityIDs
          </h2>
          <div className="space-y-3">
            {killers.map((e) => (
              <Card key={e.entityId} className="border-l-4 border-l-red-500">
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <CardTitle className="text-base">{e.concept}</CardTitle>
                      {e.hookType && <CardDescription>Hook: {e.hookType}</CardDescription>}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-sm font-semibold text-red-500">{e.avgRoas.toFixed(2)}x ROAS</span>
                      <DecisionBadge decision={e.decision} />
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="flex gap-4 text-xs text-muted-foreground mb-2">
                    <span>{e.ads.length} ads · ฿{e.totalSpend.toLocaleString("th-TH", { maximumFractionDigits: 0 })} spend</span>
                  </div>
                  <div className="bg-red-50 dark:bg-red-950/20 rounded p-3 text-xs space-y-1">
                    <p className="font-medium text-red-800 dark:text-red-300">EntityID not resonating with audience</p>
                    <p className="text-red-700 dark:text-red-400">→ Stop budget immediately — concept+hook combination doesn't convert</p>
                    <p className="text-red-700 dark:text-red-400">→ Don't create variations of this EntityID — the signal is clear</p>
                    <p className="text-red-700 dark:text-red-400">→ Reallocate budget to SCALE entities above</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      )}

      {/* Full EntityID map */}
      <section>
        <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide mb-3 flex items-center gap-2">
          <Target className="w-4 h-4" /> All EntityIDs
        </h2>
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b bg-muted/50">
                  <tr>
                    <th className="text-left py-2.5 px-3 font-medium text-muted-foreground text-xs">Concept</th>
                    <th className="text-left py-2.5 px-3 font-medium text-muted-foreground text-xs">Hook</th>
                    <th className="text-right py-2.5 px-3 font-medium text-muted-foreground text-xs">Ads</th>
                    <th className="text-right py-2.5 px-3 font-medium text-muted-foreground text-xs">ROAS</th>
                    <th className="text-right py-2.5 px-3 font-medium text-muted-foreground text-xs">Spend</th>
                    <th className="text-center py-2.5 px-3 font-medium text-muted-foreground text-xs">Decision</th>
                  </tr>
                </thead>
                <tbody>
                  {entities.map((e) => {
                    const roasColor = e.avgRoas >= 3 ? "text-green-600 font-bold" : e.avgRoas < 1.5 && e.totalSpend >= 500 ? "text-red-500" : "text-amber-600";
                    return (
                      <tr key={e.entityId} className="border-b last:border-0 hover:bg-muted/20">
                        <td className="py-2.5 px-3 font-medium text-xs">{e.concept}</td>
                        <td className="py-2.5 px-3 text-xs text-muted-foreground">{e.hookType ?? <span className="italic opacity-50">none</span>}</td>
                        <td className="py-2.5 px-3 text-right text-xs tabular-nums">
                          {e.ads.length}
                          {e.ads.length >= 3 && <span className="ml-1 text-amber-500" title="Duplication risk">⚠</span>}
                        </td>
                        <td className={`py-2.5 px-3 text-right text-xs tabular-nums ${roasColor}`}>{e.avgRoas.toFixed(2)}x</td>
                        <td className="py-2.5 px-3 text-right text-xs tabular-nums text-muted-foreground">฿{e.totalSpend.toLocaleString("th-TH", { maximumFractionDigits: 0 })}</td>
                        <td className="py-2.5 px-3 text-center"><DecisionBadge decision={e.decision} /></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
        {untaggedCount > 0 && (
          <p className="text-xs text-muted-foreground mt-2">
            +{untaggedCount} untagged ads excluded — go to Analytics → Your Ads to tag them
          </p>
        )}
      </section>

      {/* Andromeda explainer */}
      <Card className="bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm text-blue-900 dark:text-blue-100 flex items-center gap-2">
            <Lightbulb className="w-4 h-4" /> About Meta Andromeda & EntityID
          </CardTitle>
        </CardHeader>
        <CardContent className="text-xs text-blue-800 dark:text-blue-200 space-y-1.5">
          <p>Meta's Andromeda system uses computer vision, NLP, and audio analysis to cluster similar ads into a single <strong>EntityID</strong>. Each EntityID = one auction ticket — regardless of how many ad variations share it.</p>
          <p>Minor changes (different headline, button color, background music) do <strong>not</strong> create a new EntityID. You need genuine conceptual diversity across format, persona, environment, and benefit messaging.</p>
          <p><strong>Target:</strong> 10–15 genuinely distinct EntityIDs. Volume without diversity wastes budget and auction slots.</p>
        </CardContent>
      </Card>
    </div>
  );
}
