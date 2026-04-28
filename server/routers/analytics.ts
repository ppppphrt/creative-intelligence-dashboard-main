import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import {
  getConceptAnalytics,
  getHookAnalytics,
  getFormatAnalytics,
  getPersonaAnalytics,
  getTopPerformingAds,
  getUnderperformingAds,
  getRankedAds,
  getTagSuggestions,
} from "../services/analyticsService";

/**
 * Analytics router
 * Provides aggregated performance data for dashboard analytics views
 */
export const analyticsRouter = router({
  /**
   * Get performance aggregated by concept
   */
  getConceptAnalytics: protectedProcedure.query(async () => {
    return getConceptAnalytics();
  }),

  /**
   * Get performance aggregated by hook type
   */
  getHookAnalytics: protectedProcedure.query(async () => {
    return getHookAnalytics();
  }),

  /**
   * Get performance aggregated by format
   */
  getFormatAnalytics: protectedProcedure.query(async () => {
    return getFormatAnalytics();
  }),

  /**
   * Get performance aggregated by persona
   */
  getPersonaAnalytics: protectedProcedure.query(async () => {
    return getPersonaAnalytics();
  }),

  /**
   * Get top performing ads
   */
  getTopPerformingAds: protectedProcedure.query(async () => {
    return getTopPerformingAds(10);
  }),

  /**
   * Get underperforming ads
   */
  getUnderperformingAds: protectedProcedure.query(async () => {
    return getUnderperformingAds(10);
  }),

  /**
   * Get distinct tag values for autocomplete
   */
  getTagSuggestions: protectedProcedure.query(async () => {
    return getTagSuggestions();
  }),

  /**
   * Get all ads ranked by a chosen metric
   */
  getRankedAds: protectedProcedure
    .input(z.object({
      sortBy: z.enum(["roas", "cpa", "spend", "impressions"]).default("roas"),
      limit: z.number().default(200),
    }))
    .query(async ({ input }) => {
      return getRankedAds(input.sortBy, input.limit);
    }),
});
