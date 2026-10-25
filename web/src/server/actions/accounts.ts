"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { audit } from "../audit";
import { db, schema } from "../db";
import { deleteSampleAccounts, insertSampleAccount } from "../sample-account";
import { requireUser } from "../session";
import type { ActionResult } from "./settings";

/** Adds one labelled sample account so every screen can be explored before a real account is connected. */
export async function loadDemoAccount(): Promise<ActionResult> {
  const s = await requireUser();
  const existing = await db.select({ id: schema.tradingAccount.id }).from(schema.tradingAccount)
    .where(and(eq(schema.tradingAccount.userId, s.user.id), eq(schema.tradingAccount.source, "sample"))).limit(1);
  if (existing.length) return { ok: false, error: "You already have a demo account." };
  const r = await insertSampleAccount(db, s.user.id);
  await audit("account.demo_loaded", { actorId: s.user.id, targetType: "trading_account", targetId: r.id });
  revalidatePath("/app", "layout");
  return { ok: true, message: `Demo account added with ${r.trades} sample trades. It is labelled Sample everywhere and never counts toward verification.` };
}

export async function removeDemoAccount(): Promise<ActionResult> {
  const s = await requireUser();
  const n = await deleteSampleAccounts(db, s.user.id);
  if (!n) return { ok: false, error: "There is no demo account to remove." };
  await audit("account.demo_removed", { actorId: s.user.id, targetType: "user", targetId: s.user.id });
  revalidatePath("/app", "layout");
  return { ok: true, message: "Demo account and its sample trades were removed." };
}
