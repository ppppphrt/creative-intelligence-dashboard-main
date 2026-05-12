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
import { refreshAdCreative } from "../services/metaDirectService";

const filterInput = z.object({
  accountSuffix: z.string().optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
}).optional();

export const analyticsRouter = router({
  getConceptAnalytics: protectedProcedure
    .input(filterInput)
    .query(async ({ input }) => getConceptAnalytics(input?.accountSuffix, input?.dateFrom, input?.dateTo)),

  getHookAnalytics: protectedProcedure
    .input(filterInput)
    .query(async ({ input }) => getHookAnalytics(input?.accountSuffix, input?.dateFrom, input?.dateTo)),

  getFormatAnalytics: protectedProcedure
    .input(filterInput)
    .query(async ({ input }) => getFormatAnalytics(input?.accountSuffix, input?.dateFrom, input?.dateTo)),

  getPersonaAnalytics: protectedProcedure
    .input(filterInput)
    .query(async ({ input }) => getPersonaAnalytics(input?.accountSuffix, input?.dateFrom, input?.dateTo)),

  getTopPerformingAds: protectedProcedure.query(async () => getTopPerformingAds(10)),

  getUnderperformingAds: protectedProcedure.query(async () => getUnderperformingAds(10)),

  getTagSuggestions: protectedProcedure.query(async () => getTagSuggestions()),

  getRankedAds: protectedProcedure
    .input(z.object({
      sortBy: z.enum(["roas", "cpa", "spend", "purchases"]).default("roas"),
      limit: z.number().default(200),
      accountSuffix: z.string().optional(),
      dateFrom: z.string().optional(),
      dateTo: z.string().optional(),
    }))
    .query(async ({ input }) =>
      getRankedAds(input.sortBy, input.limit, input.accountSuffix, input.dateFrom, input.dateTo)
    ),

  refreshCreativeThumbnail: protectedProcedure
    .input(z.object({ adId: z.string() }))
    .mutation(async ({ input }) => refreshAdCreative(input.adId)),
});
