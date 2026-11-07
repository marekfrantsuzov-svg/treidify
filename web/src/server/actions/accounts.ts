"use server";

import { and, eq, ne } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { after } from "next/server";
import { rateLimit } from "@/lib/rate-limit";
import { createConnection, deleteConnectedAccount, ownedConnection, revokeConnection, syncConnection, syncStatus } from "../sync/service";
import { connectErrorMessage, credentialAllowed, redact } from "../sync/access";
import { ownerForUserId } from "../owner-binding";
import { reportError } from "@/lib/monitoring";
import { MetaApiError } from "../sync/metaapi";
import { audit } from "../audit";
import { accountLimit } from "../entitlements";
import { db, schema } from "../db";
import { deleteSampleAccounts, insertSampleAccount } from "../sample-account";
import { requireMember } from "../session";
import type { ActionResult } from "./settings";

/** Adds one labelled sample account so every screen can be explored before a real account is connected. */
export async function loadDemoAccount(): Promise<ActionResult> {
  const s = await requireMember();
  const existing = await db.select({ id: schema.tradingAccount.id }).from(schema.tradingAccount)
    .where(and(eq(schema.tradingAccount.userId, s.user.id), eq(schema.tradingAccount.source, "sample"))).limit(1);
  if (existing.length) return { ok: false, error: "You already have a demo account." };
  const r = await insertSampleAccount(db, s.user.id);
  await audit("account.demo_loaded", { actorId: s.user.id, targetType: "trading_account", targetId: r.id });
  revalidatePath("/app", "layout");
  return { ok: true, message: `Demo account added with ${r.trades} sample trades. It is labelled Sample everywhere and never counts toward verification.` };
}

export async function removeDemoAccount(): Promise<ActionResult> {
  const s = await requireMember();
  const n = await deleteSampleAccounts(db, s.user.id);
  if (!n) return { ok: false, error: "There is no demo account to remove." };
  await audit("account.demo_removed", { actorId: s.user.id, targetType: "user", targetId: s.user.id });
  revalidatePath("/app", "layout");
  return { ok: true, message: "Demo account and its sample trades were removed." };
}

const connectSchema = z.object({
  platform: z.enum(["mt4", "mt5"]),
  server: z.string().trim().min(2, "Enter your broker server, for example ICMarketsSC-Live07.").max(80).regex(/^[\w .\-()]+$/, "Use the server name exactly as MetaTrader shows it."),
  login: z.string().trim().regex(/^\d{3,20}$/, "The login is the account number, digits only."),
  password: z.string().min(4, "Enter the password.").max(64),
  credential: z.enum(["investor", "master"]).default("investor"),
  confirmReadOnly: z.literal(true, { error: "Confirm the password type." }),
});

/** Whether the signed-in user is the verified owner (server-side check; shown so the form can offer the master option). */
export async function connectOptions(): Promise<{ owner: boolean }> {
  const s = await requireMember();
  return { owner: (await ownerForUserId(s.user.id, { impersonatedBy: s.session.impersonatedBy })).owner };
}

/**
 * Connects a MetaTrader account through MetaApi. The password goes from this server straight to MetaApi over TLS and is
 * never stored, logged or returned by Treidify. Normal users: investor password only, proven by MetaApi before any data
 * is stored. The verified owner may also use the master password; Treidify still never trades.
 */
export async function connectTradingAccount(input: z.input<typeof connectSchema>): Promise<ActionResult & { accountId?: string }> {
  const s = await requireMember();
  const p = connectSchema.safeParse(input);
  if (!p.success) return { ok: false, error: p.error.issues[0]?.message ?? "Please check the form." };
  if (!rateLimit(`connect:${s.user.id}`, 5, 3600_000).ok) return { ok: false, error: "Too many connection attempts. Try again in an hour." };
  if (!syncStatus().configured) return { ok: false, error: "Account sync is not switched on yet, so nothing was sent. Your details were not stored." };
  const { user: u, owner } = await ownerForUserId(s.user.id, { impersonatedBy: s.session.impersonatedBy });
  if (!u) return { ok: false, error: "Please sign in again." };
  const { platform, server, login, password, credential } = p.data;
  // Plan limit (Essential 1, Premium 2), enforced here on the server. Reconnecting the same login does not count twice.
  if (!owner) {
    const limit = await accountLimit(u.id);
    const real = await db.select({ login: schema.tradingAccount.login, server: schema.tradingAccount.server, platform: schema.tradingAccount.platform, status: schema.providerConnection.status })
      .from(schema.tradingAccount).leftJoin(schema.providerConnection, eq(schema.providerConnection.tradingAccountId, schema.tradingAccount.id))
      .where(and(eq(schema.tradingAccount.userId, u.id), ne(schema.tradingAccount.source, "sample")));
    const others = real.filter((r) => r.status !== "disconnected" && !(r.login === login && r.server === server && r.platform === platform));
    if (others.length >= limit) return { ok: false, error: limit === 1 ? "Your plan includes 1 connected account. Premium includes 2; upgrade in Settings › Plan, or disconnect the other account first." : `Your plan includes ${limit} connected accounts. Disconnect one first.` };
  }
  if (!credentialAllowed(credential, owner)) {
    await audit("account.connect_master_refused", { actorId: u.id, targetType: "user", targetId: u.id });
    return { ok: false, error: "Only the investor (read-only) password can be used. Nothing was sent." };
  }
  try {
    const r = await createConnection(u, { platform, server, login, password, credential });
    if (!r.ok) return { ok: false, error: r.error };
    await audit("account.connect_requested", { actorId: u.id, targetType: "trading_account", targetId: r.accountId, meta: { platform, server, credential } });
    after(async () => {
      const [c] = await db.select({ id: schema.providerConnection.id }).from(schema.providerConnection).where(eq(schema.providerConnection.tradingAccountId, r.accountId));
      if (c) await syncConnection(c.id);
    });
    revalidatePath("/app", "layout");
    return { ok: true, accountId: r.accountId, message: r.reconnected ? "Reconnect requested. Your existing history is kept and only new deals are added." : "Connection created. MetaApi is connecting to your broker." };
  } catch (e) {
    if (e instanceof MetaApiError) {
      reportError(new Error(redact(e.message, password)), { where: "accounts.connect", extra: { status: e.status, code: e.code } });
      return { ok: false, error: connectErrorMessage(e) };
    }
    reportError(new Error("connect failed"), { where: "accounts.connect" });
    return { ok: false, error: "The connection could not be made. Check the server name, login and password, then try again." };
  }
}

export interface ConnectionProgress { ok: boolean; phase: "connecting" | "verifying" | "refused" | "broker_rejected" | "synced" | "error" | "inactive"; status: string | null; accessMode: string | null; message: string | null }

/**
 * Polled by the connect sheet until the account is verified and its history imported. Runs a sync at most every
 * 8 seconds per account. Owner-scoped: another user's account id returns "not found".
 */
export async function connectionProgress(accountId: string): Promise<ConnectionProgress> {
  const s = await requireMember();
  const row = await ownedConnection(s.user.id, z.string().uuid().parse(accountId));
  if (!row) return { ok: false, phase: "inactive", status: null, accessMode: null, message: "Account not found." };
  let { c } = row;
  if (c.status !== "connected" && c.externalId && rateLimit(`progress:${c.id}`, 1, 8000).ok) {
    const r = await syncConnection(c.id);
    const [fresh] = await db.select().from(schema.providerConnection).where(eq(schema.providerConnection.id, c.id));
    if (fresh) c = fresh;
    if (r.ok) revalidatePath("/app", "layout");
    return { ok: r.ok, phase: r.phase, status: c.status, accessMode: c.accessMode, message: r.error ?? null };
  }
  const phase = c.status === "connected" ? "synced" : !c.externalId ? (c.lastError ? "refused" : "inactive") : c.status === "reconnection_required" ? "broker_rejected" : "connecting";
  return { ok: c.status === "connected", phase, status: c.status, accessMode: c.accessMode, message: c.status === "connected" ? null : c.lastError };
}

export async function syncTradingAccount(accountId: string): Promise<ActionResult> {
  const s = await requireMember();
  if (!rateLimit(`sync:${s.user.id}`, 12, 3600_000).ok) return { ok: false, error: "Please wait a little before syncing again." };
  const row = await ownedConnection(s.user.id, accountId);
  if (!row) return { ok: false, error: "Account not found." };
  const r = await syncConnection(row.c.id);
  revalidatePath("/app", "layout");
  return r.ok ? { ok: true, message: "Synced with your broker." } : { ok: false, error: r.error ?? "Sync failed." };
}

/** Disconnect and revoke: removes the account (and the password MetaApi holds) from MetaApi. Synced history stays until the user deletes it. */
export async function disconnectTradingAccount(accountId: string): Promise<ActionResult> {
  const s = await requireMember();
  const r = await revokeConnection(s.user.id, accountId);
  if (!r.ok) return { ok: false, error: r.error ?? "Could not disconnect." };
  await audit("account.disconnected", { actorId: s.user.id, targetType: "trading_account", targetId: accountId });
  revalidatePath("/app", "layout");
  return { ok: true, message: "Disconnected. MetaApi no longer holds access to this account." };
}

/** Disconnect (revoking MetaApi access) and permanently delete the account and all of its synced data from Treidify. */
export async function deleteTradingAccount(accountId: string): Promise<ActionResult> {
  const s = await requireMember();
  const r = await deleteConnectedAccount(s.user.id, z.string().uuid().parse(accountId));
  if (!r.ok) return { ok: false, error: r.error ?? "Could not delete." };
  await audit("account.deleted", { actorId: s.user.id, targetType: "trading_account", targetId: accountId });
  revalidatePath("/app", "layout");
  return { ok: true, message: "Account and its synced data were deleted." };
}
