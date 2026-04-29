import { decimal, int, mysqlEnum, mysqlTable, text, timestamp, varchar, date } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 * Extend this file with additional tables as your product grows.
 * Columns use camelCase to match both database fields and generated types.
 */
export const users = mysqlTable("users", {
  /**
   * Surrogate primary key. Auto-incremented numeric value managed by the database.
   * Use this for relations between tables.
   */
  id: int("id").autoincrement().primaryKey(),
  /** Manus OAuth identifier (openId) returned from the OAuth callback. Unique per user. */
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * Ads performance data from Meta Ads API
 * Stores performance metrics for each ad at the ad level
 */
export const adsPerformance = mysqlTable("ads_performance", {
  id: int("id").autoincrement().primaryKey(),
  adId: varchar("adId", { length: 64 }).notNull().unique(),
  adName: varchar("adName", { length: 255 }).notNull(),
  campaignName: varchar("campaignName", { length: 255 }),
  campaignId: varchar("campaignId", { length: 64 }),
  adsetId: varchar("adsetId", { length: 64 }),
  accountId: varchar("accountId", { length: 64 }).notNull(),
  spend: decimal("spend", { precision: 12, scale: 2 }).notNull(),
  impressions: int("impressions").default(0),
  clicks: int("clicks").default(0),
  purchases: int("purchases").default(0),
  revenue: decimal("revenue", { precision: 12, scale: 2 }).default("0"),
  cpa: decimal("cpa", { precision: 12, scale: 2 }),
  roas: decimal("roas", { precision: 12, scale: 4 }),
  cpm: decimal("cpm", { precision: 12, scale: 2 }),
  reach: int("reach").default(0),
  metricDate: date("metricDate").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type AdsPerformance = typeof adsPerformance.$inferSelect;
export type InsertAdsPerformance = typeof adsPerformance.$inferInsert;

/**
 * Creative library with manual tagging
 * Stores creative assets and their concept/persona/hook/format tags
 */
export const creativeLibrary = mysqlTable("creative_library", {
  id: int("id").autoincrement().primaryKey(),
  creativeId: varchar("creativeId", { length: 64 }).notNull().unique(),
  adId: varchar("adId", { length: 64 }).notNull(),
  creativeUrl: text("creativeUrl"),
  thumbnailUrl: text("thumbnailUrl"),
  caption: text("caption"),
  concept: varchar("concept", { length: 255 }),
  persona: varchar("persona", { length: 255 }),
  hookType: varchar("hookType", { length: 255 }),
  format: varchar("format", { length: 255 }),
  notes: text("notes"),
  status: mysqlEnum("status", ["NEED_TAGGING", "READY"]).default("NEED_TAGGING"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type CreativeLibrary = typeof creativeLibrary.$inferSelect;
export type InsertCreativeLibrary = typeof creativeLibrary.$inferInsert;

/**
 * Concept summary aggregating performance by concept
 * Materialized view for dashboard KPIs
 */
export const conceptSummary = mysqlTable("concept_summary", {
  id: int("id").autoincrement().primaryKey(),
  concept: varchar("concept", { length: 255 }).notNull().unique(),
  totalSpend: decimal("totalSpend", { precision: 12, scale: 2 }).default("0"),
  avgRoas: decimal("avgRoas", { precision: 12, scale: 4 }),
  avgCpa: decimal("avgCpa", { precision: 12, scale: 2 }),
  adsCount: int("adsCount").default(0),
  decision: mysqlEnum("decision", ["SCALE", "ITERATE", "KILL"]),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type ConceptSummary = typeof conceptSummary.$inferSelect;
export type InsertConceptSummary = typeof conceptSummary.$inferInsert;

/**
 * AI-generated insights for top and bottom performers
 */
export const aiInsights = mysqlTable("ai_insights", {
  id: int("id").autoincrement().primaryKey(),
  concept: varchar("concept", { length: 255 }),
  hookType: varchar("hookType", { length: 255 }),
  format: varchar("format", { length: 255 }),
  insightType: mysqlEnum("insightType", ["TOP_PERFORMER", "UNDERPERFORMER"]).notNull(),
  insight: text("insight").notNull(),
  recommendation: text("recommendation"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type AiInsights = typeof aiInsights.$inferSelect;
export type InsertAiInsights = typeof aiInsights.$inferInsert;

/**
 * Weekly digest tracking for email automation
 */
export const weeklyDigests = mysqlTable("weekly_digests", {
  id: int("id").autoincrement().primaryKey(),
  weekStartDate: date("weekStartDate").notNull(),
  topConcepts: text("topConcepts"),
  budgetAllocation: text("budgetAllocation"),
  underperformers: text("underperformers"),
  sentAt: timestamp("sentAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type WeeklyDigests = typeof weeklyDigests.$inferSelect;
export type InsertWeeklyDigests = typeof weeklyDigests.$inferInsert;