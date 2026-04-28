import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { getWeeklyDigests, createWeeklyDigest, getConceptSummary } from "../db";
import { notifyOwner } from "../_core/notification";

/**
 * Weekly Digest router
 * Handles generation and sending of weekly email digests
 */
export const digestRouter = router({
  /**
   * Get recent weekly digests
   */
  getDigests: protectedProcedure
    .input(
      z.object({
        limit: z.number().optional().default(10),
      })
    )
    .query(async ({ input }) => {
      return getWeeklyDigests(input.limit);
    }),

  /**
   * Generate and send weekly digest
   * This would typically be called by a scheduled task
   */
  generateWeeklyDigest: protectedProcedure.mutation(async ({ ctx }) => {
    try {
      // Get concept summary data
      const concepts = await getConceptSummary();

      if (!concepts || concepts.length === 0) {
        return { success: false, message: "No concept data available" };
      }

      // Sort by ROAS to get top performers
      const topConcepts = concepts
        .sort((a, b) => parseFloat(b.avgRoas || "0") - parseFloat(a.avgRoas || "0"))
        .slice(0, 5);

      // Calculate total spend and budget allocation
      const totalSpend = concepts.reduce((sum, c) => sum + parseFloat(c.totalSpend || "0"), 0);
      const topConceptsSpend = topConcepts.reduce((sum, c) => sum + parseFloat(c.totalSpend || "0"), 0);
      const budgetAllocationPercentage = totalSpend > 0 ? (topConceptsSpend / totalSpend) * 100 : 0;

      // Get underperformers (bottom 3 by ROAS)
      const underperformers = concepts
        .sort((a, b) => {
          const aRoas = parseFloat(a.avgRoas || "0");
          const bRoas = parseFloat(b.avgRoas || "0");
          return aRoas - bRoas;
        })
        .slice(0, 3);

      // Build digest content
      const digestContent = {
        weekStartDate: new Date(new Date().setDate(new Date().getDate() - new Date().getDay())),
        topConcepts: JSON.stringify(
          topConcepts.map((c) => ({
            concept: c.concept,
            roas: c.avgRoas,
            cpa: c.avgCpa,
            spend: c.totalSpend,
            adsCount: c.adsCount,
          }))
        ),
        budgetAllocation: JSON.stringify({
          topConceptsPercentage: budgetAllocationPercentage.toFixed(1),
          totalSpend: totalSpend.toFixed(2),
          recommendation: budgetAllocationPercentage > 70 ? "✓ On track" : "⚠ Consider reallocating",
        }),
        underperformers: JSON.stringify(
          underperformers.map((c) => {
            const roas = parseFloat(c.avgRoas || "0");
            return {
              concept: c.concept,
              roas: roas.toFixed(2),
              cpa: c.avgCpa,
              recommendation: roas < 2 ? "PAUSE" : "ITERATE",
            };
          })
        ),
      };

      // Save digest to database
      await createWeeklyDigest({
        weekStartDate: digestContent.weekStartDate,
        topConcepts: digestContent.topConcepts,
        budgetAllocation: digestContent.budgetAllocation,
        underperformers: digestContent.underperformers,
        sentAt: new Date(),
      });

      // Send email notification to owner
      const emailContent = `
<h2>Weekly Creative Intelligence Report</h2>
<p>Week of ${digestContent.weekStartDate.toLocaleDateString()}</p>

<h3>🏆 Top Performing Concepts</h3>
<ul>
${topConcepts.map((c) => `<li><strong>${c.concept}</strong> - ROAS: ${c.avgRoas}, CPA: ฿${c.avgCpa}</li>`).join("")}
</ul>

<h3>💰 Budget Allocation</h3>
<p>Top concepts receiving <strong>${budgetAllocationPercentage.toFixed(1)}%</strong> of total budget</p>
<p>Total Spend: <strong>฿${totalSpend.toLocaleString("th-TH", { maximumFractionDigits: 0 })}</strong></p>

<h3>⚠️ Needs Review</h3>
<ul>
${underperformers.map((c) => {
        const roas = parseFloat(c.avgRoas || "0");
        return `<li><strong>${c.concept}</strong> - ROAS: ${roas.toFixed(2)} (${roas < 2 ? "PAUSE" : "ITERATE"})</li>`;
      }).join("")}
</ul>

<p><a href="${process.env.VITE_FRONTEND_FORGE_API_URL || "https://app.manus.im"}/dashboard">View Full Dashboard</a></p>
      `;

      await notifyOwner({
        title: "Weekly Creative Intelligence Report",
        content: emailContent,
      });

      return {
        success: true,
        message: "Weekly digest generated and sent",
        digest: digestContent,
      };
    } catch (error) {
      console.error("[Digest] Error generating digest:", error);
      throw error;
    }
  }),
});
