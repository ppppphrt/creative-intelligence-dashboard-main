import { useState, useRef, useEffect, useMemo, Fragment } from "react";
import { trpc } from "@/lib/trpc";
import BrandFilterBar from "@/components/BrandFilterBar";
import { useBrandFilter } from "@/hooks/useBrandFilter";
import DateFilterBar from "@/components/DateFilterBar";
import { useDateFilter } from "@/hooks/useDateFilter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, ArrowUpDown, ArrowUp, ArrowDown, TrendingUp, TrendingDown, Minus, Check, X, Flame, AlertTriangle, Tag, BarChart2, Lightbulb, ChevronDown, ChevronUp, Wrench, CheckCircle2, MessageSquarePlus } from "lucide-react";
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

// ─── Per-ad insight engine ────────────────────────────────────────────────────

type AdInsight = {
  type: "SCALE" | "ITERATE" | "KILL" | "TESTING";
  summary: string;
  reasons: string[];
  fixes: string[];
};

function generateAdInsight(ad: any): AdInsight {
  const roas    = parseFloat(ad.roas ?? 0);
  const spend   = parseFloat(ad.spend ?? 0);
  const cpa     = parseFloat(ad.cpa ?? 0);
  const impr    = parseInt(ad.impressions ?? 0);
  const hasThumbnail = Boolean(ad.thumbnailUrl);
  const hasCaption   = Boolean(ad.caption && ad.caption !== ad.adName);
  const hasConcept   = Boolean(ad.concept);
  const hasHook      = Boolean(ad.hookType);

  if (spend < 500) {
    return {
      type: "TESTING",
      summary: "Not enough spend to make a confident decision yet.",
      reasons: [
        `฿${spend.toLocaleString("th-TH", { maximumFractionDigits: 0 })} spent — needs ฿500+ before the signal becomes reliable`,
        impr > 0 ? `${impr.toLocaleString()} impressions so far — still in the learning phase` : "Very low impressions — check if ad delivery is active",
        !hasThumbnail ? "No thumbnail detected — this may be limiting ad delivery" : "",
      ].filter(Boolean),
      fixes: [],
    };
  }

  if (roas >= 3) {
    return {
      type: "SCALE",
      summary: `Genuine winner — ${roas.toFixed(2)}x ROAS with ฿${spend.toLocaleString("th-TH", { maximumFractionDigits: 0 })} in confirmed spend. Increase budget on this EntityID.`,
      reasons: [
        `${roas.toFixed(2)}x ROAS signals the concept is resonating strongly with your target audience`,
        hasThumbnail ? "Thumbnail creative is likely driving above-average click-through rate" : "No thumbnail — adding a strong visual could push ROAS even higher",
        hasCaption ? "Primary text copy is reinforcing the hook and driving conversions" : "No primary text detected — adding copy could improve conversion rate further",
        hasHook ? `The "${ad.hookType}" hook angle is working — replicate it across other formats and personas` : "Hook not tagged — identify what's working in the copy so you can replicate it",
        cpa > 0 ? `฿${cpa.toFixed(0)} CPA is strong — protect this ad from budget competition` : "",
      ].filter(Boolean),
      fixes: [],
    };
  }

  if (roas >= 1.5) {
    return {
      type: "ITERATE",
      summary: `The concept shows signal at ${roas.toFixed(2)}x ROAS but something in the execution isn't fully converting. Don't kill it — iterate.`,
      reasons: [
        `${roas.toFixed(2)}x ROAS is above breakeven but below scale threshold — partial product-audience fit`,
        hasHook ? `"${ad.hookType}" hook may not be the strongest angle for this concept` : "No hook tagged — the entry point of the ad may be the weak link",
        hasThumbnail ? "Creative exists but may not be creating enough scroll-stop" : "No thumbnail — weak visual is likely capping CTR",
        cpa > 0 ? `฿${cpa.toFixed(0)} CPA — identify what's blocking the final conversion step` : "",
      ].filter(Boolean),
      fixes: [
        "Keep the concept, swap to a completely different hook to earn a new EntityID in Andromeda",
        hasThumbnail ? "A/B test the thumbnail — try UGC or a before/after transformation visual" : "Add a strong video or image creative — this is the #1 lever for CTR",
        !hasCaption ? "Write a primary text that leads with the customer's pain point, not the product" : "Rewrite line 1 of the caption to be more curiosity-driven or emotionally direct",
        "Test the same concept against a different target persona — the message may fit a different audience better",
      ],
    };
  }

  // KILL
  return {
    type: "KILL",
    summary: `This ad is destroying budget — ${roas.toFixed(2)}x ROAS after ฿${spend.toLocaleString("th-TH", { maximumFractionDigits: 0 })} spend. The EntityID signal is clear: stop and rebuild from scratch.`,
    reasons: [
      `${roas.toFixed(2)}x ROAS after ฿${spend.toLocaleString("th-TH", { maximumFractionDigits: 0 })} spend — well past the point of statistical confidence`,
      impr >= 5000 ? `${impr.toLocaleString()} people saw this ad and didn't convert — the concept isn't resonating` : "Meta's algorithm may have already deprioritized this ad due to poor early signals",
      !hasThumbnail ? "No thumbnail — text-only ads rarely perform on Meta's visual feed" : "The visual creative isn't stopping the scroll — audience ignored it",
      !hasCaption ? "No primary text — there is no message landing with the audience" : "Primary text copy is not matching what the audience needs to hear",
    ].filter(Boolean),
    fixes: [
      "Stop budget immediately — every baht spent here is negative ROI",
      hasConcept ? `Retire the "${ad.concept}" + "${ad.hookType ?? "this hook"}" EntityID — it has no signal` : "Tag this ad first to understand exactly what failed before rebuilding",
      "Create a genuinely new EntityID: change BOTH the concept angle AND the hook type",
      !hasThumbnail ? "Any replacement must lead with a strong visual — product in use, transformation, or UGC" : "Replace thumbnail with something that creates immediate emotion or curiosity in 0.5 seconds",
      !hasCaption ? "Write primary text that leads with the #1 customer pain point — not a product feature" : "Rewrite caption entirely — lead with social proof ('1,200+ customers') or a bold promise",
      "Reallocate this budget to your SCALE ads immediately",
    ],
  };
}

function AdInsightRow({ ad, colSpan }: { ad: any; colSpan: number }) {
  const insight = useMemo(() => generateAdInsight(ad), [ad]);
  const [notes, setNotes] = useState<string>(ad.notes ?? "");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const utils = trpc.useUtils();
  const updateTags = trpc.meta.updateTags.useMutation({
    onSuccess: () => {
      utils.analytics.getRankedAds.invalidate();
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    },
  });

  const saveNotes = async () => {
    if (notes === (ad.notes ?? "")) return;
    setSaving(true);
    try {
      await updateTags.mutateAsync({ creativeId: `${ad.adId}_creative`, notes: notes || null });
    } catch {
      toast.error("Failed to save note");
    } finally {
      setSaving(false);
    }
  };

  const bg = insight.type === "SCALE"   ? "bg-green-50 border-green-200 dark:bg-green-950/20 dark:border-green-800"
           : insight.type === "KILL"    ? "bg-red-50 border-red-200 dark:bg-red-950/20 dark:border-red-800"
           : insight.type === "ITERATE" ? "bg-amber-50 border-amber-200 dark:bg-amber-950/20 dark:border-amber-800"
           : "bg-muted/30 border-border";

  const iconColor = insight.type === "SCALE"   ? "text-green-600"
                  : insight.type === "KILL"    ? "text-red-500"
                  : insight.type === "ITERATE" ? "text-amber-600"
                  : "text-muted-foreground";

  return (
    <tr>
      <td colSpan={colSpan} className="px-3 pb-3 pt-0">
        <div className="space-y-3">
          {/* AI insight */}
          <div className={`rounded-xl border p-4 space-y-3 ${bg}`}>
            <div className="flex items-start gap-2.5">
              <Lightbulb className={`w-4 h-4 mt-0.5 shrink-0 ${iconColor}`} />
              <p className="text-sm font-medium leading-snug">{insight.summary}</p>
            </div>

            {insight.reasons.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">
                  {insight.type === "SCALE" ? "Why it's winning" : insight.type === "KILL" ? "Why it's failing" : "What we see"}
                </p>
                <ul className="space-y-1">
                  {insight.reasons.map((r, i) => (
                    <li key={i} className="flex items-start gap-2 text-xs text-foreground/80">
                      <CheckCircle2 className={`w-3 h-3 mt-0.5 shrink-0 ${iconColor}`} />
                      {r}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {insight.fixes.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5 flex items-center gap-1">
                  <Wrench className="w-3 h-3" />
                  {insight.type === "KILL" ? "How to fix it" : "Suggestions"}
                </p>
                <ul className="space-y-1">
                  {insight.fixes.map((f, i) => (
                    <li key={i} className="flex items-start gap-2 text-xs text-foreground/80">
                      <span className={`mt-0.5 shrink-0 font-bold text-[10px] w-3.5 h-3.5 rounded-full flex items-center justify-center ${insight.type === "KILL" ? "bg-red-200 text-red-800 dark:bg-red-800 dark:text-red-200" : "bg-amber-200 text-amber-800 dark:bg-amber-800 dark:text-amber-200"}`}>
                        {i + 1}
                      </span>
                      {f}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* Human notes */}
          <div className="rounded-xl border border-border bg-card p-4 space-y-2">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
              <MessageSquarePlus className="w-3.5 h-3.5" />
              Your perspective
            </p>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              onBlur={saveNotes}
              placeholder="Add your own notes, observations, or next steps for this ad…"
              rows={3}
              className="w-full text-sm bg-muted/40 rounded-lg border border-border px-3 py-2.5 resize-none focus:outline-none focus:ring-2 focus:ring-ring placeholder:text-muted-foreground/50 leading-relaxed"
            />
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground">Saves automatically when you click away</p>
              <div className="flex items-center gap-2">
                {saved && <span className="text-xs text-green-600 flex items-center gap-1"><Check className="w-3 h-3" />Saved</span>}
                <button
                  onClick={saveNotes}
                  disabled={saving || notes === (ad.notes ?? "")}
                  className="text-xs px-3 py-1 rounded-lg bg-primary text-primary-foreground disabled:opacity-40 hover:opacity-90 transition-opacity flex items-center gap-1.5"
                >
                  {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : null}
                  Save note
                </button>
              </div>
            </div>
          </div>
        </div>
      </td>
    </tr>
  );
}

// ─── Summary insight panel (computed from live data) ──────────────────────────

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
  const [expandedInsight, setExpandedInsight] = useState<string | null>(null);
  const { accountSuffix } = useBrandFilter();
  const { dateFrom, dateTo } = useDateFilter();
  const utils = trpc.useUtils();

  const { data: ads, isLoading } = trpc.analytics.getRankedAds.useQuery({ sortBy, limit: 300, accountSuffix, dateFrom, dateTo });
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
                    <th className="text-center py-3 px-3 font-medium text-muted-foreground w-16">Insight</th>
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
                    const isExpanded = expandedInsight === ad.adId;
                    const insightType = spend < 500 ? "TESTING" : roas >= 3 ? "SCALE" : roas >= 1.5 ? "ITERATE" : "KILL";
                    const insightIconColor = insightType === "SCALE" ? "text-green-600" : insightType === "KILL" ? "text-red-500" : insightType === "ITERATE" ? "text-amber-500" : "text-muted-foreground";

                    return (
                      <Fragment key={ad.adId}>
                        <tr className={`border-b transition-colors align-middle ${isExpanded ? "bg-muted/30" : "hover:bg-muted/20"} ${isExpanded ? "" : "last:border-0"}`}>
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

                          <td className="py-2.5 px-3 text-center">
                            <button
                              onClick={() => setExpandedInsight(isExpanded ? null : ad.adId)}
                              className={`inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium transition-colors hover:bg-muted ${isExpanded ? "bg-muted" : ""}`}
                              title="View AI insight"
                            >
                              <Lightbulb className={`w-3.5 h-3.5 ${insightIconColor}`} />
                              {isExpanded ? <ChevronUp className="w-3 h-3 text-muted-foreground" /> : <ChevronDown className="w-3 h-3 text-muted-foreground" />}
                            </button>
                          </td>
                        </tr>
                        {isExpanded && <AdInsightRow ad={ad} colSpan={9} />}
                      </Fragment>
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
  const { accountSuffix } = useBrandFilter();
  const { dateFrom, dateTo } = useDateFilter();
  const utils = trpc.useUtils();

  const { data: ads, isLoading } = trpc.analytics.getRankedAds.useQuery({ sortBy, limit: 200, accountSuffix, dateFrom, dateTo });
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
  const { accountSuffix } = useBrandFilter();
  const { dateFrom, dateTo } = useDateFilter();

  const { data: conceptData,  isLoading: l1 } = trpc.analytics.getConceptAnalytics.useQuery({ accountSuffix, dateFrom, dateTo });
  const { data: hookData,     isLoading: l2 } = trpc.analytics.getHookAnalytics.useQuery({ accountSuffix, dateFrom, dateTo });
  const { data: formatData,   isLoading: l3 } = trpc.analytics.getFormatAnalytics.useQuery({ accountSuffix, dateFrom, dateTo });
  const { data: personaData,  isLoading: l4 } = trpc.analytics.getPersonaAnalytics.useQuery({ accountSuffix, dateFrom, dateTo });

  const Loading = () => <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin" /></div>;

  return (
    <div className="space-y-10">
      <div className="flex flex-wrap gap-3">
        <DateFilterBar />
        <div className="w-px bg-border hidden sm:block" />
        <BrandFilterBar />
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
