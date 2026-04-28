import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, Lightbulb, TrendingUp, AlertCircle } from "lucide-react";
import { useState } from "react";

/**
 * AI Insights Page
 * Displays LLM-generated insights and recommendations
 */
export default function Insights() {
  const [isGenerating, setIsGenerating] = useState(false);

  // Mock insights data
  const topPerformerInsights = [
    {
      concept: "Hormonal Acne Solution",
      roas: 4.2,
      insight:
        "This concept resonates strongly with your target audience. The before/after visual hook combined with the testimonial format creates high engagement. The specific pain point (hormonal acne) vs generic skincare messaging drives higher conversion rates.",
      recommendations: [
        "Scale budget by 30-50% - this concept has room to grow",
        "Test variations with different age demographics (expand beyond 18-25)",
        "Create 3-5 new variations using the same hook but different testimonials",
        "Consider retargeting website visitors with this concept",
      ],
    },
    {
      concept: "Before & After Story",
      roas: 3.8,
      insight:
        "Visual transformation stories are highly effective for skincare products. The sequential narrative (problem → solution → result) naturally guides viewers through your value proposition.",
      recommendations: [
        "Increase daily budget allocation to this concept",
        "Test with longer-form video content (15-30 seconds)",
        "A/B test different music/sound design",
        "Expand to TikTok and Instagram Reels with this format",
      ],
    },
  ];

  const underperformerInsights = [
    {
      concept: "Generic Product Demo",
      roas: 1.2,
      cpa: 280,
      insight:
        "Generic product demonstrations without emotional connection underperform. Viewers don't connect with features alone - they need to see how it solves their specific problem.",
      recommendations: [
        "Pause this concept and redirect budget to top performers",
        "If iterating: Add customer testimonials or before/after visuals",
        "Test with a specific pain point angle (e.g., 'Acne that won't go away')",
        "Consider this format for retargeting only, not cold traffic",
      ],
      decision: "PAUSE",
    },
    {
      concept: "Educational Content",
      roas: 1.5,
      cpa: 240,
      insight:
        "Pure educational content (tips, how-tos) generates awareness but not conversions. Your audience wants solutions, not lessons.",
      recommendations: [
        "Reframe as problem-solution content instead of pure education",
        "Add a clear CTA linking to product page",
        "Reduce budget by 50% and test new variations",
        "Use this format for email nurture sequences instead of paid ads",
      ],
      decision: "ITERATE",
    },
  ];

  return (
    <div className="space-y-8">
      {/* Generate Insights Button */}
      <Card className="bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-950/20 dark:to-blue-950/20 border-purple-200 dark:border-purple-800">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lightbulb className="w-5 h-5 text-purple-600" />
            AI-Powered Insights
          </CardTitle>
          <CardDescription>
            Analyze your top and bottom performing concepts with AI recommendations
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            onClick={() => setIsGenerating(true)}
            disabled={isGenerating}
            size="lg"
            className="w-full"
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Generating Insights...
              </>
            ) : (
              "Generate New Insights"
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Top Performer Insights */}
      <div>
        <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
          <TrendingUp className="w-6 h-6 text-green-600" />
          Top Performers
        </h2>
        <div className="space-y-4">
          {topPerformerInsights.map((item) => (
            <Card key={item.concept} className="border-l-4 border-l-green-500">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg">{item.concept}</CardTitle>
                    <CardDescription>ROAS: {item.roas}</CardDescription>
                  </div>
                  <Badge className="bg-green-600 text-white">Scale</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="bg-green-50 dark:bg-green-950/20 p-4 rounded-lg">
                  <p className="text-sm text-foreground">{item.insight}</p>
                </div>

                <div>
                  <h4 className="font-semibold text-sm mb-2">Recommendations:</h4>
                  <ul className="space-y-2">
                    {item.recommendations.map((rec, idx) => (
                      <li key={idx} className="text-sm flex gap-2">
                        <span className="text-green-600 font-bold">✓</span>
                        <span>{rec}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Underperformer Insights */}
      <div>
        <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
          <AlertCircle className="w-6 h-6 text-amber-600" />
          Needs Review
        </h2>
        <div className="space-y-4">
          {underperformerInsights.map((item) => (
            <Card key={item.concept} className="border-l-4 border-l-amber-500">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg">{item.concept}</CardTitle>
                    <CardDescription>
                      ROAS: {item.roas} | CPA: ฿{item.cpa}
                    </CardDescription>
                  </div>
                  <Badge
                    variant="outline"
                    className={
                      item.decision === "PAUSE"
                        ? "bg-red-100 text-red-900"
                        : "bg-amber-100 text-amber-900"
                    }
                  >
                    {item.decision}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="bg-amber-50 dark:bg-amber-950/20 p-4 rounded-lg">
                  <p className="text-sm text-foreground">{item.insight}</p>
                </div>

                <div>
                  <h4 className="font-semibold text-sm mb-2">Next Steps:</h4>
                  <ul className="space-y-2">
                    {item.recommendations.map((rec, idx) => (
                      <li key={idx} className="text-sm flex gap-2">
                        <span className="text-amber-600 font-bold">•</span>
                        <span>{rec}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Key Takeaways */}
      <Card className="bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800">
        <CardHeader>
          <CardTitle className="text-blue-900 dark:text-blue-100">Key Takeaways</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-blue-800 dark:text-blue-200">
          <p>
            <strong>Budget Allocation:</strong> Move 50% of budget from underperformers to top 3 concepts
          </p>
          <p>
            <strong>Creative Direction:</strong> Focus on emotional storytelling (before/after, testimonials) over
            feature-focused content
          </p>
          <p>
            <strong>Testing Strategy:</strong> Create 3-5 variations of top performers with different demographics
          </p>
          <p>
            <strong>Timeline:</strong> Implement changes this week to capture momentum before end of month
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
