import { z } from "zod";
import { publicProcedure, protectedProcedure, router } from "../_core/trpc";
import {
  getAdsByAccountId,
  getCreativeLibraryItems,
  getCreativeByAdId,
  updateCreativeTags,
  createCreativeLibraryItem,
  getConceptSummary,
} from "../db";

/**
 * Meta Ads integration router
 * Handles fetching ads, managing creative library, and tagging
 */
export const metaRouter = router({
  /**
   * Fetch ads from Meta for a given account
   * In production, this would call the Meta Ads MCP connector
   */
  getAds: protectedProcedure
    .input(
      z.object({
        accountId: z.string(),
        limit: z.number().optional().default(100),
      })
    )
    .query(async ({ input }) => {
      // TODO: Call Meta Ads MCP to fetch ads
      // For now, return from database
      return getAdsByAccountId(input.accountId, input.limit);
    }),

  /**
   * Get creative library with all tags
   */
  getCreativeLibrary: protectedProcedure
    .input(
      z.object({
        limit: z.number().optional().default(100),
      })
    )
    .query(async ({ input }) => {
      return getCreativeLibraryItems(input.limit);
    }),

  /**
   * Update creative tags (Concept, Persona, Hook, Format)
   */
  updateTags: protectedProcedure
    .input(
      z.object({
        creativeId: z.string(),
        concept: z.string().optional().nullable(),
        persona: z.string().optional().nullable(),
        hookType: z.string().optional().nullable(),
        format: z.string().optional().nullable(),
        notes: z.string().optional().nullable(),
      })
    )
    .mutation(async ({ input }) => {
      const { creativeId, ...tags } = input;
      return updateCreativeTags(creativeId, tags);
    }),

  /**
   * Get concept summary for dashboard KPIs
   */
  getConceptSummary: protectedProcedure.query(async () => {
    return getConceptSummary();
  }),
});
