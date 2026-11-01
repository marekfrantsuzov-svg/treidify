"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { after } from "next/server";
import { rateLimit } from "@/lib/rate-limit";
import { createConnection, revokeConnection, syncConnection, syncStatus } from "../sync/service";
import { MetaApiError } from "../sync/metaapi";
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
 * Connects a MetaTrader account read-only through MetaApi. The investor password goes straight to MetaApi over TLS
 * and is never stored by Treidify. If MetaApi reports the account is not in investor mode, the first sync removes it.
 */
export async function connectTradingAccount(input: z.input<typeof connectSchema>): Promise<ActionResult> {
  const s = await requireUser();
  const p = connectSchema.safeParse(input);
  if (!p.success) return { ok: false, error: p.error.issues[0]?.message ?? "Please check the form." };
  if (!rateLimit(`connect:${s.user.id}`, 5, 3600_000).ok) return { ok: false, error: "Too many connection attempts. Try again in an hour." };
  if (!syncStatus().configured) return { ok: false, error: "Account sync is not switched on yet, so nothing was sent. Your details were not stored." };
  const { platform, server, login, investorPassword } = p.data;
  try {
    const r = await createConnection(s.user.id, { platform, server, login, investorPassword });
    if (!r.ok) return { ok: false, error: r.error };
    await audit("account.connect_requested", { actorId: s.user.id, targetType: "trading_account", targetId: r.accountId, meta: { platform, server } });
    after(async () => {
      const [c] = await db.select({ id: schema.providerConnection.id }).from(schema.providerConnection).where(eq(schema.providerConnection.tradingAccountId, r.accountId));
      if (c) await syncConnection(c.id);
    });
    revalidatePath("/app", "layout");
    return { ok: true, message: "Connection requested. MetaApi is connecting to your broker; the first sync usually takes one to three minutes." };
  } catch (e) {
    if (e instanceof MetaApiError) return { ok: false, error: e.status === 400 || e.status === 404 ? "The broker server or login was not recognised. Check them and try again." : "MetaApi could not create the connection. Nothing was saved; try again shortly." };
    return { ok: false, error: "The connection could not be made. Check the server name, login and investor password, then try again." };
  }
}

async function ownConnection(userId: string, accountId: string) {
  const [row] = await db.select({ id: schema.providerConnection.id }).from(schema.providerConnection)
    .innerJoin(schema.tradingAccount, eq(schema.tradingAccount.id, schema.providerConnection.tradingAccountId))
    .where(and(eq(schema.tradingAccount.id, accountId), eq(schema.tradingAccount.userId, userId)));
  return row ?? null;
}

export async function syncTradingAccount(accountId: string): Promise<ActionResult> {
  const s = await requireUser();
  if (!rateLimit(`sync:${s.user.id}`, 12, 3600_000).ok) return { ok: false, error: "Please wait a little before syncing again." };
  const c = await ownConnection(s.user.id, accountId);
  if (!c) return { ok: false, error: "Account not found." };
  const r = await syncConnection(c.id);
  revalidatePath("/app", "layout");
  return r.ok ? { ok: true, message: "Synced with your broker." } : { ok: false, error: r.error ?? "Sync failed." };
}

/** Disconnect and revoke: removes the account (and its stored investor password) from MetaApi. Synced history stays until the user deletes the account. */
export async function disconnectTradingAccount(accountId: string): Promise<ActionResult> {
  const s = await requireUser();
  const r = await revokeConnection(s.user.id, accountId);
  if (!r.ok) return { ok: false, error: r.error ?? "Could not disconnect." };
  await audit("account.disconnected", { actorId: s.user.id, targetType: "trading_account", targetId: accountId });
  revalidatePath("/app", "layout");
  return { ok: true, message: "Disconnected. MetaApi no longer holds access to this account." };
}
