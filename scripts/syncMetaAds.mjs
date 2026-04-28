#!/usr/bin/env node

/**
 * Meta Ads Sync Script
 * Pulls live data from Meta Ads MCP and syncs to database
 * Run: node scripts/syncMetaAds.mjs
 */

import { exec } from "child_process";
import { promisify } from "util";
import mysql from "mysql2/promise";

const execAsync = promisify(exec);

const META_AD_ACCOUNTS = [
  { id: "act_790515286671002", name: "idee 06" },
  { id: "act_1167175972155988", name: "idee 05" },
  { id: "act_664116972397842", name: "idee 03" },
  { id: "act_890040690415091", name: "idee 07" },
];

// Database connection
async function getConnection() {
  // Parse DATABASE_URL if available
  const dbUrl = process.env.DATABASE_URL;
  if (dbUrl) {
    // Parse MySQL connection string: mysql://user:password@host:port/database
    let urlString = dbUrl;
    if (dbUrl.startsWith("mysql+ssl://")) {
      urlString = dbUrl.replace("mysql+ssl://", "mysql://");
    }
    const url = new URL(urlString);
    const connection = await mysql.createConnection({
      host: url.hostname,
      user: url.username,
      password: url.password,
      database: url.pathname.slice(1),
      port: parseInt(url.port || "3306"),
      ssl: {}, // TiDB requires SSL
    });
    return connection;
  }

  // Fallback to individual env vars
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || "localhost",
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASSWORD || "",
    database: process.env.DB_NAME || "creative_intelligence",
  });
  return connection;
}

/**
 * Fetch ads from Meta Ads MCP for a specific account
 */
async function fetchAdsFromMeta(accountId) {
  try {
    console.log(`[MetaSync] Fetching ads for account: ${accountId}`);
    const { stdout } = await execAsync(
      `manus-mcp-cli tool call meta_marketing_get_ads --server meta-marketing --input '{"account_id": "${accountId}"}'`
    );

    const result = JSON.parse(stdout);
    console.log(`[MetaSync] Found ${result.ads?.length || 0} ads for ${accountId}`);
    return result.ads || [];
  } catch (error) {
    console.error(`[MetaSync] Error fetching ads for ${accountId}:`, error.message);
    return [];
  }
}

/**
 * Sync all Meta Ads accounts
 */
async function syncAllAccounts() {
  let connection;
  try {
    connection = await getConnection();
    let totalAdsSynced = 0;

    for (const account of META_AD_ACCOUNTS) {
      console.log(`\n[MetaSync] Syncing account: ${account.name} (${account.id})`);

      try {
        const ads = await fetchAdsFromMeta(account.id);

        if (!ads || ads.length === 0) {
          console.log(`[MetaSync] No ads found for ${account.name}`);
          continue;
        }

        // Insert/update ads in database
        for (const ad of ads) {
          try {
            const spend = parseFloat(ad.spend || "0");
            const impressions = parseInt(ad.impressions || "0");
            const clicks = parseInt(ad.clicks || "0");
            const reach = parseInt(ad.reach || "0");
            const roas = ad.roas ? parseFloat(ad.roas) : 0;
            const cpa = ad.cpa ? parseFloat(ad.cpa) : 0;
            const cpm = impressions > 0 ? (spend / impressions) * 1000 : 0;

            // Insert or update ad performance
            await connection.execute(
              `INSERT INTO ads_performance (adId, accountId, adName, spend, roas, cpa, impressions, reach, clicks, cpm, metricDate)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
               ON DUPLICATE KEY UPDATE
               spend = VALUES(spend),
               roas = VALUES(roas),
               cpa = VALUES(cpa),
               impressions = VALUES(impressions),
               reach = VALUES(reach),
               clicks = VALUES(clicks),
               cpm = VALUES(cpm),
               updatedAt = NOW()`,
              [ad.id, account.id, ad.name || ad.id, spend, roas, cpa, impressions, reach, clicks, cpm]
            );

            // Insert or update creative library
            const caption = ad.adset_name || "";
            const creativeUrl = ad.creative_url || "";

            await connection.execute(
              `INSERT INTO creative_library (creativeId, adId, caption, creativeUrl)
               VALUES (?, ?, ?, ?)
               ON DUPLICATE KEY UPDATE
               caption = VALUES(caption),
               creativeUrl = VALUES(creativeUrl),
               updatedAt = NOW()`,
              [`${ad.id}_creative`, ad.id, caption, creativeUrl]
            );

            totalAdsSynced++;
          } catch (adError) {
            console.error(`[MetaSync] Error processing ad ${ad.id}:`, adError.message);
          }
        }

        console.log(`[MetaSync] Synced ${ads.length} ads from ${account.name}`);
      } catch (accountError) {
        console.error(`[MetaSync] Error syncing account ${account.name}:`, accountError.message);
      }
    }

    console.log(`\n✓ Sync complete: ${totalAdsSynced} ads synced from ${META_AD_ACCOUNTS.length} accounts`);
    return { success: true, totalAdsSynced };
  } catch (error) {
    console.error("[MetaSync] Fatal error:", error);
    return { success: false, error: error.message };
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

// Run sync
syncAllAccounts().then((result) => {
  process.exit(result.success ? 0 : 1);
});
