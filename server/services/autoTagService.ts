import { getDb } from "../db";
import { creativeLibrary } from "../../drizzle/schema";
import { isNull, isNotNull, or, sql } from "drizzle-orm";

type AutoTag = { concept: string | null; hookType: string | null };

// ─── Keyword rules derived from real Infresh ad captions ─────────────────────

export function autoTagFromCaption(caption: string): AutoTag {
  const t = caption.toLowerCase();

  // ── Concept ──────────────────────────────────────────────────────────────
  let concept: string | null = null;

  const isSocialProof = ["เราว่า", "โอเคเลย", "ลองหามาใช้", "อยากเห็นภาพหลัง", "คอมเม้น", "รีวิว"].some((k) => t.includes(k));
  const hasPromo = ["แถม", "1แถม1", "โปร 1 แถม", "โปร1แถม1"].some((k) => t.includes(k));

  if (isSocialProof) {
    concept = "SocialProof";
  } else if (hasPromo) {
    concept = "Promo1แถม1";
  } else if (
    ["ต้องไม่มีหลุมสิว", "ต้องไม่มี"].some((k) => t.includes(k)) ||
    (t.includes("infresh") && t.includes("ต้องไม่"))
  ) {
    concept = "BrandPromise";
  } else if (["หลุมสิวดูตื้น", "ดูตื้นขึ้น"].some((k) => t.includes(k))) {
    concept = "PainPoint";
  } else if (["ฟิชิน", "จากลูก", "ก่อนหลัง", "จากที่เคย"].some((k) => t.includes(k))) {
    concept = "Transformation";
  } else if (
    ["ลดทันที", "แชทมารับ"].some((k) => t.includes(k)) ||
    (t.includes("ทักแชท") && t.includes("ลด"))
  ) {
    concept = "PriceOffer";
  } else if (t.includes("หลุมสิว")) {
    concept = "PainPoint";
  }

  // ── Hook ─────────────────────────────────────────────────────────────────
  let hookType: string | null = null;

  if (["เดือนนี้เท่านั้น", "วันนี้เท่านั้น", "จำกัด", "หมดแล้ว"].some((k) => t.includes(k))) {
    hookType = "Scarcity";
  } else if (t.includes("ยังทัน") || (isSocialProof && hasPromo)) {
    hookType = "Urgency";
  } else if (["ต้องไม่", "ถ้าม่อยาก", "ถ้าอยาก"].some((k) => t.includes(k))) {
    hookType = "Shock";
  } else if (["ฟิชิน", "จากลูก", "ก่อนหลัง", "จากที่เคย"].some((k) => t.includes(k))) {
    hookType = "BeforeAfter";
  } else if (["ลดทันที", "แชทมารับ", "ส่วนลด"].some((k) => t.includes(k)) || (t.includes("ลด") && t.includes("ราคา"))) {
    hookType = "Discount";
  } else if (["คอมเม้น", "อยากเห็นภาพหลัง", "เราว่า", "ลองหามาใช้", "ดูตื้น", "รีวิว"].some((k) => t.includes(k))) {
    hookType = "Testimonial";
  }

  return { concept, hookType };
}

// ─── Apply auto-tags to all untagged ads in DB ────────────────────────────────

export async function runAutoTagging(db: NonNullable<Awaited<ReturnType<typeof getDb>>>) {
  console.log("[AutoTag] Running auto-tagging on untagged ads...");

  const rows = await db
    .select({
      creativeId: creativeLibrary.creativeId,
      caption: creativeLibrary.caption,
      concept: creativeLibrary.concept,
      hookType: creativeLibrary.hookType,
    })
    .from(creativeLibrary)
    .where(
      isNotNull(creativeLibrary.caption)
    );

  let tagged = 0;

  for (const row of rows) {
    if (!row.caption) continue;
    const alreadyTagged = row.concept && row.hookType;
    if (alreadyTagged) continue;

    const { concept, hookType } = autoTagFromCaption(row.caption);

    const update: Record<string, any> = {};
    if (!row.concept && concept) update.concept = concept;
    if (!row.hookType && hookType) update.hookType = hookType;

    if (Object.keys(update).length === 0) continue;

    await db
      .update(creativeLibrary)
      .set(update)
      .where(sql`creativeId = ${row.creativeId}`);

    tagged++;
  }

  console.log(`[AutoTag] Tagged ${tagged} ads (concept and/or hook)`);
  return tagged;
}
