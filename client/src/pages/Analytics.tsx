import { useState, useRef, useEffect, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import BrandFilterBar from "@/components/BrandFilterBar";
import { useBrandFilter } from "@/hooks/useBrandFilter";
import DateFilterBar from "@/components/DateFilterBar";
import { useDateFilter } from "@/hooks/useDateFilter";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Loader2, Check, X, TrendingUp, TrendingDown, Minus, Flame,
  Tag, BarChart2, Lightbulb, Wrench, MessageSquarePlus,
  ArrowUpDown, ArrowUp, ArrowDown, CheckCircle2,
} from "lucide-react";
import { toast } from "sonner";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from "recharts";

// ─── helpers ──────────────────────────────────────────────────────────────────

function fmt(n: any, decimals = 2) {
  return parseFloat(n ?? 0).toFixed(decimals);
}

function thb(n: any) {
  return `฿${parseFloat(n ?? 0).toLocaleString("th-TH", { maximumFractionDigits: 0 })}`;
}

type SortKey = "roas" | "cpa" | "spend" | "purchases";
type FilterKey = "all" | "SCALE" | "ITERATE" | "KILL" | "TESTING";

function decisionType(roas: number, spend: number): "SCALE" | "ITERATE" | "KILL" | "TESTING" {
  if (spend < 500) return "TESTING";
  if (roas >= 3) return "SCALE";
  if (roas < 1.5) return "KILL";
  return "ITERATE";
}

// ─── Thumbnail with lazy refresh for expired Meta CDN URLs ───────────────────

function isCdnUrl(u: string | null | undefined): boolean {
  if (!u) return false;
  return !u.includes("facebook.com") && !u.includes("fb.com");
}

function AdThumbnail({
  adId, initialUrl, creativeUrl, size = "md",
}: {
  adId: string; initialUrl: string | null; creativeUrl?: string | null; size?: "sm" | "md" | "lg";
}) {
  const resolvedInitial = initialUrl ?? (isCdnUrl(creativeUrl) ? creativeUrl! : null);
  const [url, setUrl] = useState<string | null>(resolvedInitial);
  const [retried, setRetried] = useState(false);
  const refresh = trpc.analytics.refreshCreativeThumbnail.useMutation();

  const handleError = async () => {
    if (retried || refresh.isPending) return;
    setRetried(true);
    try {
      const result = await refresh.mutateAsync({ adId });
      const fresh = result?.thumbnailUrl ?? (isCdnUrl(result?.creativeUrl) ? result?.creativeUrl : null) ?? null;
      setUrl(fresh);
    } catch { setUrl(null); }
  };

  const dim = size === "lg" ? "w-24 h-24" : size === "sm" ? "w-10 h-10" : "w-16 h-16";
  const text = size === "lg" ? "text-base" : "text-xs";

  const inner = url ? (
    <img src={url} alt="" className={`${dim} rounded-xl object-cover shrink-0 border border-gray-100`} onError={handleError} />
  ) : refresh.isPending ? (
    <div className={`${dim} rounded-xl bg-gray-100 flex items-center justify-center shrink-0 border border-gray-100`}>
      <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
    </div>
  ) : (
    <div className={`${dim} rounded-xl bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center shrink-0 border border-gray-100 text-gray-400 font-bold ${text}`}>
      {(adId ?? "AD").slice(-2).toUpperCase()}
    </div>
  );

  if (creativeUrl) {
    return (
      <a href={creativeUrl} target="_blank" rel="noopener noreferrer" className="shrink-0 hover:opacity-80 transition-opacity">
        {inner}
      </a>
    );
  }
  return <span className="shrink-0">{inner}</span>;
}

// ─── Status badge ─────────────────────────────────────────────────────────────

const STATUS_CONFIG = {
  SCALE:   { label: "Scale",   border: "border-l-emerald-500", dot: "bg-emerald-500",  pill: "bg-emerald-50 text-emerald-700 border-emerald-200",  icon: TrendingUp },
  ITERATE: { label: "Iterate", border: "border-l-amber-400",   dot: "bg-amber-400",    pill: "bg-amber-50 text-amber-700 border-amber-200",        icon: Minus },
  KILL:    { label: "Kill",    border: "border-l-red-500",     dot: "bg-red-500",      pill: "bg-red-50 text-red-700 border-red-200",              icon: TrendingDown },
  TESTING: { label: "Watch",   border: "border-l-slate-300",   dot: "bg-slate-400",    pill: "bg-slate-50 text-slate-600 border-slate-200",        icon: BarChart2 },
};

function StatusPill({ type }: { type: keyof typeof STATUS_CONFIG }) {
  const cfg = STATUS_CONFIG[type];
  const Icon = cfg.icon;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold border ${cfg.pill}`}>
      <Icon className="w-3 h-3" />
      {cfg.label}
    </span>
  );
}

// ─── Metric chip ─────────────────────────────────────────────────────────────

function MetricChip({ label, value, highlight }: { label: string; value: string; highlight?: "green" | "red" | "amber" }) {
  const color = highlight === "green" ? "text-emerald-700 bg-emerald-50 border-emerald-200"
              : highlight === "red"   ? "text-red-700 bg-red-50 border-red-200"
              : highlight === "amber" ? "text-amber-700 bg-amber-50 border-amber-200"
              : "text-gray-600 bg-gray-50 border-gray-200";
  return (
    <span className={`inline-flex flex-col items-center px-2.5 py-1 rounded-lg border text-xs font-medium ${color}`}>
      <span className="text-[10px] font-normal opacity-60 uppercase tracking-wide leading-none mb-0.5">{label}</span>
      <span className="font-semibold">{value}</span>
    </span>
  );
}

// ─── Tag pill (click to edit, with suggestions) ───────────────────────────────

const QUICK_CONCEPTS = ["Discount", "Pain Point", "Before/After", "Testimonial", "Urgency", "Product Demo", "Social Proof", "Fear", "Results"];
const QUICK_HOOKS    = ["Question", "Bold Claim", "Story", "Statistic", "Curiosity", "Challenge", "How-To", "Warning"];

function TagPill({
  value, placeholder, suggestions, onSave, color = "blue",
}: {
  value: string | null; placeholder: string; suggestions: string[];
  onSave: (v: string) => Promise<void>; color?: "blue" | "purple";
}) {
  const [editing, setEditing] = useState(false);
  const [input, setInput] = useState(value ?? "");
  const [saving, setSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { if (editing) inputRef.current?.focus(); }, [editing]);

  const base = color === "blue" ? QUICK_CONCEPTS : QUICK_HOOKS;
  const seen = new Set<string>();
  const allSuggestions = [...base, ...suggestions].filter((s) => { if (seen.has(s)) return false; seen.add(s); return true; });
  const filtered = allSuggestions.filter(
    (s) => s && s.toLowerCase().includes(input.toLowerCase()) && s !== input
  ).slice(0, 8);

  const commit = async (val: string) => {
    setSaving(true);
    try {
      await onSave(val.trim());
      setInput(val.trim());
      setEditing(false);
    } catch { toast.error("Failed to save tag"); }
    finally { setSaving(false); }
  };

  const pillColor = color === "blue"
    ? "bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100"
    : "bg-purple-50 text-purple-700 border-purple-200 hover:bg-purple-100";

  if (!editing) {
    return (
      <button onClick={() => { setInput(value ?? ""); setEditing(true); }} className="shrink-0">
        {value ? (
          <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium border cursor-pointer transition-colors ${pillColor}`}>
            {value}
            <X className="w-2.5 h-2.5 opacity-50 hover:opacity-100" />
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium border border-dashed border-gray-300 text-gray-400 hover:border-gray-400 hover:text-gray-600 cursor-pointer transition-colors">
            + {placeholder}
          </span>
        )}
      </button>
    );
  }

  return (
    <div className="relative shrink-0">
      <div className="flex items-center gap-1">
        <Input
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") commit(input);
            if (e.key === "Escape") setEditing(false);
          }}
          className="h-7 text-xs px-2 w-32"
          placeholder={placeholder}
        />
        <button onClick={() => commit(input)} className="text-emerald-600 hover:text-emerald-700">
          {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
        </button>
        <button onClick={() => setEditing(false)} className="text-gray-400 hover:text-gray-600">
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
      {filtered.length > 0 && (
        <div className="absolute top-full left-0 z-50 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg w-max min-w-[160px] max-h-48 overflow-auto py-1">
          {filtered.map((s) => (
            <button
              key={s}
              onMouseDown={(e) => { e.preventDefault(); commit(s); }}
              className="w-full text-left text-xs px-3 py-2 hover:bg-gray-50 transition-colors block"
            >
              {s}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Plain-language insight generator ────────────────────────────────────────

type AdInsight = {
  type: "SCALE" | "ITERATE" | "KILL" | "TESTING";
  oneLiner: string;
  action: string;
  reasons: string[];
  fixes: string[];
};

function generateAdInsight(ad: any): AdInsight {
  const roas  = parseFloat(ad.roas ?? 0);
  const spend = parseFloat(ad.spend ?? 0);
  const cpa   = parseFloat(ad.cpa ?? 0);
  const impr  = parseInt(ad.impressions ?? 0);
  const hasCaption = Boolean(ad.caption && ad.caption !== ad.adName);
  const hasConcept = Boolean(ad.concept);
  const hasHook    = Boolean(ad.hookType);
  const concept    = ad.concept ?? "this concept";
  const hook       = ad.hookType ?? "this hook";

  if (spend < 500) {
    return {
      type: "TESTING",
      oneLiner: "Still collecting data — check back after more spend.",
      action: `Only ${thb(spend)} spent so far. Wait until ฿500+ before making a budget decision.`,
      reasons: [
        `${thb(spend)} spent — needs ฿500+ before the signal is reliable`,
        impr > 0 ? `${impr.toLocaleString()} impressions so far` : "Very few impressions — check ad delivery",
      ].filter(Boolean),
      fixes: [],
    };
  }

  if (roas >= 3) {
    return {
      type: "SCALE",
      oneLiner: hasHook
        ? `The "${hook}" hook with "${concept}" is working. Make 3 more like this.`
        : `This ad is a genuine winner at ${roas.toFixed(1)}x ROAS. Push more budget here.`,
      action: "Increase this ad's budget. Duplicate the concept and hook into new formats.",
      reasons: [
        `${roas.toFixed(1)}x ROAS — every ฿1 spent returns ฿${roas.toFixed(1)}`,
        cpa > 0 ? `${thb(cpa)} cost per order — this is profitable` : "",
        hasCaption ? "The ad copy is resonating with buyers" : "",
        hasHook ? `"${hook}" hook is performing — replicate it` : "Tag the hook so you can replicate what's working",
      ].filter(Boolean),
      fixes: [],
    };
  }

  if (roas >= 1.5) {
    return {
      type: "ITERATE",
      oneLiner: `There's signal here at ${roas.toFixed(1)}x ROAS, but the execution isn't quite right yet. Don't kill — improve.`,
      action: "Keep the concept, change the hook or thumbnail. Test a new angle.",
      reasons: [
        `${roas.toFixed(1)}x ROAS — above breakeven but below profitable scale`,
        hasHook ? `"${hook}" hook may not be the strongest angle` : "The hook hasn't been tagged — the entry point may be the weak link",
        cpa > 0 ? `${thb(cpa)} CPA — identify what's blocking the final purchase` : "",
      ].filter(Boolean),
      fixes: [
        "Keep the concept, swap to a different hook type",
        "Try a UGC-style or before/after thumbnail",
        !hasCaption ? "Add a primary text that opens with the customer's pain point" : "Rewrite the first line to create more curiosity",
      ],
    };
  }

  return {
    type: "KILL",
    oneLiner: `This ad is losing money at ${roas.toFixed(1)}x ROAS after ${thb(spend)} spent. Pause it now.`,
    action: "Stop budget immediately. Rebuild with a completely new concept and hook.",
    reasons: [
      `${roas.toFixed(1)}x ROAS after ${thb(spend)} spend — well past the point of confidence`,
      impr >= 5000 ? `${impr.toLocaleString()} people saw it and didn't buy — the concept isn't resonating` : "Meta already deprioritized this ad due to weak early signals",
      !hasCaption ? "No ad copy — there's no message reaching the audience" : "The copy isn't matching what buyers need to hear",
    ].filter(Boolean),
    fixes: [
      "Pause this ad — every baht spent here is negative ROI",
      hasConcept ? `"${concept}" + "${hook}" combination has no signal — retire it` : "Tag this ad to understand what failed before rebuilding",
      "Create a new ad with BOTH a different concept AND a different hook",
      "Move this budget to your SCALE ads",
    ],
  };
}

// ─── Ad Card ─────────────────────────────────────────────────────────────────

function AdCard({
  ad, idx, suggestions, onSaveTag,
}: {
  ad: any;
  idx: number;
  suggestions: { concepts: string[]; hooks: string[]; personas: string[]; formats: string[] };
  onSaveTag: (creativeId: string, field: "concept" | "hookType" | "persona" | "format") => (v: string) => Promise<void>;
}) {
  const roas  = parseFloat(ad.roas ?? 0);
  const spend = parseFloat(ad.spend ?? 0);
  const insight = useMemo(() => generateAdInsight(ad), [ad]);
  const [expanded, setExpanded] = useState(false);
  const [notes, setNotes]   = useState<string>(ad.notes ?? "");
  const [saving, setSaving] = useState(false);
  const [saved,  setSaved]  = useState(false);
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
    } catch { toast.error("Failed to save note"); }
    finally { setSaving(false); }
  };

  const cfg = STATUS_CONFIG[insight.type];
  const roasHighlight: "green" | "red" | "amber" = roas >= 3 ? "green" : roas < 1.5 ? "red" : "amber";
  const creativeId = `${ad.adId}_creative`;

  return (
    <div className={`bg-white rounded-2xl border border-gray-100 shadow-sm border-l-4 ${cfg.border} overflow-hidden transition-shadow hover:shadow-md`}>
      <div className="flex gap-4 p-4">
        {/* Thumbnail */}
        <AdThumbnail adId={ad.adId} initialUrl={ad.thumbnailUrl ?? null} creativeUrl={ad.creativeUrl ?? null} size="lg" />

        {/* Main content */}
        <div className="flex-1 min-w-0 space-y-2.5">
          {/* Status + rank */}
          <div className="flex items-center gap-2 flex-wrap">
            <StatusPill type={insight.type} />
            <span className="text-xs text-gray-400">#{idx + 1}</span>
          </div>

          {/* Ad name */}
          <p className="text-sm font-semibold text-gray-900 line-clamp-2 leading-snug">{ad.adName}</p>

          {/* One-liner insight */}
          <div className="flex items-start gap-2 bg-gray-50 rounded-xl px-3 py-2.5">
            <Lightbulb className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />
            <p className="text-xs text-gray-700 leading-relaxed">{insight.oneLiner}</p>
          </div>

          {/* Metrics */}
          <div className="flex flex-wrap gap-2">
            <MetricChip label="ROAS" value={`${roas.toFixed(1)}x`} highlight={roasHighlight} />
            <MetricChip label="Spend" value={thb(spend)} />
            {Number(ad.purchases ?? 0) > 0 && <MetricChip label="Orders" value={`${Number(ad.purchases).toLocaleString()}`} />}
            {parseFloat(ad.cpa ?? 0) > 0 && <MetricChip label="CPA" value={thb(ad.cpa)} />}
          </div>

          {/* Tags */}
          <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
            <span className="text-xs text-gray-400 mr-0.5">Concept</span>
            <TagPill
              value={ad.concept} placeholder="Concept" color="blue"
              suggestions={suggestions.concepts}
              onSave={onSaveTag(creativeId, "concept")}
            />
            <span className="text-xs text-gray-400 ml-2 mr-0.5">Hook</span>
            <TagPill
              value={ad.hookType} placeholder="Hook" color="purple"
              suggestions={suggestions.hooks}
              onSave={onSaveTag(creativeId, "hookType")}
            />
          </div>
        </div>
      </div>

      {/* Expandable detail */}
      <div className="border-t border-gray-50">
        <button
          onClick={() => setExpanded(!expanded)}
          className="w-full flex items-center justify-between px-4 py-2 text-xs text-gray-400 hover:text-gray-600 hover:bg-gray-50 transition-colors"
        >
          <span>{expanded ? "Hide detail" : "See full insight & notes"}</span>
          <span>{expanded ? "▲" : "▼"}</span>
        </button>

        {expanded && (
          <div className="px-4 pb-4 space-y-4">
            {/* Action callout */}
            <div className={`rounded-xl border p-3 flex items-start gap-2 ${
              insight.type === "SCALE"   ? "bg-emerald-50 border-emerald-200" :
              insight.type === "KILL"    ? "bg-red-50 border-red-200" :
              insight.type === "ITERATE" ? "bg-amber-50 border-amber-200" :
              "bg-gray-50 border-gray-200"
            }`}>
              <Wrench className="w-3.5 h-3.5 mt-0.5 shrink-0 text-gray-500" />
              <p className="text-xs font-medium leading-relaxed">{insight.action}</p>
            </div>

            {/* Reasons */}
            {insight.reasons.length > 0 && (
              <div className="space-y-1">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
                  {insight.type === "SCALE" ? "Why it's winning" : insight.type === "KILL" ? "Why it's failing" : "What we see"}
                </p>
                {insight.reasons.map((r, i) => (
                  <div key={i} className="flex items-start gap-2 text-xs text-gray-600">
                    <CheckCircle2 className={`w-3 h-3 mt-0.5 shrink-0 ${
                      insight.type === "SCALE" ? "text-emerald-500" :
                      insight.type === "KILL"  ? "text-red-400" : "text-amber-500"
                    }`} />
                    {r}
                  </div>
                ))}
              </div>
            )}

            {/* Fixes */}
            {insight.fixes.length > 0 && (
              <div className="space-y-1">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">What to do next</p>
                {insight.fixes.map((f, i) => (
                  <div key={i} className="flex items-start gap-2 text-xs text-gray-600">
                    <span className={`mt-0.5 shrink-0 w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold ${
                      insight.type === "KILL" ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-700"
                    }`}>{i + 1}</span>
                    {f}
                  </div>
                ))}
              </div>
            )}

            {/* Notes */}
            <div className="space-y-2">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide flex items-center gap-1.5">
                <MessageSquarePlus className="w-3.5 h-3.5" />
                Your notes
              </p>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                onBlur={saveNotes}
                placeholder="Add your own notes, observations, or next steps…"
                rows={3}
                className="w-full text-xs bg-gray-50 rounded-xl border border-gray-200 px-3 py-2.5 resize-none focus:outline-none focus:ring-2 focus:ring-blue-200 placeholder:text-gray-300 leading-relaxed"
              />
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-300">Saves on blur</span>
                <div className="flex items-center gap-2">
                  {saved && <span className="text-xs text-emerald-600 flex items-center gap-1"><Check className="w-3 h-3" />Saved</span>}
                  <button
                    onClick={saveNotes}
                    disabled={saving || notes === (ad.notes ?? "")}
                    className="text-xs px-3 py-1 rounded-lg bg-gray-900 text-white disabled:opacity-30 hover:bg-gray-700 transition-colors"
                  >
                    {saving ? <Loader2 className="w-3 h-3 animate-spin inline" /> : "Save"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Summary bar ─────────────────────────────────────────────────────────────

function SummaryBar({ ads }: { ads: any[] }) {
  const stats = useMemo(() => {
    if (!ads.length) return null;
    const withSpend = ads.filter((a) => parseFloat(a.spend ?? 0) >= 500);
    const scale   = withSpend.filter((a) => parseFloat(a.roas ?? 0) >= 3);
    const iterate = withSpend.filter((a) => parseFloat(a.roas ?? 0) >= 1.5 && parseFloat(a.roas ?? 0) < 3);
    const kill    = withSpend.filter((a) => parseFloat(a.roas ?? 0) < 1.5);
    const topAd   = [...ads].sort((a, b) => parseFloat(b.roas ?? 0) - parseFloat(a.roas ?? 0))[0];

    const conceptMap = new Map<string, { roases: number[]; spend: number }>();
    for (const ad of ads.filter((a) => a.concept)) {
      const c = ad.concept as string;
      if (!conceptMap.has(c)) conceptMap.set(c, { roases: [], spend: 0 });
      conceptMap.get(c)!.roases.push(parseFloat(ad.roas ?? 0));
      conceptMap.get(c)!.spend += parseFloat(ad.spend ?? 0);
    }
    const winningConcept = Array.from(conceptMap.entries())
      .filter(([, v]) => v.spend >= 500)
      .map(([concept, v]) => ({ concept, avgRoas: v.roases.reduce((a, b) => a + b, 0) / v.roases.length }))
      .sort((a, b) => b.avgRoas - a.avgRoas)[0] ?? null;

    return { scale, iterate, kill, topAd, winningConcept, total: ads.length };
  }, [ads]);

  if (!stats) return null;
  const topRoas = parseFloat(stats.topAd?.roas ?? 0);

  return (
    <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
      {/* Top performer */}
      <div className="lg:col-span-2 bg-gradient-to-br from-emerald-50 to-teal-50 border border-emerald-200 rounded-2xl p-4">
        <div className="flex items-center gap-1.5 mb-2">
          <Flame className="w-4 h-4 text-emerald-600" />
          <span className="text-xs font-semibold text-emerald-700 uppercase tracking-wide">Top Performer</span>
        </div>
        {stats.topAd ? (
          <>
            <p className="text-sm font-bold text-gray-900 line-clamp-1 mb-1">{stats.topAd.adName}</p>
            <p className="text-xs text-emerald-700">
              {topRoas.toFixed(1)}x ROAS · {thb(stats.topAd.spend)} spent
            </p>
          </>
        ) : (
          <p className="text-xs text-gray-400">No data yet</p>
        )}
      </div>

      {/* Scale */}
      <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 flex flex-col">
        <div className="flex items-center gap-1.5 mb-1">
          <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />
          <span className="text-xs font-semibold text-emerald-700">Scale</span>
        </div>
        <p className="text-2xl font-bold text-emerald-700">{stats.scale.length}</p>
        <p className="text-xs text-emerald-600 mt-0.5">ads ready to scale</p>
      </div>

      {/* Iterate */}
      <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex flex-col">
        <div className="flex items-center gap-1.5 mb-1">
          <Minus className="w-3.5 h-3.5 text-amber-600" />
          <span className="text-xs font-semibold text-amber-700">Iterate</span>
        </div>
        <p className="text-2xl font-bold text-amber-700">{stats.iterate.length}</p>
        <p className="text-xs text-amber-600 mt-0.5">need refinement</p>
      </div>

      {/* Kill */}
      <div className="bg-red-50 border border-red-200 rounded-2xl p-4 flex flex-col">
        <div className="flex items-center gap-1.5 mb-1">
          <TrendingDown className="w-3.5 h-3.5 text-red-600" />
          <span className="text-xs font-semibold text-red-700">Kill</span>
        </div>
        <p className="text-2xl font-bold text-red-700">{stats.kill.length}</p>
        <p className="text-xs text-red-600 mt-0.5">should be paused</p>
      </div>
    </div>
  );
}

// ─── Creative Intel tab ───────────────────────────────────────────────────────

function CreativeIntelTab() {
  const [sortBy, setSortBy]     = useState<SortKey>("roas");
  const [filter, setFilter]     = useState<FilterKey>("all");
  const { accountSuffix }       = useBrandFilter();
  const { dateFrom, dateTo }    = useDateFilter();
  const utils                   = trpc.useUtils();

  const { data: ads, isLoading } = trpc.analytics.getRankedAds.useQuery({ sortBy, limit: 300, accountSuffix, dateFrom, dateTo });
  const { data: suggestions }    = trpc.analytics.getTagSuggestions.useQuery();
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

  const onSaveTag = (creativeId: string, field: "concept" | "hookType" | "persona" | "format") =>
    async (value: string) => { await updateTags.mutateAsync({ creativeId, [field]: value || null }); };

  const filteredAds = useMemo(() => {
    if (!ads) return [];
    if (filter === "all") return ads;
    return ads.filter((ad: any) => {
      const t = decisionType(parseFloat(ad.roas ?? 0), parseFloat(ad.spend ?? 0));
      return t === filter;
    });
  }, [ads, filter]);

  const filterCounts = useMemo(() => {
    if (!ads) return { SCALE: 0, ITERATE: 0, KILL: 0, TESTING: 0 };
    return {
      SCALE:   ads.filter((a: any) => decisionType(parseFloat(a.roas ?? 0), parseFloat(a.spend ?? 0)) === "SCALE").length,
      ITERATE: ads.filter((a: any) => decisionType(parseFloat(a.roas ?? 0), parseFloat(a.spend ?? 0)) === "ITERATE").length,
      KILL:    ads.filter((a: any) => decisionType(parseFloat(a.roas ?? 0), parseFloat(a.spend ?? 0)) === "KILL").length,
      TESTING: ads.filter((a: any) => decisionType(parseFloat(a.roas ?? 0), parseFloat(a.spend ?? 0)) === "TESTING").length,
    };
  }, [ads]);

  const SORT_OPTIONS: { key: SortKey; label: string }[] = [
    { key: "roas",      label: "ROAS" },
    { key: "spend",     label: "Spend" },
    { key: "purchases", label: "Orders" },
    { key: "cpa",       label: "CPA" },
  ];

  const FILTER_OPTIONS: { key: FilterKey; label: string; count?: number }[] = [
    { key: "all",     label: "All",     count: ads?.length ?? 0 },
    { key: "SCALE",   label: "Scale",   count: filterCounts.SCALE },
    { key: "ITERATE", label: "Iterate", count: filterCounts.ITERATE },
    { key: "KILL",    label: "Kill",    count: filterCounts.KILL },
    { key: "TESTING", label: "Watch",   count: filterCounts.TESTING },
  ];

  return (
    <div className="space-y-5">
      <SummaryBar ads={ads ?? []} />

      {/* Controls */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Filter pills */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {FILTER_OPTIONS.map(({ key, label, count }) => {
            const active = filter === key;
            const dotColor = key === "SCALE" ? "bg-emerald-500" : key === "ITERATE" ? "bg-amber-400" : key === "KILL" ? "bg-red-500" : key === "TESTING" ? "bg-slate-400" : "";
            return (
              <button
                key={key}
                onClick={() => setFilter(key)}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors border ${
                  active
                    ? "bg-gray-900 text-white border-gray-900"
                    : "bg-white text-gray-600 border-gray-200 hover:border-gray-300 hover:text-gray-900"
                }`}
              >
                {key !== "all" && <span className={`w-1.5 h-1.5 rounded-full ${active ? "bg-white" : dotColor}`} />}
                {label}
                {count !== undefined && (
                  <span className={`text-[10px] font-bold ${active ? "text-white/70" : "text-gray-400"}`}>
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Sort */}
        <div className="flex items-center gap-1.5 ml-auto">
          <span className="text-xs text-gray-400">Sort:</span>
          {SORT_OPTIONS.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setSortBy(key)}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${
                sortBy === key
                  ? "bg-gray-900 text-white"
                  : "bg-gray-100 text-gray-500 hover:bg-gray-200"
              }`}
            >
              {label}
            </button>
          ))}
          <Button
            size="sm"
            variant="outline"
            className="gap-1.5 text-xs h-7 ml-2"
            onClick={() => autoTag.mutate()}
            disabled={autoTag.isPending}
          >
            {autoTag.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Tag className="w-3 h-3" />}
            Auto-tag
          </Button>
        </div>
      </div>

      {/* Ad cards */}
      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-6 h-6 animate-spin text-gray-300" />
        </div>
      ) : !filteredAds.length ? (
        <div className="text-center py-16 text-gray-400">
          {filter === "all" ? "No ads synced yet — run a sync first" : `No ${filter.toLowerCase()} ads in this period`}
        </div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          {filteredAds.map((ad: any, idx: number) => (
            <AdCard
              key={ad.adId}
              ad={ad}
              idx={idx}
              suggestions={suggestions ?? { concepts: [], hooks: [], personas: [], formats: [] }}
              onSaveTag={onSaveTag}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Rankings tab (compact table for power users) ─────────────────────────────

function RankingsTab() {
  const [sortBy, setSortBy]  = useState<SortKey>("roas");
  const { accountSuffix }    = useBrandFilter();
  const { dateFrom, dateTo } = useDateFilter();
  const utils                = trpc.useUtils();

  const { data: ads, isLoading } = trpc.analytics.getRankedAds.useQuery({ sortBy, limit: 200, accountSuffix, dateFrom, dateTo });
  const { data: suggestions }    = trpc.analytics.getTagSuggestions.useQuery();
  const updateTags = trpc.meta.updateTags.useMutation({
    onSuccess: () => {
      utils.analytics.getRankedAds.invalidate();
      utils.analytics.getTagSuggestions.invalidate();
    },
  });

  const onSaveTag = (creativeId: string, field: "concept" | "hookType" | "persona" | "format") =>
    async (value: string) => { await updateTags.mutateAsync({ creativeId, [field]: value || null }); };

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
      <div className="flex flex-wrap gap-2 items-center">
        <span className="text-sm text-gray-500">Sort by:</span>
        <SortBtn field="roas" label="ROAS" />
        <SortBtn field="cpa" label="CPA" />
        <SortBtn field="spend" label="Spend" />
        <SortBtn field="purchases" label="Orders" />
      </div>
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">All Ads — Ranked</CardTitle>
          <CardDescription>{ads ? `${ads.length} ads` : "–"} · Click concept/hook to tag</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-gray-300" /></div>
          ) : !ads?.length ? (
            <p className="text-center text-gray-400 py-12">No ads yet</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b bg-gray-50">
                  <tr>
                    <th className="text-left py-3 px-4 text-xs font-medium text-gray-400 w-8">#</th>
                    <th className="text-left py-3 px-4 text-xs font-medium text-gray-400" style={{ minWidth: 260 }}>Ad</th>
                    <th className="text-left py-3 px-4 text-xs font-medium text-gray-400">Concept</th>
                    <th className="text-left py-3 px-4 text-xs font-medium text-gray-400">Hook</th>
                    <th className="text-right py-3 px-4 text-xs font-medium text-gray-400">Spend</th>
                    <th className="text-right py-3 px-4 text-xs font-medium text-gray-400">ROAS</th>
                    <th className="text-right py-3 px-4 text-xs font-medium text-gray-400">CPA</th>
                    <th className="text-right py-3 px-4 text-xs font-medium text-gray-400">Orders</th>
                    <th className="text-center py-3 px-4 text-xs font-medium text-gray-400">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {ads.map((ad: any, idx: number) => {
                    const roas  = parseFloat(ad.roas ?? 0);
                    const spend = parseFloat(ad.spend ?? 0);
                    const type  = decisionType(roas, spend);
                    const creativeId = `${ad.adId}_creative`;
                    return (
                      <tr key={ad.adId} className="hover:bg-gray-50 transition-colors align-middle">
                        <td className="py-3 px-4 text-gray-300 text-xs">{idx + 1}</td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-3">
                            <AdThumbnail adId={ad.adId} initialUrl={ad.thumbnailUrl ?? null} creativeUrl={ad.creativeUrl ?? null} size="sm" />
                            <p className="text-xs font-medium text-gray-800 line-clamp-2 max-w-[200px]">{ad.adName}</p>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <TagPill value={ad.concept} placeholder="Concept" color="blue" suggestions={suggestions?.concepts ?? []} onSave={onSaveTag(creativeId, "concept")} />
                        </td>
                        <td className="py-3 px-4">
                          <TagPill value={ad.hookType} placeholder="Hook" color="purple" suggestions={suggestions?.hooks ?? []} onSave={onSaveTag(creativeId, "hookType")} />
                        </td>
                        <td className="py-3 px-4 text-right text-xs tabular-nums text-gray-600">{thb(spend)}</td>
                        <td className={`py-3 px-4 text-right text-xs tabular-nums font-semibold ${roas >= 3 ? "text-emerald-600" : roas < 1.5 ? "text-red-500" : "text-amber-600"}`}>{roas.toFixed(2)}x</td>
                        <td className="py-3 px-4 text-right text-xs tabular-nums text-gray-500">{parseFloat(ad.cpa ?? 0) > 0 ? thb(ad.cpa) : "–"}</td>
                        <td className="py-3 px-4 text-right text-xs tabular-nums text-gray-500">{Number(ad.purchases ?? 0) > 0 ? Number(ad.purchases).toLocaleString() : "–"}</td>
                        <td className="py-3 px-4 text-center"><StatusPill type={type} /></td>
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

// ─── Pattern charts ───────────────────────────────────────────────────────────

function GroupChart({ data, nameKey, color1, color2 }: { data: any[]; nameKey: string; color1: string; color2: string }) {
  if (!data?.length) return <p className="text-center text-gray-400 py-8 text-sm">Tag your ads to see patterns here</p>;
  const rows = data.map((r: any) => ({ name: r[nameKey] ?? "–", ROAS: parseFloat(fmt(r.avgRoas)), "CPA (฿)": parseFloat(fmt(r.avgCpa, 0)) }));
  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={rows} margin={{ bottom: 50 }}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="name" angle={-30} textAnchor="end" height={70} tick={{ fontSize: 11 }} />
        <YAxis yAxisId="left" /><YAxis yAxisId="right" orientation="right" />
        <Tooltip /><Legend />
        <Bar yAxisId="left" dataKey="ROAS" fill={color1} />
        <Bar yAxisId="right" dataKey="CPA (฿)" fill={color2} />
      </BarChart>
    </ResponsiveContainer>
  );
}

function GroupBreakdown({ data, nameKey }: { data: any[]; nameKey: string }) {
  if (!data?.length) return null;
  return (
    <div className="space-y-2 mt-4">
      {data.map((row: any) => {
        const roas = parseFloat(row.avgRoas ?? 0);
        return (
          <div key={row[nameKey]} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl text-sm border border-gray-100">
            <div className="flex items-center gap-2">
              <span className="font-medium text-gray-800">{row[nameKey]}</span>
              <Badge variant="outline" className="text-xs">{Number(row.adsCount)} ads</Badge>
            </div>
            <div className="flex gap-6 text-right">
              <div><p className="text-gray-400 text-xs">ROAS</p><p className={`font-bold text-sm ${roas >= 3 ? "text-emerald-600" : roas < 1.5 ? "text-red-500" : "text-amber-600"}`}>{fmt(row.avgRoas)}</p></div>
              <div><p className="text-gray-400 text-xs">CPA</p><p className="font-bold text-sm">{thb(row.avgCpa)}</p></div>
              <div><p className="text-gray-400 text-xs">Spend</p><p className="font-bold text-sm">{thb(row.totalSpend)}</p></div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function PatternsTab() {
  const { accountSuffix }    = useBrandFilter();
  const { dateFrom, dateTo } = useDateFilter();
  const [sub, setSub] = useState<"concepts" | "hooks" | "formats" | "personas">("concepts");

  const { data: conceptData, isLoading: l1 } = trpc.analytics.getConceptAnalytics.useQuery({ accountSuffix, dateFrom, dateTo });
  const { data: hookData,    isLoading: l2 } = trpc.analytics.getHookAnalytics.useQuery({ accountSuffix, dateFrom, dateTo });
  const { data: formatData,  isLoading: l3 } = trpc.analytics.getFormatAnalytics.useQuery({ accountSuffix, dateFrom, dateTo });
  const { data: personaData, isLoading: l4 } = trpc.analytics.getPersonaAnalytics.useQuery({ accountSuffix, dateFrom, dateTo });

  const Loading = () => <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-gray-300" /></div>;

  const tabs = [
    { key: "concepts" as const, label: "Concepts" },
    { key: "hooks"    as const, label: "Hooks"    },
    { key: "formats"  as const, label: "Formats"  },
    { key: "personas" as const, label: "Personas" },
  ];

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        {tabs.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setSub(key)}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${sub === key ? "bg-gray-900 text-white" : "bg-gray-100 text-gray-500 hover:bg-gray-200"}`}
          >
            {label}
          </button>
        ))}
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base capitalize">{sub === "concepts" ? "By Concept" : sub === "hooks" ? "By Hook Style" : sub === "formats" ? "By Format" : "By Persona"}</CardTitle>
          <CardDescription>Average ROAS and CPA — tag your ads to populate this view</CardDescription>
        </CardHeader>
        <CardContent>
          {sub === "concepts"  && (l1 ? <Loading /> : <><GroupChart data={conceptData ?? []} nameKey="concept"  color1="#10b981" color2="#f59e0b" /><GroupBreakdown data={conceptData ?? []} nameKey="concept" /></>)}
          {sub === "hooks"     && (l2 ? <Loading /> : <><GroupChart data={hookData    ?? []} nameKey="hookType" color1="#8b5cf6" color2="#ec4899" /><GroupBreakdown data={hookData    ?? []} nameKey="hookType" /></>)}
          {sub === "formats"   && (l3 ? <Loading /> : <><GroupChart data={formatData  ?? []} nameKey="format"   color1="#06b6d4" color2="#f97316" /><GroupBreakdown data={formatData  ?? []} nameKey="format" /></>)}
          {sub === "personas"  && (l4 ? <Loading /> : <><GroupChart data={personaData ?? []} nameKey="persona"  color1="#3b82f6" color2="#ef4444" /><GroupBreakdown data={personaData ?? []} nameKey="persona" /></>)}
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function Analytics() {
  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <DateFilterBar />
        <div className="w-px h-5 bg-gray-200 hidden sm:block" />
        <BrandFilterBar />
      </div>

      <Tabs defaultValue="intel" className="w-full">
        <TabsList className="bg-gray-100 p-1 rounded-xl h-auto">
          <TabsTrigger value="intel"    className="rounded-lg text-sm px-4 py-2 data-[state=active]:bg-white data-[state=active]:shadow-sm">Creative Intel</TabsTrigger>
          <TabsTrigger value="rankings" className="rounded-lg text-sm px-4 py-2 data-[state=active]:bg-white data-[state=active]:shadow-sm">Rankings</TabsTrigger>
          <TabsTrigger value="patterns" className="rounded-lg text-sm px-4 py-2 data-[state=active]:bg-white data-[state=active]:shadow-sm">Patterns</TabsTrigger>
        </TabsList>

        <TabsContent value="intel"    className="mt-5"><CreativeIntelTab /></TabsContent>
        <TabsContent value="rankings" className="mt-5"><RankingsTab /></TabsContent>
        <TabsContent value="patterns" className="mt-5"><PatternsTab /></TabsContent>
      </Tabs>
    </div>
  );
}
