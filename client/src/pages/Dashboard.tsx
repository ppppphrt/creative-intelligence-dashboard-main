import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, TrendingUp, DollarSign, Target, Zap } from "lucide-react";
import { useState } from "react";
import BrandFilterBar from "@/components/BrandFilterBar";
import DateFilterBar from "@/components/DateFilterBar";
import { useBrandFilter } from "@/hooks/useBrandFilter";
import { useDateFilter } from "@/hooks/useDateFilter";

export default function Dashboard() {
  const [tagFilter, setTagFilter] = useState<"all" | "concept">("all");
  const { accountSuffix } = useBrandFilter();
  const { dateFrom, dateTo } = useDateFilter();

  // Live filtered queries — both respect brand + date
  const { data: concepts, isLoading: conceptsLoading } = trpc.analytics.getConceptAnalytics.useQuery({ accountSuffix, dateFrom, dateTo });
  const { data: creatives, isLoading: creativesLoading } = trpc.meta.getCreativeLibrary.useQuery({ limit: 100 });

  // KPIs computed from filtered concept data
  const totalSpend = concepts?.reduce((sum, c) => sum + parseFloat(c.totalSpend || "0"), 0) ?? 0;
  const avgRoas = concepts && concepts.length > 0
    ? concepts.reduce((sum, c) => sum + parseFloat(c.avgRoas || "0"), 0) / concepts.length
    : 0;
  const avgCpa = concepts && concepts.length > 0
    ? concepts.filter((c) => parseFloat(c.avgCpa || "0") > 0).reduce((sum, c) => sum + parseFloat(c.avgCpa || "0"), 0) /
      concepts.filter((c) => parseFloat(c.avgCpa || "0") > 0).length
    : 0;

  const topConcepts = [...(concepts ?? [])].sort((a, b) => parseFloat(b.avgRoas || "0") - parseFloat(a.avgRoas || "0")).slice(0, 5);

  return (
    <div className="space-y-10">
      {/* Page header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Creative performance overview</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <DateFilterBar />
        <div className="w-px bg-border hidden sm:block" />
        <BrandFilterBar />
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="relative overflow-hidden">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Total Spend</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-end justify-between">
              <span className="text-3xl font-bold tracking-tight">฿{totalSpend.toLocaleString("th-TH", { maximumFractionDigits: 0 })}</span>
              <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center mb-1">
                <DollarSign className="w-5 h-5 text-primary" />
              </div>
            </div>
          </CardContent>
          <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary/20" />
        </Card>

        <Card className="relative overflow-hidden">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Avg ROAS</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-end justify-between">
              <span className="text-3xl font-bold tracking-tight">{avgRoas.toFixed(2)}x</span>
              <div className="h-10 w-10 rounded-xl bg-green-500/10 flex items-center justify-center mb-1">
                <TrendingUp className="w-5 h-5 text-green-600" />
              </div>
            </div>
          </CardContent>
          <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-green-500/30" />
        </Card>

        <Card className="relative overflow-hidden">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Avg CPA</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-end justify-between">
              <span className="text-3xl font-bold tracking-tight">฿{avgCpa.toFixed(2)}</span>
              <div className="h-10 w-10 rounded-xl bg-violet-500/10 flex items-center justify-center mb-1">
                <Target className="w-5 h-5 text-violet-600" />
              </div>
            </div>
          </CardContent>
          <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-violet-500/30" />
        </Card>
      </div>

      {/* Top Performing Concepts */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <Zap className="h-4 w-4 text-primary" />
            </div>
            <div>
              <CardTitle className="text-base">Top Performing Concepts</CardTitle>
              <CardDescription className="text-xs">Ranked by ROAS · filtered by selected period</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {conceptsLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : topConcepts.length > 0 ? (
            <div className="space-y-3">
              {topConcepts.map((concept, idx) => (
                <div key={concept.concept} className="flex items-center justify-between p-4 rounded-xl border border-border/60 hover:bg-muted/40 transition-colors">
                  <div className="flex items-center gap-3">
                    <span className="h-6 w-6 rounded-full bg-muted text-xs font-bold flex items-center justify-center text-muted-foreground shrink-0">
                      {idx + 1}
                    </span>
                    <div>
                      <p className="font-medium text-sm">{concept.concept}</p>
                      <p className="text-xs text-muted-foreground">{concept.adsCount} ads</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-green-600">{parseFloat(concept.avgRoas || "0").toFixed(2)}x ROAS</p>
                    <p className="text-xs text-muted-foreground">฿{parseFloat(concept.avgCpa || "0").toFixed(0)} CPA</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center text-muted-foreground py-8 text-sm">No tagged ads in this period — try a wider date range</p>
          )}
        </CardContent>
      </Card>

      {/* Creative Library */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base">Creative Library</CardTitle>
              <CardDescription className="text-xs">All synced ads with tags and performance</CardDescription>
            </div>
            <div className="flex gap-2">
              <Button variant={tagFilter === "all" ? "default" : "outline"} size="sm" onClick={() => setTagFilter("all")}>
                All
              </Button>
              <Button variant={tagFilter === "concept" ? "default" : "outline"} size="sm" onClick={() => setTagFilter("concept")}>
                Concepts
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {creativesLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : creatives && creatives.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {creatives.map((creative) => (
                <CreativeCard key={creative.creativeId} creative={creative} />
              ))}
            </div>
          ) : (
            <p className="text-center text-muted-foreground py-8">No creatives found</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function CreativeCard({ creative }: { creative: any }) {
  const [isEditing, setIsEditing] = useState(false);
  const [tags, setTags] = useState({
    concept: creative.concept || "",
    persona: creative.persona || "",
    hookType: creative.hookType || "",
    format: creative.format || "",
  });

  const updateTagsMutation = trpc.meta.updateTags.useMutation();

  const handleSave = async () => {
    await updateTagsMutation.mutateAsync({
      creativeId: creative.creativeId,
      ...tags,
    });
    setIsEditing(false);
  };

  return (
    <Card className="overflow-hidden hover:shadow-lg transition-shadow">
      <div className="aspect-video bg-muted overflow-hidden relative">
        {creative.thumbnailUrl ? (
          <img
            src={creative.thumbnailUrl}
            alt={creative.adName}
            className="w-full h-full object-cover"
            onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-900">
            <div className="text-center px-4">
              <div className="w-10 h-10 rounded-full bg-slate-300 dark:bg-slate-600 flex items-center justify-center mx-auto mb-2">
                <span className="text-lg font-bold text-slate-500 dark:text-slate-300">
                  {(creative.adName || "A").charAt(0).toUpperCase()}
                </span>
              </div>
              <p className="text-xs text-muted-foreground line-clamp-2">{creative.adName}</p>
            </div>
          </div>
        )}
      </div>
      <CardContent className="p-4">
        <h3 className="font-semibold text-sm mb-2 line-clamp-2">{creative.adName}</h3>
        {creative.caption && <p className="text-xs text-muted-foreground mb-3 line-clamp-2">{creative.caption}</p>}

        {isEditing ? (
          <div className="space-y-2 mb-3">
            <Input placeholder="Concept" value={tags.concept} onChange={(e) => setTags({ ...tags, concept: e.target.value })} size={1} className="text-xs" />
            <Input placeholder="Persona"  value={tags.persona}  onChange={(e) => setTags({ ...tags, persona: e.target.value })}  size={1} className="text-xs" />
            <Input placeholder="Hook"     value={tags.hookType} onChange={(e) => setTags({ ...tags, hookType: e.target.value })} size={1} className="text-xs" />
            <Input placeholder="Format"   value={tags.format}   onChange={(e) => setTags({ ...tags, format: e.target.value })}   size={1} className="text-xs" />
            <div className="flex gap-2">
              <Button size="sm" onClick={handleSave} className="flex-1">Save</Button>
              <Button size="sm" variant="outline" onClick={() => setIsEditing(false)} className="flex-1">Cancel</Button>
            </div>
          </div>
        ) : (
          <div className="space-y-2 mb-3">
            {tags.concept  && <Badge variant="secondary" className="text-xs">{tags.concept}</Badge>}
            {tags.persona  && <Badge variant="outline"   className="text-xs">{tags.persona}</Badge>}
            {tags.hookType && <Badge variant="outline"   className="text-xs">{tags.hookType}</Badge>}
            {tags.format   && <Badge variant="outline"   className="text-xs">{tags.format}</Badge>}
            <Button size="sm" variant="ghost" onClick={() => setIsEditing(true)} className="w-full text-xs">Edit Tags</Button>
          </div>
        )}

        <div className="text-xs text-muted-foreground">
          <p>Status: {creative.status}</p>
        </div>
      </CardContent>
    </Card>
  );
}
