import { protectedProcedure, router } from "../_core/trpc";
import { syncAllAccountsWithForge } from "../services/metaAdsForgeService";
import { getDb } from "../db";
import { adsPerformance } from "../../drizzle/schema";
import { runAutoTagging } from "../services/autoTagService";
import { eq } from "drizzle-orm";

/**
 * Meta Ads Sync Router
 * Handles syncing Meta Ads data to the database
 */

const META_AD_ACCOUNTS = [
  { id: "790515286671002", name: "idee 06" },
  { id: "1167175972155988", name: "idee 05" },
  { id: "664116972397842", name: "idee 03" },
  { id: "890040690415091", name: "idee 07" },
];

export const metaSyncRouter = router({
  /**
   * Get configured Meta Ads accounts
   */
  getConfiguredAccounts: protectedProcedure.query(async () => {
    return META_AD_ACCOUNTS.map(account => ({
      id: account.id,
      name: account.name,
      status: "connected",
      adsSynced: 0,
      lastSync: null,
    }));
  }),

  /**
   * Sync all accounts with real Meta Ads data via Forge API
   */
  syncAllAccounts: protectedProcedure.mutation(async () => {
    return await syncAllAccountsWithForge();
  }),

  /**
   * Run auto-tagging on existing ads using caption keyword rules (no re-sync needed)
   */
  runAutoTag: protectedProcedure.mutation(async () => {
    const db = await getDb();
    if (!db) return { success: false, tagged: 0 };
    const tagged = await runAutoTagging(db);
    return { success: true, tagged };
  }),

  /**
   * Get sync status for all accounts
   */
  getSyncStatus: protectedProcedure.query(async () => {
    const db = await getDb();
    if (!db) {
      return META_AD_ACCOUNTS.map(account => ({
        accountId: account.id,
        accountName: account.name,
        adsSynced: 0,
        lastSync: null,
      }));
    }

    try {
      const statuses = [];

      for (const account of META_AD_ACCOUNTS) {
        try {
          const result = await db
            .select()
            .from(adsPerformance)
            .where(eq(adsPerformance.accountId, `act_${account.id}`));

          const adsCount = result?.length || 0;
          const lastSync = result && result.length > 0 ? result[0]?.updatedAt : null;

          statuses.push({
            accountId: account.id,
            accountName: account.name,
            adsSynced: adsCount,
            lastSync,
          });
        } catch (error) {
          console.error(`[MetaSync] Error getting status for ${account.name}:`, error);
          statuses.push({
            accountId: account.id,
            accountName: account.name,
            adsSynced: 0,
            lastSync: null,
          });
        }
      }

      return statuses;
    } catch (error) {
      console.error("[MetaSync] Error getting sync status:", error);
      return META_AD_ACCOUNTS.map(account => ({
        accountId: account.id,
        accountName: account.name,
        adsSynced: 0,
        lastSync: null,
      }));
    }
  }),
});
