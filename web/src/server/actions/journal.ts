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
