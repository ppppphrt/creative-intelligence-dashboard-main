import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, TrendingUp, DollarSign, Target } from "lucide-react";
import { useState } from "react";
import DateRangeFilter from "@/components/DateRangeFilter";

export default function Dashboard() {
  const [selectedConcept, setSelectedConcept] = useState<string | null>(null);
  const [tagFilter, setTagFilter] = useState<"all" | "concept" | "persona" | "hook" | "format">("all");
  const [dateRange, setDateRange] = useState({ from: new Date(new Date().setDate(new Date().getDate() - 30)), to: new Date() });

  // Fetch creative library
  const { data: creatives, isLoading: creativesLoading } = trpc.meta.getCreativeLibrary.useQuery({
    limit: 100,
  });

  // Fetch concept summary
  const { data: concepts, isLoading: conceptsLoading } = trpc.meta.getConceptSummary.useQuery();

  // Calculate KPIs
  const totalSpend = concepts?.reduce((sum, c) => sum + parseFloat(c.totalSpend || "0"), 0) || 0;
  const avgRoas = concepts && concepts.length > 0
    ? concepts.reduce((sum, c) => sum + parseFloat(c.avgRoas || "0"), 0) / concepts.length
    : 0;
  const avgCpa = concepts && concepts.length > 0
    ? concepts.reduce((sum, c) => sum + parseFloat(c.avgCpa || "0"), 0) / concepts.length
    : 0;

  // Top performing concepts
  const topConcepts = concepts?.sort((a, b) => parseFloat(b.avgRoas || "0") - parseFloat(a.avgRoas || "0")).slice(0, 5) || [];

  return (
    <div className="space-y-8">
      {/* Date Range Filter */}
      <Card>
        <CardHeader>
          <CardTitle>Filter by Date Range</CardTitle>
        </CardHeader>
        <CardContent>
          <DateRangeFilter onDateRangeChange={setDateRange} />
        </CardContent>
      </Card>
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-l-4 border-l-blue-500">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Spend</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold">฿{totalSpend.toLocaleString("th-TH", { maximumFractionDigits: 0 })}</span>
              <DollarSign className="w-5 h-5 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-green-500">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Avg ROAS</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold">{avgRoas.toFixed(2)}</span>
              <TrendingUp className="w-5 h-5 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-purple-500">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Avg CPA</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold">฿{avgCpa.toFixed(2)}</span>
              <Target className="w-5 h-5 text-purple-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Top Performing Concepts */}
      <Card>
        <CardHeader>
          <CardTitle>Top Performing Concepts</CardTitle>
          <CardDescription>Ranked by ROAS</CardDescription>
        </CardHeader>
        <CardContent>
          {conceptsLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : topConcepts.length > 0 ? (
            <div className="space-y-3">
              {topConcepts.map((concept, idx) => (
                <div key={concept.concept} className="flex items-center justify-between p-3 bg-accent/50 rounded-lg hover:bg-accent transition-colors">
                  <div className="flex items-center gap-3">
                    <Badge variant="outline" className="text-lg font-bold">{idx + 1}</Badge>
                    <div>
                      <p className="font-medium">{concept.concept}</p>
                      <p className="text-sm text-muted-foreground">{concept.adsCount} ads</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-green-600">ROAS: {concept.avgRoas}</p>
                    <p className="text-sm text-muted-foreground">CPA: ฿{concept.avgCpa}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center text-muted-foreground py-8">No concepts yet</p>
          )}
        </CardContent>
      </Card>

      {/* Creative Library */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Creative Library</CardTitle>
              <CardDescription>All ads with performance metrics</CardDescription>
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
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
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
            <Input
              placeholder="Concept"
              value={tags.concept}
              onChange={(e) => setTags({ ...tags, concept: e.target.value })}
              size={1}
              className="text-xs"
            />
            <Input
              placeholder="Persona"
              value={tags.persona}
              onChange={(e) => setTags({ ...tags, persona: e.target.value })}
              size={1}
              className="text-xs"
            />
            <Input
              placeholder="Hook"
              value={tags.hookType}
              onChange={(e) => setTags({ ...tags, hookType: e.target.value })}
              size={1}
              className="text-xs"
            />
            <Input
              placeholder="Format"
              value={tags.format}
              onChange={(e) => setTags({ ...tags, format: e.target.value })}
              size={1}
              className="text-xs"
            />
            <div className="flex gap-2">
              <Button size="sm" onClick={handleSave} className="flex-1">
                Save
              </Button>
              <Button size="sm" variant="outline" onClick={() => setIsEditing(false)} className="flex-1">
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-2 mb-3">
            {tags.concept && <Badge variant="secondary" className="text-xs">{tags.concept}</Badge>}
            {tags.persona && <Badge variant="outline" className="text-xs">{tags.persona}</Badge>}
            {tags.hookType && <Badge variant="outline" className="text-xs">{tags.hookType}</Badge>}
            {tags.format && <Badge variant="outline" className="text-xs">{tags.format}</Badge>}
            <Button size="sm" variant="ghost" onClick={() => setIsEditing(true)} className="w-full text-xs">
              Edit Tags
            </Button>
          </div>
        )}

        <div className="text-xs text-muted-foreground">
          <p>Status: {creative.status}</p>
        </div>
      </CardContent>
    </Card>
  );
}
