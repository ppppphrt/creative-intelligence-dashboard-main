import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import {
  InsertUser,
  users,
  adsPerformance,
  creativeLibrary,
  conceptSummary,
  InsertConceptSummary,
  aiInsights,
  InsertAiInsights,
  weeklyDigests,
  InsertWeeklyDigests,
} from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;

// Lazily create the drizzle instance so local tooling can run without a DB.
export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      const url = process.env.DATABASE_URL;
      const isTiDB = url.includes("tidbcloud.com");
      const pool = mysql.createPool({
        uri: url,
        ssl: isTiDB ? {} : { rejectUnauthorized: false },
        waitForConnections: true,
        connectionLimit: 10,
      });
      _db = drizzle(pool);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = 'admin';
      updateSet.role = 'admin';
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

export async function getAdsByAccountId(accountId: string, limit = 100) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(adsPerformance).where(eq(adsPerformance.accountId, accountId)).limit(limit);
}

export async function getCreativeLibraryItems(limit = 100) {
  const db = await getDb();
  if (!db) return [];
  
  // Join creative library with ads performance to get metrics
  const result = await db
    .select({
      creativeId: creativeLibrary.creativeId,
      adId: creativeLibrary.adId,
      caption: creativeLibrary.caption,
      creativeUrl: creativeLibrary.creativeUrl,
      thumbnailUrl: creativeLibrary.thumbnailUrl,
      concept: creativeLibrary.concept,
      persona: creativeLibrary.persona,
      hookType: creativeLibrary.hookType,
      format: creativeLibrary.format,
      status: creativeLibrary.status,
      adName: adsPerformance.adName,
      spend: adsPerformance.spend,
      roas: adsPerformance.roas,
      cpa: adsPerformance.cpa,
      impressions: adsPerformance.impressions,
      reach: adsPerformance.reach,
      clicks: adsPerformance.clicks,
      cpm: adsPerformance.cpm,
    })
    .from(creativeLibrary)
    .leftJoin(adsPerformance, eq(creativeLibrary.adId, adsPerformance.adId))
    .limit(limit);
  
  return result;
}

export async function getCreativeByAdId(adId: string) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(creativeLibrary).where(eq(creativeLibrary.adId, adId)).limit(1);
  return result.length > 0 ? result[0] : null;
}

export async function updateCreativeTags(
  creativeId: string,
  tags: {
    concept?: string | null;
    persona?: string | null;
    hookType?: string | null;
    format?: string | null;
    status?: 'NEED_TAGGING' | 'READY';
  }
) {
  const db = await getDb();
  if (!db) return null;
  const updateData: any = { updatedAt: new Date() };
  if (tags.concept !== undefined) updateData.concept = tags.concept;
  if (tags.persona !== undefined) updateData.persona = tags.persona;
  if (tags.hookType !== undefined) updateData.hookType = tags.hookType;
  if (tags.format !== undefined) updateData.format = tags.format;
  if (tags.status !== undefined) updateData.status = tags.status;
  return db.update(creativeLibrary).set(updateData).where(eq(creativeLibrary.creativeId, creativeId));
}

export async function createCreativeLibraryItem(data: any) {
  const db = await getDb();
  if (!db) return null;
  return db.insert(creativeLibrary).values(data);
}

export async function getConceptSummary() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(conceptSummary);
}

export async function upsertConceptSummary(
  concept: string,
  data: Partial<InsertConceptSummary>
) {
  const db = await getDb();
  if (!db) return null;
  return db.insert(conceptSummary).values({ concept, ...data } as any).onDuplicateKeyUpdate({
    set: data,
  });
}

export async function getAiInsights(insightType?: string) {
  const db = await getDb();
  if (!db) return [];
  if (insightType) {
    return db.select().from(aiInsights).where(eq(aiInsights.insightType, insightType as any));
  }
  return db.select().from(aiInsights);
}

export async function createAiInsight(data: InsertAiInsights) {
  const db = await getDb();
  if (!db) return null;
  return db.insert(aiInsights).values(data);
}

export async function getWeeklyDigests(limit = 10) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(weeklyDigests).limit(limit);
}

export async function createWeeklyDigest(data: InsertWeeklyDigests) {
  const db = await getDb();
  if (!db) return null;
  return db.insert(weeklyDigests).values(data);
}
