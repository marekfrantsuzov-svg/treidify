"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db, schema } from "../db";
import { requireUser } from "../session";
import type { ActionResult } from "./settings";

const S = schema;
const tags = z.array(z.string().trim().min(1).max(32)).max(12).transform((xs) => [...new Set(xs.map((x) => x.toLowerCase()))]);
const entrySchema = z.object({
  tradeId: z.string().uuid(),
  notes: z.string().trim().max(4000).default(""),
  lessons: z.string().trim().max(2000).default(""),
  setupTags: tags.default([]),
  mistakeTags: tags.default([]),
});

/** Saves the user's own notes and tags for one of their own closed trades. */
export async function saveJournalEntry(input: z.input<typeof entrySchema>): Promise<ActionResult> {
  const s = await requireUser();
  const p = entrySchema.safeParse(input);
  if (!p.success) return { ok: false, error: p.error.issues[0]?.message ?? "Please check the entry." };
  const { tradeId, notes, lessons, setupTags, mistakeTags } = p.data;
  // Ownership: the trade must belong to an account owned by this user.
  const [own] = await db.select({ id: S.closedTrade.id }).from(S.closedTrade)
    .innerJoin(S.tradingAccount, eq(S.tradingAccount.id, S.closedTrade.tradingAccountId))
    .where(and(eq(S.closedTrade.id, tradeId), eq(S.tradingAccount.userId, s.user.id))).limit(1);
  if (!own) return { ok: false, error: "Trade not found." };
  const values = { notes: notes || null, lessons: lessons || null, setupTags, mistakeTags };
  await db.insert(S.journalEntry).values({ userId: s.user.id, closedTradeId: tradeId, ...values })
    .onConflictDoUpdate({ target: [S.journalEntry.userId, S.journalEntry.closedTradeId], set: { ...values, updatedAt: new Date() } });
  revalidatePath("/app/journal");
  return { ok: true, message: "Journal entry saved." };
}

const SHOT_TYPES = ["image/png", "image/jpeg", "image/webp"];
const SHOT_MAX_IN = 8 * 1024 * 1024;
const SHOTS_PER_TRADE = 4;

async function ownTrade(userId: string, tradeId: string) {
  const [own] = await db.select({ id: S.closedTrade.id }).from(S.closedTrade)
    .innerJoin(S.tradingAccount, eq(S.tradingAccount.id, S.closedTrade.tradingAccountId))
    .where(and(eq(S.closedTrade.id, tradeId), eq(S.tradingAccount.userId, userId))).limit(1);
  return !!own;
}

/** Attaches a screenshot to one of the user's trades. Re-encoded to WebP (max 1600 px, metadata stripped) before storing. */
export async function uploadJournalScreenshot(form: FormData): Promise<ActionResult> {
  const s = await requireUser();
  const tradeId = String(form.get("tradeId") ?? "");
  const f = form.get("file");
  if (!z.string().uuid().safeParse(tradeId).success) return { ok: false, error: "Trade not found." };
  if (!(f instanceof File) || f.size === 0) return { ok: false, error: "Choose an image first." };
  if (!SHOT_TYPES.includes(f.type)) return { ok: false, error: "Use a PNG, JPG or WebP image." };
  if (f.size > SHOT_MAX_IN) return { ok: false, error: "Images must be 8 MB or smaller." };
  if (!(await ownTrade(s.user.id, tradeId))) return { ok: false, error: "Trade not found." };
  const existing = await db.select({ id: S.journalScreenshot.id }).from(S.journalScreenshot).where(and(eq(S.journalScreenshot.userId, s.user.id), eq(S.journalScreenshot.closedTradeId, tradeId)));
  if (existing.length >= SHOTS_PER_TRADE) return { ok: false, error: `Up to ${SHOTS_PER_TRADE} screenshots per trade. Remove one first.` };
  try {
    const sharp = (await import("sharp")).default;
    const { data, info } = await sharp(Buffer.from(await f.arrayBuffer()), { limitInputPixels: 40_000_000 }).rotate().resize({ width: 1600, height: 1600, fit: "inside", withoutEnlargement: true }).webp({ quality: 82 }).toBuffer({ resolveWithObject: true });
    await db.insert(S.journalScreenshot).values({ userId: s.user.id, closedTradeId: tradeId, mime: "image/webp", bytes: data.length, width: info.width, height: info.height, data });
  } catch {
    return { ok: false, error: "That file could not be read as an image." };
  }
  revalidatePath("/app/journal");
  return { ok: true, message: "Screenshot added." };
}

export async function deleteJournalScreenshot(id: string): Promise<ActionResult> {
  const s = await requireUser();
  if (!z.string().uuid().safeParse(id).success) return { ok: false, error: "Not found." };
  const r = await db.delete(S.journalScreenshot).where(and(eq(S.journalScreenshot.id, id), eq(S.journalScreenshot.userId, s.user.id))).returning({ id: S.journalScreenshot.id });
  if (!r.length) return { ok: false, error: "Not found." };
  revalidatePath("/app/journal");
  return { ok: true, message: "Screenshot removed." };
}
