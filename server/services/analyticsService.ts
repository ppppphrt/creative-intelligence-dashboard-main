import { getDb } from "../db";
import { sql } from "drizzle-orm";

type Row = Record<string, any>;

// db.execute() returns [rows, fields] — extract just the rows
async function query(db: any, q: any): Promise<Row[]> {
  const result = await db.execute(q);
  return (Array.isArray(result[0]) ? result[0] : result) as Row[];
}

function accountFilter(suffix?: string) {
  if (!suffix) return sql`1=1`;
  return sql`ap.accountId LIKE ${`%${suffix}`}`;
}

function dateFilter(dateFrom?: string, dateTo?: string) {
  if (dateFrom && dateTo) return sql`ap.metricDate BETWEEN ${dateFrom} AND ${dateTo}`;
  if (dateFrom) return sql`ap.metricDate >= ${dateFrom}`;
  if (dateTo)   return sql`ap.metricDate <= ${dateTo}`;
  return sql`1=1`;
}

export async function getConceptAnalytics(accountSuffix?: string, dateFrom?: string, dateTo?: string) {
  const db = await getDb();
  if (!db) return [];
  try {
    return await query(db, sql`
      SELECT cl.concept,
        COUNT(DISTINCT ap.adId) as adsCount,
        SUM(ap.spend)           as totalSpend,
        AVG(ap.roas)            as avgRoas,
        AVG(ap.cpa)             as avgCpa,
        SUM(ap.impressions)     as totalImpressions,
        SUM(ap.clicks)          as totalClicks
      FROM ads_performance ap
      LEFT JOIN creative_library cl ON ap.adId = cl.adId
      WHERE cl.concept IS NOT NULL AND ${accountFilter(accountSuffix)} AND ${dateFilter(dateFrom, dateTo)}
      GROUP BY cl.concept
      ORDER BY avgRoas DESC
    `);
  } catch (e) { console.error("[Analytics] concept:", e); return []; }
}

export async function getHookAnalytics(accountSuffix?: string, dateFrom?: string, dateTo?: string) {
  const db = await getDb();
  if (!db) return [];
  try {
    return await query(db, sql`
      SELECT cl.hookType,
        COUNT(DISTINCT ap.adId) as adsCount,
        SUM(ap.spend)           as totalSpend,
        AVG(ap.roas)            as avgRoas,
        AVG(ap.cpa)             as avgCpa,
        SUM(ap.impressions)     as totalImpressions,
        SUM(ap.clicks)          as totalClicks
      FROM ads_performance ap
      LEFT JOIN creative_library cl ON ap.adId = cl.adId
      WHERE cl.hookType IS NOT NULL AND ${accountFilter(accountSuffix)} AND ${dateFilter(dateFrom, dateTo)}
      GROUP BY cl.hookType
      ORDER BY avgRoas DESC
    `);
  } catch (e) { console.error("[Analytics] hook:", e); return []; }
}

export async function getFormatAnalytics(accountSuffix?: string, dateFrom?: string, dateTo?: string) {
  const db = await getDb();
  if (!db) return [];
  try {
    return await query(db, sql`
      SELECT cl.format,
        COUNT(DISTINCT ap.adId) as adsCount,
        SUM(ap.spend)           as totalSpend,
        AVG(ap.roas)            as avgRoas,
        AVG(ap.cpa)             as avgCpa,
        SUM(ap.impressions)     as totalImpressions,
        SUM(ap.clicks)          as totalClicks
      FROM ads_performance ap
      LEFT JOIN creative_library cl ON ap.adId = cl.adId
      WHERE cl.format IS NOT NULL AND ${accountFilter(accountSuffix)} AND ${dateFilter(dateFrom, dateTo)}
      GROUP BY cl.format
      ORDER BY avgRoas DESC
    `);
  } catch (e) { console.error("[Analytics] format:", e); return []; }
}

export async function getPersonaAnalytics(accountSuffix?: string, dateFrom?: string, dateTo?: string) {
  const db = await getDb();
  if (!db) return [];
  try {
    return await query(db, sql`
      SELECT cl.persona,
        COUNT(DISTINCT ap.adId) as adsCount,
        SUM(ap.spend)           as totalSpend,
        AVG(ap.roas)            as avgRoas,
        AVG(ap.cpa)             as avgCpa,
        SUM(ap.impressions)     as totalImpressions,
        SUM(ap.clicks)          as totalClicks
      FROM ads_performance ap
      LEFT JOIN creative_library cl ON ap.adId = cl.adId
      WHERE cl.persona IS NOT NULL AND ${accountFilter(accountSuffix)} AND ${dateFilter(dateFrom, dateTo)}
      GROUP BY cl.persona
      ORDER BY avgRoas DESC
    `);
  } catch (e) { console.error("[Analytics] persona:", e); return []; }
}

export async function getTagSuggestions() {
  const db = await getDb();
  if (!db) return { concepts: [], hooks: [], personas: [], formats: [] };
  try {
    const [concepts, hooks, personas, formats] = await Promise.all([
      query(db, sql`SELECT DISTINCT concept  FROM creative_library WHERE concept  IS NOT NULL ORDER BY concept`),
      query(db, sql`SELECT DISTINCT hookType FROM creative_library WHERE hookType IS NOT NULL ORDER BY hookType`),
      query(db, sql`SELECT DISTINCT persona  FROM creative_library WHERE persona  IS NOT NULL ORDER BY persona`),
      query(db, sql`SELECT DISTINCT format   FROM creative_library WHERE format   IS NOT NULL ORDER BY format`),
    ]);
    return {
      concepts: concepts.map((r) => r.concept  as string),
      hooks:    hooks.map((r)    => r.hookType as string),
      personas: personas.map((r) => r.persona  as string),
      formats:  formats.map((r)  => r.format   as string),
    };
  } catch { return { concepts: [], hooks: [], personas: [], formats: [] }; }
}

export async function getRankedAds(
  sortBy: "roas" | "cpa" | "spend" | "purchases" = "roas",
  limit = 200,
  accountSuffix?: string,
  dateFrom?: string,
  dateTo?: string,
) {
  const db = await getDb();
  if (!db) return [];

  const orderCol =
    sortBy === "cpa"       ? "ap.cpa ASC" :
    sortBy === "spend"     ? "ap.spend DESC" :
    sortBy === "purchases" ? "ap.purchases DESC" :
                             "ap.roas DESC";

  try {
    return await query(db, sql`
      SELECT
        ap.adId, ap.adName, ap.accountId,
        ap.spend, ap.roas, ap.cpa, ap.cpm,
        ap.impressions, ap.reach, ap.clicks, ap.purchases, ap.revenue,
        cl.concept, cl.persona, cl.hookType, cl.format,
        cl.thumbnailUrl, cl.creativeUrl, cl.caption, cl.notes, cl.status
      FROM ads_performance ap
      LEFT JOIN creative_library cl ON ap.adId = cl.adId
      WHERE ap.spend > 0 AND ${accountFilter(accountSuffix)} AND ${dateFilter(dateFrom, dateTo)}
      ORDER BY ${sql.raw(orderCol)}
      LIMIT ${limit}
    `);
  } catch (e) { console.error("[Analytics] ranked:", e); return []; }
}

export async function getTopPerformingAds(limit = 10) {
  const db = await getDb();
  if (!db) return [];
  try {
    return await query(db, sql`
      SELECT ap.adId, ap.adName, ap.spend, ap.roas, ap.cpa,
             ap.impressions, ap.clicks,
             cl.concept, cl.persona, cl.hookType, cl.format
      FROM ads_performance ap
      LEFT JOIN creative_library cl ON ap.adId = cl.adId
      ORDER BY ap.roas DESC
      LIMIT ${limit}
    `);
  } catch (e) { console.error("[Analytics] top:", e); return []; }
}

export async function getUnderperformingAds(limit = 10) {
  const db = await getDb();
  if (!db) return [];
  try {
    return await query(db, sql`
      SELECT ap.adId, ap.adName, ap.spend, ap.roas, ap.cpa,
             ap.impressions, ap.clicks,
             cl.concept, cl.persona, cl.hookType, cl.format
      FROM ads_performance ap
      LEFT JOIN creative_library cl ON ap.adId = cl.adId
      WHERE ap.spend > 0 AND ap.roas < 2.0
      ORDER BY ap.roas ASC
      LIMIT ${limit}
    `);
  } catch (e) { console.error("[Analytics] underperform:", e); return []; }
}
