import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { TrendingUp, AlertTriangle, ThumbsUp } from "lucide-react";
import { useState } from "react";

/**
 * Feedback Loop Panel
 * Shows winning concepts (top 3 by ROAS) and concepts that need review
 */
export default function FeedbackLoop() {
  const [feedback, setFeedback] = useState("");
  const [selectedConcept, setSelectedConcept] = useState<string | null>(null);

  // Mock data - will be replaced with real data from tRPC
  const winningConcepts = [
    {
      concept: "Hormonal Acne Solution",
      roas: 4.2,
      cpa: 85,
      adsCount: 12,
      spend: 2400,
    },
    {
      concept: "Before & After Story",
      roas: 3.8,
      cpa: 95,
      adsCount: 8,
      spend: 1600,
    },
    {
      concept: "User Testimonial",
      roas: 3.5,
      cpa: 110,
      adsCount: 10,
      spend: 1800,
    },
  ];

  const needsReview = [
    {
      concept: "Generic Product Demo",
      roas: 1.2,
      cpa: 280,
      adsCount: 5,
      spend: 900,
      issue: "Low ROAS - consider pausing or redesigning",
    },
    {
      concept: "Educational Content",
      roas: 1.5,
      cpa: 240,
      adsCount: 6,
      spend: 1200,
      issue: "High CPA - test different hooks",
    },
  ];

  const handleSubmitFeedback = () => {
    console.log("Feedback submitted:", { concept: selectedConcept, feedback });
    setFeedback("");
    setSelectedConcept(null);
  };

  return (
    <div className="space-y-12">
      {/* Winning Concepts */}
      <Card className="border-l-4 border-l-green-500">
        <CardHeader>
          <div className="flex items-center gap-2">
            <ThumbsUp className="w-5 h-5 text-green-500" />
            <div>
              <CardTitle>Winning Concepts</CardTitle>
              <CardDescription>Top 3 performing concepts by ROAS</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {winningConcepts.map((concept, idx) => (
              <div
                key={concept.concept}
                className="p-4 bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-lg hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <Badge className="bg-green-600 text-white">#{idx + 1}</Badge>
                    <div>
                      <h3 className="font-semibold text-foreground">{concept.concept}</h3>
                      <p className="text-sm text-muted-foreground">{concept.adsCount} active ads</p>
                    </div>
                  </div>
                  <TrendingUp className="w-5 h-5 text-green-600" />
                </div>

                <div className="grid grid-cols-3 gap-4 mb-3">
                  <div>
                    <p className="text-xs text-muted-foreground">ROAS</p>
                    <p className="text-lg font-bold text-green-600">{concept.roas}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Avg CPA</p>
                    <p className="text-lg font-bold">฿{concept.cpa}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Total Spend</p>
                    <p className="text-lg font-bold">฿{concept.spend.toLocaleString("th-TH")}</p>
                  </div>
                </div>

                <p className="text-sm text-green-700 dark:text-green-400 font-medium">
                  ✓ Recommendation: Scale this concept - consistent high performance
                </p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Needs Review */}
      <Card className="border-l-4 border-l-amber-500">
        <CardHeader>
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-amber-500" />
            <div>
              <CardTitle>Needs Review</CardTitle>
              <CardDescription>Concepts with performance issues</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {needsReview.length > 0 ? (
              needsReview.map((concept) => (
                <div
                  key={concept.concept}
                  className="p-4 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="font-semibold text-foreground">{concept.concept}</h3>
                      <p className="text-sm text-muted-foreground">{concept.adsCount} active ads</p>
                    </div>
                    <Badge variant="outline" className="bg-amber-100 text-amber-900">
                      Review
                    </Badge>
                  </div>

                  <div className="grid grid-cols-3 gap-4 mb-3">
                    <div>
                      <p className="text-xs text-muted-foreground">ROAS</p>
                      <p className="text-lg font-bold text-amber-600">{concept.roas}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Avg CPA</p>
                      <p className="text-lg font-bold">฿{concept.cpa}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Total Spend</p>
                      <p className="text-lg font-bold">฿{concept.spend.toLocaleString("th-TH")}</p>
                    </div>
                  </div>

                  <p className="text-sm text-amber-700 dark:text-amber-400 font-medium mb-3">
                    ⚠ {concept.issue}
                  </p>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSelectedConcept(concept.concept)}
                    className="w-full"
                  >
                    Add Feedback
                  </Button>
                </div>
              ))
            ) : (
              <p className="text-center text-muted-foreground py-8">All concepts performing well!</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Feedback Form */}
      {selectedConcept && (
        <Card>
          <CardHeader>
            <CardTitle>Add Feedback</CardTitle>
            <CardDescription>Provide actionable feedback for: {selectedConcept}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Textarea
              placeholder="Share your feedback, suggestions, or next steps for this concept..."
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              className="min-h-24"
            />
            <div className="flex gap-2">
              <Button onClick={handleSubmitFeedback} className="flex-1">
                Submit Feedback
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setSelectedConcept(null);
                  setFeedback("");
                }}
                className="flex-1"
              >
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
