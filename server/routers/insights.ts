import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { getAiInsights, createAiInsight } from "../db";
import { invokeLLM } from "../_core/llm";

/**
 * AI Insights router
 * Handles generating and retrieving AI-powered insights for creative performance
 */
export const insightsRouter = router({
  /**
   * Get AI insights for top/bottom performers
   */
  getInsights: protectedProcedure
    .input(
      z.object({
        insightType: z.enum(["TOP_PERFORMER", "UNDERPERFORMER"]).optional(),
      })
    )
    .query(async ({ input }) => {
      return getAiInsights(input.insightType);
    }),

  /**
   * Generate AI insights from performance data
   * Analyzes top and bottom performing concepts and generates recommendations
   */
  generateInsights: protectedProcedure
    .input(
      z.object({
        topPerformers: z.array(
          z.object({
            concept: z.string(),
            hookType: z.string().optional(),
            format: z.string().optional(),
            roas: z.number(),
            cpa: z.number(),
            adsCount: z.number(),
          })
        ),
        underperformers: z.array(
          z.object({
            concept: z.string(),
            hookType: z.string().optional(),
            format: z.string().optional(),
            roas: z.number(),
            cpa: z.number(),
            adsCount: z.number(),
          })
        ),
      })
    )
    .mutation(async ({ input }) => {
      try {
        const insights = [];

        // Generate insights for top performers
        for (const performer of input.topPerformers) {
          const prompt = `Analyze this top-performing creative concept and provide actionable recommendations for scaling:

Concept: ${performer.concept}
Hook Type: ${performer.hookType || "Not specified"}
Format: ${performer.format || "Not specified"}
ROAS: ${performer.roas}
CPA: ฿${performer.cpa}
Number of Ads: ${performer.adsCount}

Provide:
1. Why this concept is performing well
2. Specific recommendations to scale this concept
3. Variations to test based on the successful elements

Keep the response concise and actionable.`;

          const response = await invokeLLM({
            messages: [
              {
                role: "system",
                content:
                  "You are a creative strategist analyzing Meta Ads performance data. Provide concise, actionable insights focused on scaling winning creative concepts.",
              },
              { role: "user", content: prompt },
            ],
          });

          const content = response.choices[0]?.message.content;
          const insight = typeof content === "string" ? content : "";

          await createAiInsight({
            concept: performer.concept,
            hookType: performer.hookType || null,
            format: performer.format || null,
            insightType: "TOP_PERFORMER",
            insight: insight,
            recommendation: `Scale this concept - consistent ROAS of ${performer.roas}`,
          });

          insights.push({
            type: "TOP_PERFORMER",
            concept: performer.concept,
            insight,
          });
        }

        // Generate insights for underperformers
        for (const underperformer of input.underperformers) {
          const prompt = `Analyze this underperforming creative concept and provide diagnostic insights:

Concept: ${underperformer.concept}
Hook Type: ${underperformer.hookType || "Not specified"}
Format: ${underperformer.format || "Not specified"}
ROAS: ${underperformer.roas}
CPA: ฿${underperformer.cpa}
Number of Ads: ${underperformer.adsCount}

Provide:
1. Likely reasons for underperformance
2. Specific elements to test or change
3. Alternative hooks or formats to try
4. Decision: Should we iterate, pause, or kill this concept?

Keep the response concise and actionable.`;

          const response = await invokeLLM({
            messages: [
              {
                role: "system",
                content:
                  "You are a creative strategist analyzing Meta Ads performance data. Provide concise, diagnostic insights to improve underperforming creative concepts.",
              },
              { role: "user", content: prompt },
            ],
          });

          const content = response.choices[0]?.message.content;
          const insight = typeof content === "string" ? content : "";

          await createAiInsight({
            concept: underperformer.concept,
            hookType: underperformer.hookType || null,
            format: underperformer.format || null,
            insightType: "UNDERPERFORMER",
            insight: insight,
            recommendation: `Review and optimize - ROAS of ${underperformer.roas} below target`,
          });

          insights.push({
            type: "UNDERPERFORMER",
            concept: underperformer.concept,
            insight,
          });
        }

        return insights;
      } catch (error) {
        console.error("[Insights] Error generating insights:", error);
        throw error;
      }
    }),
});
