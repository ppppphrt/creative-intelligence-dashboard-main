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

const brandInput = z.object({ accountSuffix: z.string().optional() });

export const analyticsRouter = router({
  getConceptAnalytics: protectedProcedure
    .input(brandInput.optional())
    .query(async ({ input }) => getConceptAnalytics(input?.accountSuffix)),

  getHookAnalytics: protectedProcedure
    .input(brandInput.optional())
    .query(async ({ input }) => getHookAnalytics(input?.accountSuffix)),

  getFormatAnalytics: protectedProcedure
    .input(brandInput.optional())
    .query(async ({ input }) => getFormatAnalytics(input?.accountSuffix)),

  getPersonaAnalytics: protectedProcedure
    .input(brandInput.optional())
    .query(async ({ input }) => getPersonaAnalytics(input?.accountSuffix)),

  getTopPerformingAds: protectedProcedure.query(async () => getTopPerformingAds(10)),

  getUnderperformingAds: protectedProcedure.query(async () => getUnderperformingAds(10)),

  getTagSuggestions: protectedProcedure.query(async () => getTagSuggestions()),

  getRankedAds: protectedProcedure
    .input(z.object({
      sortBy: z.enum(["roas", "cpa", "spend", "impressions"]).default("roas"),
      limit: z.number().default(200),
      accountSuffix: z.string().optional(),
    }))
    .query(async ({ input }) => getRankedAds(input.sortBy, input.limit, input.accountSuffix)),
});
