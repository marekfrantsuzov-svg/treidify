"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { NotConfiguredError, syncProvider } from "../integrations";
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

const connectSchema = z.object({
  platform: z.enum(["mt4", "mt5"]),
  server: z.string().trim().min(2, "Enter your broker server, for example ICMarketsSC-Live07.").max(80),
  login: z.string().trim().regex(/^\d{3,20}$/, "The login is the account number, digits only."),
  investorPassword: z.string().min(4, "Enter the investor (read-only) password.").max(64),
  confirmReadOnly: z.literal(true, { error: "Confirm that this is the read-only investor password." }),
});

/**
 * Connects a MetaTrader account read-only through the sync provider. The investor password goes straight to the
 * provider and is not stored by Treidify. Refuses honestly while the provider is not switched on.
 */
export async function connectTradingAccount(input: z.input<typeof connectSchema>): Promise<ActionResult> {
  const s = await requireUser();
  const p = connectSchema.safeParse(input);
  if (!p.success) return { ok: false, error: p.error.issues[0]?.message ?? "Please check the form." };
  const provider = syncProvider();
  if (!provider.info().configured) return { ok: false, error: "Account sync is not switched on yet, so nothing was sent. Your details were not stored." };
  const { platform, server, login, investorPassword } = p.data;
  try {
    const r = await provider.connect({ platform, server, login, investorPassword });
    const [acct] = await db.insert(schema.tradingAccount).values({ userId: s.user.id, platform, server, login, source: "provider" }).returning();
    await db.insert(schema.providerConnection).values({ tradingAccountId: acct!.id, provider: provider.info().vendor ?? "unknown", externalId: r.externalId, status: r.status === "connected" ? "connected" : r.status === "error" ? "error" : "pending" });
    await audit("account.connect_requested", { actorId: s.user.id, targetType: "trading_account", targetId: acct!.id, meta: { platform, server } });
    revalidatePath("/app", "layout");
    return { ok: true, message: "Connection requested. The first sync can take a few minutes; its status shows here." };
  } catch (e) {
    if (e instanceof NotConfiguredError) return { ok: false, error: e.message };
    return { ok: false, error: "The connection could not be made. Check the server name, login and investor password, then try again." };
  }
}
