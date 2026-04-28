import { useState, useRef, useEffect, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, ArrowUpDown, ArrowUp, ArrowDown, TrendingUp, TrendingDown, Minus, Check, X, Flame, AlertTriangle, Tag, BarChart2 } from "lucide-react";
import { toast } from "sonner";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from "recharts";

// ─── helpers ──────────────────────────────────────────────────────────────────

function fmt(n: any, decimals = 2) {
  return parseFloat(n ?? 0).toFixed(decimals);
}

type SortKey = "roas" | "cpa" | "spend" | "impressions";

// ─── Inline tag cell ──────────────────────────────────────────────────────────

function TagCell({
  value,
  placeholder,
  suggestions,
  onSave,
}: {
  value: string | null;
  placeholder: string;
  suggestions: string[];
  onSave: (v: string) => Promise<void>;
}) {
  const [editing, setEditing] = useState(false);
  const [input, setInput] = useState(value ?? "");
  const [saving, setSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing) inputRef.current?.focus();
  }, [editing]);

  const filtered = suggestions.filter(
    (s) => s && s.toLowerCase().includes(input.toLowerCase()) && s !== input
  ).slice(0, 6);

  const commit = async (val: string) => {
    setSaving(true);
    try {
      await onSave(val.trim());
      setInput(val.trim());
      setEditing(false);
    } catch {
      toast.error("Failed to save tag");
    } finally {
      setSaving(false);
    }
  };

  if (!editing) {
    return (
      <button
        onClick={() => { setInput(value ?? ""); setEditing(true); }}
        className="text-left w-full"
      >
        {value ? (
          <Badge variant="secondary" className="text-xs cursor-pointer hover:opacity-80">{value}</Badge>
        ) : (
          <span className="text-xs text-muted-foreground/60 hover:text-muted-foreground cursor-pointer border border-dashed border-muted-foreground/30 rounded px-1.5 py-0.5">
            + {placeholder}
          </span>
        )}
      </button>
    );
  }

  return (
    <div className="relative min-w-[140px]">
      <div className="flex items-center gap-1">
        <Input
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") commit(input);
            if (e.key === "Escape") setEditing(false);
          }}
          className="h-7 text-xs px-2 py-0"
          placeholder={placeholder}
        />
        <button onClick={() => commit(input)} className="text-green-600 hover:text-green-700 shrink-0">
          {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
        </button>
        <button onClick={() => setEditing(false)} className="text-muted-foreground hover:text-foreground shrink-0">
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {filtered.length > 0 && (
        <div className="absolute top-full left-0 z-50 mt-0.5 bg-popover border rounded-md shadow-md w-max min-w-full max-h-40 overflow-auto">
          {filtered.map((s) => (
            <button
              key={s}
              onMouseDown={(e) => { e.preventDefault(); commit(s); }}
              className="w-full text-left text-xs px-3 py-1.5 hover:bg-accent transition-colors block"
            >
              {s}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Decision badge ───────────────────────────────────────────────────────────

function DecisionBadge({ roas, spend }: { roas: number; spend: number }) {
  if (spend < 500) return <span className="text-xs text-muted-foreground">–</span>;
  if (roas >= 3)   return <Badge className="bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300 text-xs flex items-center gap-1"><TrendingUp className="w-3 h-3" />SCALE</Badge>;
  if (roas < 1.5)  return <Badge className="bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300 text-xs flex items-center gap-1"><TrendingDown className="w-3 h-3" />KILL</Badge>;
  return <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 text-xs flex items-center gap-1"><Minus className="w-3 h-3" />ITERATE</Badge>;
}

// ─── Insight panel (computed from live data) ──────────────────────────────────

function InsightPanel({ ads }: { ads: any[] }) {
  const insights = useMemo(() => {
    if (!ads || ads.length === 0) return null;

    const tagged = ads.filter((a) => a.concept);
    const untagged = ads.filter((a) => !a.concept).length;

    // Group by concept to find best/worst
    const byConceptMap = new Map<string, { roases: number[]; spends: number[] }>();
    for (const ad of tagged) {
      const c = ad.concept as string;
      if (!byConceptMap.has(c)) byConceptMap.set(c, { roases: [], spends: [] });
      const g = byConceptMap.get(c)!;
      g.roases.push(parseFloat(ad.roas ?? 0));
      g.spends.push(parseFloat(ad.spend ?? 0));
    }

    const conceptStats = Array.from(byConceptMap.entries()).map(([concept, g]) => ({
      concept,
      avgRoas: g.roases.reduce((a, b) => a + b, 0) / g.roases.length,
      totalSpend: g.spends.reduce((a, b) => a + b, 0),
      count: g.roases.length,
    })).filter((c) => c.totalSpend >= 500);

    const best = conceptStats.sort((a, b) => b.avgRoas - a.avgRoas)[0];
    const worst = [...conceptStats].sort((a, b) => a.avgRoas - b.avgRoas)[0];
    const avgRoas = ads.reduce((s, a) => s + parseFloat(a.roas ?? 0), 0) / ads.length;

    return { best, worst, untagged, avgRoas, total: ads.length };
  }, [ads]);

  if (!insights) return null;

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
      <div className="p-3 rounded-lg border bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-800">
        <div className="flex items-center gap-1.5 mb-1">
          <Flame className="w-3.5 h-3.5 text-green-600" />
          <span className="text-xs font-medium text-green-700 dark:text-green-400">Winning concept</span>
        </div>
        {insights.best ? (
          <>
            <p className="text-sm font-semibold text-green-900 dark:text-green-200 line-clamp-1">{insights.best.concept}</p>
            <p className="text-xs text-green-700 dark:text-green-400 mt-0.5">ROAS {insights.best.avgRoas.toFixed(2)}x · {insights.best.count} ads</p>
          </>
        ) : (
          <p className="text-xs text-muted-foreground">Tag ads to see</p>
        )}
      </div>

      <div className="p-3 rounded-lg border bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800">
        <div className="flex items-center gap-1.5 mb-1">
          <TrendingDown className="w-3.5 h-3.5 text-red-600" />
          <span className="text-xs font-medium text-red-700 dark:text-red-400">Needs killing</span>
        </div>
        {insights.worst && insights.worst.avgRoas < 1.5 ? (
          <>
            <p className="text-sm font-semibold text-red-900 dark:text-red-200 line-clamp-1">{insights.worst.concept}</p>
            <p className="text-xs text-red-700 dark:text-red-400 mt-0.5">ROAS {insights.worst.avgRoas.toFixed(2)}x · stop budget</p>
          </>
        ) : (
          <p className="text-xs text-muted-foreground">No clear kill yet</p>
        )}
      </div>

      <div className="p-3 rounded-lg border bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800">
        <div className="flex items-center gap-1.5 mb-1">
          <Tag className="w-3.5 h-3.5 text-amber-600" />
          <span className="text-xs font-medium text-amber-700 dark:text-amber-400">Need tagging</span>
        </div>
        <p className="text-sm font-semibold text-amber-900 dark:text-amber-200">{insights.untagged} ads</p>
        <p className="text-xs text-amber-700 dark:text-amber-400 mt-0.5">of {insights.total} total</p>
      </div>

      <div className="p-3 rounded-lg border bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800">
        <div className="flex items-center gap-1.5 mb-1">
          <BarChart2 className="w-3.5 h-3.5 text-blue-600" />
          <span className="text-xs font-medium text-blue-700 dark:text-blue-400">Avg ROAS (all ads)</span>
        </div>
        <p className="text-sm font-semibold text-blue-900 dark:text-blue-200">{insights.avgRoas.toFixed(2)}x</p>
        <p className="text-xs text-blue-700 dark:text-blue-400 mt-0.5">account-wide avg</p>
      </div>
    </div>
  );
}

// ─── Your Ads tab ─────────────────────────────────────────────────────────────

function YourAdsTab() {
  const [sortBy, setSortBy] = useState<SortKey>("roas");
  const utils = trpc.useUtils();

  const { data: ads, isLoading } = trpc.analytics.getRankedAds.useQuery({ sortBy, limit: 300 });
  const { data: suggestions } = trpc.analytics.getTagSuggestions.useQuery();
  const updateTags = trpc.meta.updateTags.useMutation({
    onSuccess: () => {
      utils.analytics.getRankedAds.invalidate();
      utils.analytics.getTagSuggestions.invalidate();
    },
  });
  const autoTag = trpc.metaSync.runAutoTag.useMutation({
    onSuccess: (res) => {
      toast.success(`Auto-tagged ${res.tagged} ads`);
      utils.analytics.getRankedAds.invalidate();
      utils.analytics.getTagSuggestions.invalidate();
    },
    onError: () => toast.error("Auto-tag failed"),
  });

  const saveTag = (creativeId: string, field: "concept" | "hookType" | "persona" | "format") =>
    async (value: string) => {
      await updateTags.mutateAsync({ creativeId, [field]: value || null });
    };

  const SortBtn = ({ field, label }: { field: SortKey; label: string }) => {
    const active = sortBy === field;
    const Icon = active ? (field === "cpa" ? ArrowUp : ArrowDown) : ArrowUpDown;
    return (
      <Button variant={active ? "default" : "outline"} size="sm" onClick={() => setSortBy(field)} className="gap-1 text-xs h-7">
        <Icon className="w-3 h-3" />{label}
      </Button>
    );
  };

  return (
    <div className="space-y-4">
      <InsightPanel ads={ads ?? []} />

      <Card>
        <CardContent className="pt-3 pb-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-muted-foreground font-medium">Sort:</span>
            <SortBtn field="roas" label="ROAS" />
            <SortBtn field="cpa" label="CPA ↑" />
            <SortBtn field="spend" label="Spend" />
            <SortBtn field="impressions" label="Impressions" />
            <div className="ml-auto">
              <Button
                size="sm"
                variant="outline"
                className="gap-1.5 text-xs h-7"
                onClick={() => autoTag.mutate()}
                disabled={autoTag.isPending}
              >
                {autoTag.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Tag className="w-3 h-3" />}
                Auto-tag from captions
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle>Your ads (real)</CardTitle>
          <CardDescription>
            {ads ? `${ads.length} ads` : "–"} · Click Concept / Hook cell to tag · Enter to save
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : !ads || ads.length === 0 ? (
            <p className="text-center text-muted-foreground py-12">No ads synced yet — run a sync first</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b bg-muted/50">
                  <tr>
                    <th className="text-left py-3 px-3 font-medium text-muted-foreground w-8">#</th>
                    <th className="text-left py-3 px-3 font-medium text-muted-foreground" style={{ minWidth: 260 }}>Caption (primary text)</th>
                    <th className="text-left py-3 px-3 font-medium text-muted-foreground" style={{ minWidth: 140 }}>Concept</th>
                    <th className="text-left py-3 px-3 font-medium text-muted-foreground" style={{ minWidth: 130 }}>Hook</th>
                    <th className="text-right py-3 px-3 font-medium text-muted-foreground">Spend</th>
                    <th className="text-right py-3 px-3 font-medium text-muted-foreground">ROAS</th>
                    <th className="text-right py-3 px-3 font-medium text-muted-foreground">CPA</th>
                    <th className="text-center py-3 px-3 font-medium text-muted-foreground">Decision</th>
                  </tr>
                </thead>
                <tbody>
                  {ads.map((ad: any, idx: number) => {
                    const roas = parseFloat(ad.roas ?? 0);
                    const spend = parseFloat(ad.spend ?? 0);
                    const roasColor =
                      roas >= 3 ? "text-green-600 font-bold" :
                      roas < 1.5 ? "text-red-500" :
                      "text-amber-600";
                    const creativeId = `${ad.adId}_creative`;
                    const caption = ad.caption && ad.caption !== ad.adName ? ad.caption : null;

                    return (
                      <tr key={ad.adId} className="border-b last:border-0 hover:bg-muted/20 transition-colors align-middle">
                        <td className="py-2.5 px-3 text-muted-foreground text-xs">{idx + 1}</td>

                        <td className="py-2.5 px-3">
                          <div className="flex items-start gap-2.5">
                            {ad.thumbnailUrl ? (
                              <img
                                src={ad.thumbnailUrl}
                                alt=""
                                className="w-10 h-10 rounded object-cover shrink-0 border"
                                onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                              />
                            ) : (
                              <div className="w-10 h-10 rounded bg-muted flex items-center justify-center shrink-0 border text-muted-foreground/50 text-xs font-bold">
                                {(ad.adName ?? "A").charAt(0).toUpperCase()}
                              </div>
                            )}
                            <div className="min-w-0">
                              {caption ? (
                                <>
                                  <p className="text-xs leading-snug line-clamp-2 text-foreground">{caption}</p>
                                  <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{ad.adName}</p>
                                </>
                              ) : (
                                <p className="text-xs font-medium leading-snug line-clamp-2">{ad.adName}</p>
                              )}
                            </div>
                          </div>
                        </td>

                        <td className="py-2.5 px-3">
                          <TagCell
                            value={ad.concept}
                            placeholder="Concept"
                            suggestions={suggestions?.concepts ?? []}
                            onSave={saveTag(creativeId, "concept")}
                          />
                        </td>

                        <td className="py-2.5 px-3">
                          <TagCell
                            value={ad.hookType}
                            placeholder="Hook"
                            suggestions={suggestions?.hooks ?? []}
                            onSave={saveTag(creativeId, "hookType")}
                          />
                        </td>

                        <td className="py-2.5 px-3 text-right tabular-nums text-xs">
                          ฿{spend.toLocaleString("th-TH", { maximumFractionDigits: 0 })}
                        </td>

                        <td className={`py-2.5 px-3 text-right tabular-nums text-xs ${roasColor}`}>
                          {fmt(ad.roas)}x
                        </td>

                        <td className="py-2.5 px-3 text-right tabular-nums text-xs text-muted-foreground">
                          {parseFloat(ad.cpa ?? 0) > 0 ? `฿${fmt(ad.cpa, 0)}` : "–"}
                        </td>

                        <td className="py-2.5 px-3 text-center">
                          <DecisionBadge roas={roas} spend={spend} />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Rankings tab ─────────────────────────────────────────────────────────────

function RankingsTab() {
  const [sortBy, setSortBy] = useState<SortKey>("roas");
  const utils = trpc.useUtils();

  const { data: ads, isLoading } = trpc.analytics.getRankedAds.useQuery({ sortBy, limit: 200 });
  const { data: suggestions } = trpc.analytics.getTagSuggestions.useQuery();
  const updateTags = trpc.meta.updateTags.useMutation({
    onSuccess: () => {
      utils.analytics.getRankedAds.invalidate();
      utils.analytics.getTagSuggestions.invalidate();
    },
  });

  const saveTag = (creativeId: string, field: "concept" | "hookType" | "persona" | "format") =>
    async (value: string) => {
      await updateTags.mutateAsync({ creativeId, [field]: value || null });
    };

  const SortBtn = ({ field, label }: { field: SortKey; label: string }) => {
    const active = sortBy === field;
    const Icon = active ? (field === "cpa" ? ArrowUp : ArrowDown) : ArrowUpDown;
    return (
      <Button variant={active ? "default" : "outline"} size="sm" onClick={() => setSortBy(field)} className="gap-1 text-xs h-8">
        <Icon className="w-3 h-3" />{label}
      </Button>
    );
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="pt-4 pb-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm text-muted-foreground font-medium">Sort by:</span>
            <SortBtn field="roas" label="ROAS" />
            <SortBtn field="cpa" label="CPA (low→high)" />
            <SortBtn field="spend" label="Spend" />
            <SortBtn field="impressions" label="Impressions" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle>Ad Performance Ranking</CardTitle>
          <CardDescription>
            {ads ? `${ads.length} ads` : "–"} · Click any tag cell to edit · Press Enter or pick suggestion to save
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : !ads || ads.length === 0 ? (
            <p className="text-center text-muted-foreground py-12">No ads synced yet</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b bg-muted/50">
                  <tr>
                    <th className="text-left py-3 px-3 font-medium text-muted-foreground w-8">#</th>
                    <th className="text-left py-3 px-3 font-medium text-muted-foreground min-w-[200px]">Ad Name</th>
                    <th className="text-left py-3 px-3 font-medium text-muted-foreground">Concept</th>
                    <th className="text-left py-3 px-3 font-medium text-muted-foreground">Hook</th>
                    <th className="text-left py-3 px-3 font-medium text-muted-foreground">Persona</th>
                    <th className="text-right py-3 px-3 font-medium text-muted-foreground">Spend</th>
                    <th className="text-right py-3 px-3 font-medium text-muted-foreground">ROAS</th>
                    <th className="text-right py-3 px-3 font-medium text-muted-foreground">CPA</th>
                    <th className="text-right py-3 px-3 font-medium text-muted-foreground">Impr.</th>
                    <th className="text-center py-3 px-3 font-medium text-muted-foreground">Decision</th>
                  </tr>
                </thead>
                <tbody>
                  {ads.map((ad: any, idx: number) => {
                    const roas = parseFloat(ad.roas ?? 0);
                    const spend = parseFloat(ad.spend ?? 0);
                    const roasColor =
                      roas >= 3 ? "text-green-600 font-bold" :
                      roas < 1.5 ? "text-red-500" :
                      "text-amber-600";
                    const creativeId = `${ad.adId}_creative`;

                    return (
                      <tr key={ad.adId} className="border-b last:border-0 hover:bg-muted/20 transition-colors align-middle">
                        <td className="py-2.5 px-3 text-muted-foreground text-xs">{idx + 1}</td>

                        <td className="py-2.5 px-3 max-w-[220px]">
                          <p className="font-medium text-xs line-clamp-2 leading-snug">{ad.adName}</p>
                        </td>

                        <td className="py-2.5 px-3">
                          <TagCell
                            value={ad.concept}
                            placeholder="Concept"
                            suggestions={suggestions?.concepts ?? []}
                            onSave={saveTag(creativeId, "concept")}
                          />
                        </td>

                        <td className="py-2.5 px-3">
                          <TagCell
                            value={ad.hookType}
                            placeholder="Hook"
                            suggestions={suggestions?.hooks ?? []}
                            onSave={saveTag(creativeId, "hookType")}
                          />
                        </td>

                        <td className="py-2.5 px-3">
                          <TagCell
                            value={ad.persona}
                            placeholder="Persona"
                            suggestions={suggestions?.personas ?? []}
                            onSave={saveTag(creativeId, "persona")}
                          />
                        </td>

                        <td className="py-2.5 px-3 text-right tabular-nums text-xs">
                          ฿{spend.toLocaleString("th-TH", { maximumFractionDigits: 0 })}
                        </td>

                        <td className={`py-2.5 px-3 text-right tabular-nums text-xs ${roasColor}`}>
                          {fmt(ad.roas)}x
                        </td>

                        <td className="py-2.5 px-3 text-right tabular-nums text-xs text-muted-foreground">
                          {parseFloat(ad.cpa ?? 0) > 0 ? `฿${fmt(ad.cpa, 0)}` : "–"}
                        </td>

                        <td className="py-2.5 px-3 text-right tabular-nums text-xs text-muted-foreground">
                          {Number(ad.impressions ?? 0).toLocaleString()}
                        </td>

                        <td className="py-2.5 px-3 text-center">
                          <DecisionBadge roas={roas} spend={spend} />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Group chart + breakdown ──────────────────────────────────────────────────

function GroupChart({ data, nameKey, color1, color2 }: {
  data: any[]; nameKey: string; color1: string; color2: string;
}) {
  if (!data || data.length === 0) {
    return <p className="text-center text-muted-foreground py-8 text-sm">Tag your ads in the Rankings tab first</p>;
  }
  const rows = data.map((r: any) => ({
    name: r[nameKey] ?? "–",
    ROAS: parseFloat(fmt(r.avgRoas)),
    "CPA (฿)": parseFloat(fmt(r.avgCpa, 0)),
  }));
  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={rows} margin={{ bottom: 50 }}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="name" angle={-30} textAnchor="end" height={70} tick={{ fontSize: 11 }} />
        <YAxis yAxisId="left" />
        <YAxis yAxisId="right" orientation="right" />
        <Tooltip />
        <Legend />
        <Bar yAxisId="left" dataKey="ROAS" fill={color1} />
        <Bar yAxisId="right" dataKey="CPA (฿)" fill={color2} />
      </BarChart>
    </ResponsiveContainer>
  );
}

function GroupBreakdown({ data, nameKey }: { data: any[]; nameKey: string }) {
  if (!data || data.length === 0) return null;
  return (
    <div className="space-y-2 mt-4">
      {data.map((row: any) => {
        const roas = parseFloat(row.avgRoas ?? 0);
        const roasColor = roas >= 3 ? "text-green-600 font-bold" : roas < 1.5 ? "text-red-500" : "text-amber-600";
        return (
          <div key={row[nameKey]} className="flex items-center justify-between p-3 bg-accent/50 rounded-lg text-sm">
            <div className="flex items-center gap-2">
              <span className="font-medium">{row[nameKey]}</span>
              <Badge variant="outline" className="text-xs">{Number(row.adsCount)} ads</Badge>
            </div>
            <div className="flex gap-6 text-right">
              <div><p className="text-muted-foreground text-xs">ROAS</p><p className={`font-bold ${roasColor}`}>{fmt(row.avgRoas)}</p></div>
              <div><p className="text-muted-foreground text-xs">CPA</p><p className="font-bold">฿{fmt(row.avgCpa, 0)}</p></div>
              <div><p className="text-muted-foreground text-xs">Spend</p><p className="font-bold">฿{Number(row.totalSpend).toLocaleString("th-TH", { maximumFractionDigits: 0 })}</p></div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function Analytics() {
  const { data: conceptData,  isLoading: l1 } = trpc.analytics.getConceptAnalytics.useQuery();
  const { data: hookData,     isLoading: l2 } = trpc.analytics.getHookAnalytics.useQuery();
  const { data: formatData,   isLoading: l3 } = trpc.analytics.getFormatAnalytics.useQuery();
  const { data: personaData,  isLoading: l4 } = trpc.analytics.getPersonaAnalytics.useQuery();

  const Loading = () => <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin" /></div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Analytics</h1>
        <p className="text-muted-foreground text-sm mt-1">Tag ads directly in the Rankings table — charts update automatically</p>
      </div>

      <Tabs defaultValue="your-ads" className="w-full">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="your-ads">Your Ads</TabsTrigger>
          <TabsTrigger value="rankings">Rankings</TabsTrigger>
          <TabsTrigger value="concepts">Concepts</TabsTrigger>
          <TabsTrigger value="hooks">Hooks</TabsTrigger>
          <TabsTrigger value="formats">Formats</TabsTrigger>
          <TabsTrigger value="personas">Personas</TabsTrigger>
        </TabsList>

        <TabsContent value="your-ads" className="mt-4"><YourAdsTab /></TabsContent>
        <TabsContent value="rankings" className="mt-4"><RankingsTab /></TabsContent>

        <TabsContent value="concepts" className="mt-4">
          <Card><CardHeader><CardTitle>By Concept</CardTitle><CardDescription>Avg ROAS and CPA per concept</CardDescription></CardHeader>
            <CardContent>{l1 ? <Loading /> : <><GroupChart data={conceptData ?? []} nameKey="concept" color1="#10b981" color2="#f59e0b" /><GroupBreakdown data={conceptData ?? []} nameKey="concept" /></>}</CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="hooks" className="mt-4">
          <Card><CardHeader><CardTitle>By Hook</CardTitle><CardDescription>Avg ROAS and CPA per hook style</CardDescription></CardHeader>
            <CardContent>{l2 ? <Loading /> : <><GroupChart data={hookData ?? []} nameKey="hookType" color1="#8b5cf6" color2="#ec4899" /><GroupBreakdown data={hookData ?? []} nameKey="hookType" /></>}</CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="formats" className="mt-4">
          <Card><CardHeader><CardTitle>By Format</CardTitle><CardDescription>UGC vs Static vs other formats</CardDescription></CardHeader>
            <CardContent>{l3 ? <Loading /> : <><GroupChart data={formatData ?? []} nameKey="format" color1="#06b6d4" color2="#f97316" /><GroupBreakdown data={formatData ?? []} nameKey="format" /></>}</CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="personas" className="mt-4">
          <Card><CardHeader><CardTitle>By Persona</CardTitle><CardDescription>Avg ROAS and CPA per target persona</CardDescription></CardHeader>
            <CardContent>{l4 ? <Loading /> : <><GroupChart data={personaData ?? []} nameKey="persona" color1="#3b82f6" color2="#ef4444" /><GroupBreakdown data={personaData ?? []} nameKey="persona" /></>}</CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
