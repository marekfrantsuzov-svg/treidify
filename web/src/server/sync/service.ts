import "server-only";
import { randomUUID } from "node:crypto";
import { and, count, desc, eq, inArray, isNotNull, isNull, lt, ne, or, sql } from "drizzle-orm";
import { reportError } from "@/lib/monitoring";
import { audit } from "../audit";
import { db, schema } from "../db";
import { resolveOwner } from "../owner-binding";
import { credentialAllowed, decideAccess, redact, type Credential } from "./access";
import { metaApi, MetaApiError, metaApiToken, tokenShape, type MetaAccountInfo, type MetaApiClient, type MetaPosition } from "./metaapi";
import { cashFlows, closedPositions, normaliseDeal } from "./reconstruct";

/**
 * MetaTrader sync through MetaApi (REST). Configure METAAPI_TOKEN. The connection's externalId is "<region>:<account id>".
 *
 * Read-only guarantee: no code path in Treidify places, modifies or closes trades (metaapi.ts has no such method and a
 * test enforces it). For normal users the password must be proven read-only by MetaApi's investorMode flag; the check
 * runs before any data is stored and again on every sync and live refresh.
 *
 * Freshness, stated honestly: Treidify polls MetaApi's REST API. Balance, equity and open positions refresh every
 * 30 seconds while a dashboard is open; full history syncs every 10 minutes in the background and on demand.
 * Nothing here is a streaming connection.
 */
const env = (k: string) => process.env[k]?.trim() || null;
export const syncStatus = () => {
  const t = metaApiToken();
  return { configured: !!t, tokenVar: t?.name ?? null, needs: t ? [] : ["METAAPI_TOKEN"] };
};
let clientOverride: MetaApiClient | null = null;
/** Tests inject a fake MetaApi; production always uses the real client with the server-side token. */
export function _setMetaApiClient(c: MetaApiClient | null) { clientOverride = c; }
const client = () => clientOverride ?? metaApi(metaApiToken()!.token);
const split = (ext: string) => { const i = ext.indexOf(":"); return i > 0 ? { region: ext.slice(0, i), id: ext.slice(i + 1) } : { region: "new-york", id: ext }; };
const ORDER_TYPE: Record<string, string> = { ORDER_TYPE_BUY_LIMIT: "Buy limit", ORDER_TYPE_SELL_LIMIT: "Sell limit", ORDER_TYPE_BUY_STOP: "Buy stop", ORDER_TYPE_SELL_STOP: "Sell stop", ORDER_TYPE_BUY_STOP_LIMIT: "Buy stop limit", ORDER_TYPE_SELL_STOP_LIMIT: "Sell stop limit" };
export const orderType = (t: string) => ORDER_TYPE[t] ?? t.replace(/^ORDER_TYPE_/, "").replace(/_/g, " ").toLowerCase();
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const HISTORY_DAYS = 730;

/** Cost and abuse guards. Each MetaApi account is billed, so the totals are capped and configurable. */
export function connectionLimits() {
  const n = (k: string, d: number) => { const v = Number(env(k)); return Number.isFinite(v) && v > 0 ? Math.floor(v) : d; };
  return { perUser: n("METAAPI_MAX_ACCOUNTS_PER_USER", 3), perOwner: n("METAAPI_MAX_ACCOUNTS_OWNER", 10), total: n("METAAPI_MAX_ACCOUNTS", 5) };
}
const reliability = () => (env("METAAPI_RELIABILITY") === "high" ? "high" : "regular") as "regular" | "high";

/**
 * Read-only health of the MetaApi token, cached for 5 minutes: can it manage accounts? Reports MetaApi's status and
 * short reason plus non-secret token facts (length, expiry, API names); never the token.
 */
let probeCache: { at: number; value: Awaited<ReturnType<typeof runProbe>> } | null = null;
async function runProbe() {
  const t = metaApiToken();
  if (!t) return { configured: false as const };
  const shape = tokenShape(t.token);
  try {
    await client().probe();
    return { configured: true as const, ok: true, status: 200, reason: null, token: shape };
  } catch (e) {
    const status = e instanceof MetaApiError ? e.status ?? null : null;
    const reason = e instanceof Error ? redact(e.message, t.token).replace(/^MetaApi:\s*/, "").slice(0, 200) : "request failed";
    return { configured: true as const, ok: false, status, reason, token: shape };
  }
}
export async function metaApiProbe(now = Date.now()) {
  if (probeCache && now - probeCache.at < 5 * 60_000) return probeCache.value;
  const value = await runProbe();
  probeCache = { at: now, value };
  return value;
}

/** Strips anything identifying (logins, ids, long numbers) from diagnostic text. */
const scrub = (t: string | null | undefined) => (t ? t.replace(/[0-9a-f]{16,}/gi, "<id>").replace(/\d{4,}/g, "<n>").slice(0, 160) : null);

/**
 * Public, anonymous sync diagnostics for /api/health (cached 2 min): per connection only its state, region, timings and
 * scrubbed last error; per MetaApi account only its state and whether Treidify tracks it. No logins, servers, names or ids.
 */
let diagCache: { at: number; value: unknown } | null = null;
export async function syncDiagnostics(now = Date.now()) {
  if (diagCache && now - diagCache.at < 120_000) return diagCache.value;
  const rows = await db.select().from(schema.providerConnection).orderBy(desc(schema.providerConnection.lastErrorAt)).limit(10);
  const connections = await Promise.all(rows.map(async (c) => {
    const [run] = await db.select().from(schema.syncRun).where(eq(schema.syncRun.connectionId, c.id)).orderBy(desc(schema.syncRun.startedAt)).limit(1);
    return {
      status: c.status, accessMode: c.accessMode, region: c.externalId ? split(c.externalId).region : null, failures: c.consecutiveFailures,
      lastSyncAt: c.lastSyncAt?.toISOString() ?? null, lastError: scrub(c.lastError), lastErrorAt: c.lastErrorAt?.toISOString() ?? null,
      lastRun: run ? { at: run.startedAt.toISOString(), ok: run.ok, error: scrub(run.error), deals: run.dealsImported } : null,
    };
  }));
  let metaapi: unknown = null;
  if (syncStatus().configured) {
    try {
      const held = new Set(rows.filter((r) => r.externalId).map((r) => split(r.externalId!).id));
      metaapi = (await client().list()).slice(0, 20).map((m) => ({ state: m.state, connectionStatus: m.connectionStatus ?? null, region: m.region ?? null, type: m.type ?? null, tracked: held.has(m._id ?? m.id ?? "") }));
    } catch (e) { metaapi = { error: scrub(e instanceof Error ? e.message : "list failed") }; }
  }
  const value = { connections, metaapi };
  diagCache = { at: now, value };
  return value;
}

/** Active = holds a MetaApi account (externalId set). Disconnected rows hold none and cost nothing. */
async function activeCount(userId?: string) {
  const q = db.select({ n: count() }).from(schema.providerConnection)
    .innerJoin(schema.tradingAccount, eq(schema.tradingAccount.id, schema.providerConnection.tradingAccountId));
  const [r] = await (userId
    ? q.where(and(isNotNull(schema.providerConnection.externalId), eq(schema.tradingAccount.userId, userId)))
    : q.where(isNotNull(schema.providerConnection.externalId)));
  return r?.n ?? 0;
}

export interface ConnectUser { id: string; email: string; emailVerified: boolean; impersonated?: boolean }
export type ConnectResult = { ok: true; accountId: string; reconnected: boolean } | { ok: false; error: string; code?: string };

export async function createConnection(user: ConnectUser, a: { platform: "mt4" | "mt5"; server: string; login: string; password: string; credential: Credential }): Promise<ConnectResult> {
  const owner = await resolveOwner(user);
  if (!credentialAllowed(a.credential, owner)) return { ok: false, code: "credential", error: "Only the investor (read-only) password can be used. Nothing was sent." };
  const existing = await reconnectTarget(user.id, a);
  if (!existing?.externalId) {
    const lim = connectionLimits();
    if ((await activeCount(user.id)) >= (owner ? lim.perOwner : lim.perUser)) return { ok: false, code: "limit", error: `You can connect up to ${owner ? lim.perOwner : lim.perUser} accounts. Disconnect one first.` };
    if ((await activeCount()) >= lim.total) return { ok: false, code: "capacity", error: "Treidify has reached its connected-account capacity for now. Nothing was sent; please try again later." };
  }
  const api = client();
  const name = `treidify-${user.id.slice(0, 8)}-${a.login}`;
  // A request that timed out earlier can leave this user's MetaApi account created but not recorded in Treidify.
  // Reuse it (same Treidify user prefix, login, server and platform, and not already held by any Treidify row).
  let created: { id: string } | null = await leftBehind(api, name, a).catch(() => null);
  const adopted = Boolean(created);
  const transactionId = randomUUID().replace(/-/g, "");
  // MetaApi answers 202 while it validates the server and login; poll the same transaction id, about 20 s at most here.
  for (let attempt = 0; attempt < 4 && !created; attempt++) {
    try {
      created = await api.createAccount({ platform: a.platform, server: a.server, login: a.login, password: a.password, name, transactionId, reliability: reliability() });
    } catch (e) {
      if (e instanceof MetaApiError && e.status === 202) { await sleep(Math.min(5, e.retryAfter ?? 5) * 1000); continue; }
      throw e;
    }
  }
  if (!created) return { ok: false, code: "pending", error: "MetaApi is still checking your login with the broker. Press Connect again in a minute; it will pick up the same connection." };
  let region: string | null = null;
  for (let attempt = 0; attempt < 2 && !region; attempt++) region = (await api.account(created.id).catch(() => null))?.region ?? null;
  // If the region is still unknown, the first sync reads it from MetaApi and corrects it before any regional call.
  const externalId = `${region ?? "new-york"}:${created.id}`;
  if (adopted) await audit("account.connect_adopted", { actorId: user.id, targetType: "user", targetId: user.id });
  const fresh = { externalId, status: "pending" as const, lastError: null, lastErrorAt: null, consecutiveFailures: 0, credential: a.credential, accessMode: null, accessVerifiedAt: null, lastLiveAt: null, secretCiphertext: null };
  // Reconnecting the same login reuses its Treidify account, so synced history is never duplicated.
  if (existing) {
    if (existing.externalId && existing.externalId !== externalId) await api.remove(split(existing.externalId).id).catch(() => {});
    await db.insert(schema.providerConnection).values({ tradingAccountId: existing.accountId, provider: "metaapi", historyFrom: new Date(Date.now() - HISTORY_DAYS * 86_400_000), ...fresh })
      .onConflictDoUpdate({ target: [schema.providerConnection.tradingAccountId, schema.providerConnection.provider], set: fresh });
    return { ok: true, accountId: existing.accountId, reconnected: true };
  }
  const [row] = await db.insert(schema.tradingAccount).values({ userId: user.id, platform: a.platform, server: a.server, login: a.login, source: "provider" }).returning();
  await db.insert(schema.providerConnection).values({ tradingAccountId: row!.id, provider: "metaapi", historyFrom: new Date(Date.now() - HISTORY_DAYS * 86_400_000), ...fresh });
  return { ok: true, accountId: row!.id, reconnected: false };
}

/** A MetaApi account an earlier, interrupted connect created for this same user and login, not held by any Treidify row. */
async function leftBehind(api: MetaApiClient, name: string, a: { platform: "mt4" | "mt5"; server: string; login: string }) {
  const held = new Set((await db.select({ e: schema.providerConnection.externalId }).from(schema.providerConnection).where(isNotNull(schema.providerConnection.externalId)))
    .map((r) => split(r.e!).id));
  const match = (await api.list()).find((m) => {
    const id = m._id ?? m.id;
    return !!id && !held.has(id) && m.name === name && String(m.login) === a.login && (m.server ?? "").toLowerCase() === a.server.toLowerCase() && (!m.platform || m.platform === a.platform);
  });
  const id = match?._id ?? match?.id;
  return id ? { id } : null;
}

/** The user's existing provider account for this platform, server and login, if any (used by Reconnect). */
async function reconnectTarget(userId: string, a: { platform: "mt4" | "mt5"; server: string; login: string }) {
  const [row] = await db.select({ accountId: schema.tradingAccount.id, externalId: schema.providerConnection.externalId }).from(schema.tradingAccount)
    .leftJoin(schema.providerConnection, eq(schema.providerConnection.tradingAccountId, schema.tradingAccount.id))
    .where(and(eq(schema.tradingAccount.userId, userId), eq(schema.tradingAccount.source, "provider"), eq(schema.tradingAccount.platform, a.platform), sql`lower(${schema.tradingAccount.server}) = lower(${a.server})`, eq(schema.tradingAccount.login, a.login)))
    .limit(1);
  return row ?? null;
}

type Conn = typeof schema.providerConnection.$inferSelect;

/** Owner status of the account's Treidify user, read from the database (never from the request). */
async function connectionOwner(tradingAccountId: string) {
  const [u] = await db.select({ id: schema.user.id, email: schema.user.email, emailVerified: schema.user.emailVerified }).from(schema.user)
    .innerJoin(schema.tradingAccount, eq(schema.tradingAccount.userId, schema.user.id)).where(eq(schema.tradingAccount.id, tradingAccountId));
  return resolveOwner(u ?? null);
}

/**
 * Applies the read-only policy to fresh account information. On refusal the MetaApi account (and the password MetaApi
 * holds) is deleted at once and the connection stops; nothing from it is stored.
 */
async function enforceAccess(conn: Conn, info: MetaAccountInfo, api: MetaApiClient) {
  const decision = decideAccess({ investorMode: info.investorMode, owner: await connectionOwner(conn.tradingAccountId) });
  if (decision.ok) {
    if (conn.accessMode !== decision.mode) await db.update(schema.providerConnection).set({ accessMode: decision.mode, accessVerifiedAt: new Date() }).where(eq(schema.providerConnection.id, conn.id));
    return decision;
  }
  if (conn.externalId) await api.remove(split(conn.externalId).id).catch((e) => reportError(e, { where: "sync.enforceAccess.remove" }));
  await db.update(schema.providerConnection).set({ status: "error", lastError: decision.message, lastErrorAt: new Date(), externalId: null, accessMode: null, accessVerifiedAt: null })
    .where(eq(schema.providerConnection.id, conn.id));
  await audit(`account.access_refused.${decision.reason}`, { targetType: "trading_account", targetId: conn.tradingAccountId });
  return decision;
}

export type SyncPhase = "connecting" | "verifying" | "refused" | "broker_rejected" | "synced" | "error" | "inactive";
export interface SyncResult { ok: boolean; phase: SyncPhase; error?: string }

/** Pulls account information, open positions and deals since the last sync. Safe to call repeatedly (deals dedupe on broker id). */
export async function syncConnection(connectionId: string): Promise<SyncResult> {
  const [conn] = await db.select().from(schema.providerConnection).where(eq(schema.providerConnection.id, connectionId));
  if (!conn?.externalId || conn.status === "disconnected") return { ok: false, phase: "inactive", error: "No active connection." };
  const [run] = await db.insert(schema.syncRun).values({ connectionId, kind: conn.lastSyncAt ? "incremental" : "backfill" }).returning();
  const api = client();
  const { id } = split(conn.externalId);
  let { region } = split(conn.externalId);
  const finish = (ok: boolean, error?: string, deals = 0) => db.update(schema.syncRun).set({ finishedAt: new Date(), ok, error: error?.slice(0, 300) ?? null, dealsImported: deals }).where(eq(schema.syncRun.id, run!.id));
  try {
    const acc = await api.account(id);
    // Regional calls must go to the region MetaApi actually placed the account in; correct a stored guess.
    if (acc.region && acc.region !== region) {
      region = acc.region;
      await db.update(schema.providerConnection).set({ externalId: `${region}:${id}` }).where(eq(schema.providerConnection.id, connectionId));
      conn.externalId = `${region}:${id}`;
    }
    if (acc.state !== "DEPLOYED" || acc.connectionStatus !== "CONNECTED") {
      const rejected = acc.state === "DEPLOYED" && acc.connectionStatus === "DISCONNECTED_FROM_BROKER";
      if (acc.state === "UNDEPLOYED") await api.deploy(id).catch(() => {});
      await db.update(schema.providerConnection).set({ status: rejected ? "reconnection_required" : "synchronizing", ...(rejected ? { lastError: "The broker disconnected this login. Check the server and password, then reconnect.", lastErrorAt: new Date() } : {}) }).where(eq(schema.providerConnection.id, connectionId));
      await finish(false, `account ${acc.state}/${acc.connectionStatus ?? "?"}`);
      return rejected ? { ok: false, phase: "broker_rejected", error: "The broker disconnected this login. Check the server name and password, then reconnect." } : { ok: false, phase: "connecting", error: "MetaApi is still connecting to the broker." };
    }
    const info = await api.info(region, id);
    const access = await enforceAccess(conn, info, api);
    if (!access.ok) { await finish(false, access.reason); return { ok: false, phase: "refused", error: access.message }; }

    const now = new Date();
    const from = conn.lastSyncAt ? new Date(conn.lastSyncAt.getTime() - 2 * 86_400_000) : conn.historyFrom ?? new Date(now.getTime() - HISTORY_DAYS * 86_400_000);
    const [positions, rawDeals, orders] = await Promise.all([api.positions(region, id), api.deals(region, id, from, now), api.orders(region, id).catch(() => null)]);
    const deals = rawDeals.map(normaliseDeal);
    const acctId = conn.tradingAccountId;
    await db.transaction(async (tx) => {
      await tx.update(schema.tradingAccount).set({ currency: info.currency, broker: info.broker ?? null }).where(eq(schema.tradingAccount.id, acctId));
      await writeLive(tx, acctId, info, positions, now, true);
      // Pending orders are replaced as a set; if MetaApi did not answer for them, the previous set is kept.
      if (orders) {
        await tx.delete(schema.pendingOrder).where(eq(schema.pendingOrder.tradingAccountId, acctId));
        const live = orders.filter((o) => !o.state || o.state === "ORDER_STATE_PLACED" || o.state === "ORDER_STATE_PARTIAL" || o.state === "ORDER_STATE_STARTED");
        if (live.length) await tx.insert(schema.pendingOrder).values(live.map((o) => ({
          tradingAccountId: acctId, externalId: String(o.id), symbol: o.symbol, type: orderType(o.type), volume: o.currentVolume ?? o.volume ?? 0, price: o.openPrice ?? 0,
          stopLoss: o.stopLoss ?? null, takeProfit: o.takeProfit ?? null, placedAt: new Date(o.time),
        })));
      }
      if (deals.length) {
        const inserted = await tx.insert(schema.deal).values(deals.map((d) => ({ tradingAccountId: acctId, ...d }))).onConflictDoNothing().returning({ id: schema.deal.id, externalId: schema.deal.externalId });
        const idOf = new Map(inserted.map((r) => [r.externalId, r.id]));
        const flows = cashFlows(deals).filter((f) => idOf.has(f.externalId));
        if (flows.length) await tx.insert(schema.cashFlow).values(flows.map((f) => ({ tradingAccountId: acctId, dealId: idOf.get(f.externalId)!, kind: f.kind, amount: f.amount, at: f.at })));
        // Rebuild closed trades for every position touched, from ALL stored deals of those positions.
        const pids = [...new Set(deals.map((d) => d.positionId).filter((p): p is string => !!p))];
        if (pids.length) {
          const all = await tx.select().from(schema.deal).where(and(eq(schema.deal.tradingAccountId, acctId), inArray(schema.deal.positionId, pids)));
          const closed = closedPositions(all);
          for (const c of closed) {
            const net = c.profit + c.commission + c.swap + c.fee;
            const usd = info.currency === "USD";
            await tx.insert(schema.closedTrade).values({ tradingAccountId: acctId, ...c, netUsd: usd ? net : null, fxRateToUsd: usd ? 1 : null })
              .onConflictDoUpdate({ target: [schema.closedTrade.tradingAccountId, schema.closedTrade.positionId], set: { closePrice: c.closePrice, closeTime: c.closeTime, profit: c.profit, commission: c.commission, swap: c.swap, fee: c.fee, volume: c.volume, stopLoss: c.stopLoss, takeProfit: c.takeProfit, netUsd: usd ? net : null } });
          }
        }
      }
      await tx.update(schema.providerConnection).set({ status: "connected", lastSyncAt: now, lastLiveAt: now, consecutiveFailures: 0, lastError: null }).where(eq(schema.providerConnection.id, connectionId));
    });
    await finish(true, undefined, deals.length);
    return { ok: true, phase: "synced" };
  } catch (e) {
    const msg = redact(e instanceof MetaApiError ? e.message : `Sync failed: ${e instanceof Error ? e.message : String(e)}`);
    reportError(new Error(msg), { where: "sync.syncConnection", extra: { connectionId, status: e instanceof MetaApiError ? e.status : undefined } });
    await db.update(schema.providerConnection).set({ status: "error", lastError: msg.slice(0, 300), lastErrorAt: new Date(), consecutiveFailures: sql`${schema.providerConnection.consecutiveFailures} + 1` }).where(eq(schema.providerConnection.id, connectionId));
    await finish(false, msg);
    return { ok: false, phase: "error", error: "Sync failed. It will retry automatically." };
  }
}

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

/** Replaces open positions and records a balance/equity snapshot (at most one new row per minute; otherwise the latest row is updated). */
async function writeLive(tx: Tx | typeof db, acctId: string, info: MetaAccountInfo, positions: MetaPosition[], now: Date, forceRow = false) {
  const floating = positions.reduce((s, p) => s + (p.profit ?? p.unrealizedProfit ?? 0), 0);
  const snap = { balance: info.balance, equity: info.equity, margin: info.margin ?? null, freeMargin: info.freeMargin ?? null, floatingPnl: floating, at: now };
  const [last] = await tx.select({ id: schema.accountSnapshot.id, at: schema.accountSnapshot.at }).from(schema.accountSnapshot).where(eq(schema.accountSnapshot.tradingAccountId, acctId)).orderBy(desc(schema.accountSnapshot.at)).limit(1);
  if (!forceRow && last && now.getTime() - last.at.getTime() < 60_000) await tx.update(schema.accountSnapshot).set(snap).where(eq(schema.accountSnapshot.id, last.id));
  else await tx.insert(schema.accountSnapshot).values({ tradingAccountId: acctId, ...snap });
  await tx.delete(schema.position).where(eq(schema.position.tradingAccountId, acctId));
  if (positions.length) await tx.insert(schema.position).values(positions.map((p) => ({
    tradingAccountId: acctId, externalId: String(p.id), symbol: p.symbol, side: p.type === "POSITION_TYPE_SELL" ? "sell" : "buy", volume: p.volume, openPrice: p.openPrice,
    currentPrice: p.currentPrice ?? null, stopLoss: p.stopLoss ?? null, takeProfit: p.takeProfit ?? null, floatingPnl: p.profit ?? p.unrealizedProfit ?? null, swap: p.swap ?? null, openedAt: new Date(p.time),
  })));
}

/** The connection of one of THIS user's accounts, or null. Every account operation goes through an owner-scoped lookup like this. */
export async function ownedConnection(userId: string, accountId: string) {
  const [row] = await db.select({ c: schema.providerConnection, a: schema.tradingAccount }).from(schema.providerConnection)
    .innerJoin(schema.tradingAccount, eq(schema.tradingAccount.id, schema.providerConnection.tradingAccountId))
    .where(and(eq(schema.tradingAccount.id, accountId), eq(schema.tradingAccount.userId, userId)));
  return row ?? null;
}

const LIVE_MIN_MS = 20_000;
const FULL_SYNC_MS = 5 * 60_000;

export interface LiveState {
  accountId: string; status: string; accessMode: string | null; currency: string | null;
  balance: number | null; equity: number | null; floating: number | null; margin: number | null; freeMargin: number | null;
  positions: { id: string; symbol: string; side: string; volume: number; openPrice: number; currentPrice: number | null; floatingPnl: number | null; stopLoss: number | null; takeProfit: number | null }[];
  asOf: string | null; lastSyncAt: string | null; error: string | null; needsFullSync: boolean;
}

/**
 * On-view refresh for one owned account: balance, equity and open positions from MetaApi, at most every 20 s per account.
 * Re-checks read-only access each time. Returns the stored state (with its real timestamp) when MetaApi is not reachable.
 */
export async function liveRefresh(userId: string, accountId: string, now = new Date(), remote = true): Promise<LiveState | null> {
  const row = await ownedConnection(userId, accountId);
  if (!row) return null;
  const { c, a } = row;
  let error: string | null = null;
  if (remote && c.externalId && c.status === "connected" && c.accessMode && syncStatus().configured && (!c.lastLiveAt || now.getTime() - c.lastLiveAt.getTime() >= LIVE_MIN_MS)) {
    // Claim the slot first so concurrent tabs do not all call MetaApi.
    const claimed = await db.update(schema.providerConnection).set({ lastLiveAt: now })
      .where(and(eq(schema.providerConnection.id, c.id), or(isNull(schema.providerConnection.lastLiveAt), lt(schema.providerConnection.lastLiveAt, new Date(now.getTime() - LIVE_MIN_MS))))).returning({ id: schema.providerConnection.id });
    if (claimed.length) {
      const api = client();
      const { region, id } = split(c.externalId);
      try {
        const [info, positions] = await Promise.all([api.info(region, id), api.positions(region, id)]);
        const access = await enforceAccess(c, info, api);
        if (!access.ok) error = access.message;
        else await db.transaction((tx) => writeLive(tx, a.id, info, positions, now));
      } catch (e) {
        error = e instanceof MetaApiError && e.status === 429 ? "MetaApi rate limit reached; showing the last saved values." : "Could not reach MetaApi; showing the last saved values.";
        reportError(new Error(e instanceof MetaApiError ? e.message : "live refresh failed"), { where: "sync.liveRefresh" });
      }
    }
  }
  const [fresh] = await db.select().from(schema.providerConnection).where(eq(schema.providerConnection.id, c.id));
  const [snap] = await db.select().from(schema.accountSnapshot).where(eq(schema.accountSnapshot.tradingAccountId, a.id)).orderBy(desc(schema.accountSnapshot.at)).limit(1);
  const positions = await db.select().from(schema.position).where(eq(schema.position.tradingAccountId, a.id)).orderBy(desc(schema.position.openedAt));
  const [acct] = await db.select({ currency: schema.tradingAccount.currency }).from(schema.tradingAccount).where(eq(schema.tradingAccount.id, a.id));
  return {
    accountId: a.id, status: fresh?.status ?? c.status, accessMode: fresh?.accessMode ?? null, currency: acct?.currency ?? null,
    balance: snap?.balance ?? null, equity: snap?.equity ?? null, floating: snap ? (snap.floatingPnl ?? snap.equity - snap.balance) : null,
    margin: snap?.margin ?? null, freeMargin: snap?.freeMargin ?? null,
    positions: positions.map((p) => ({ id: p.id, symbol: p.symbol, side: p.side, volume: p.volume, openPrice: p.openPrice, currentPrice: p.currentPrice, floatingPnl: p.floatingPnl, stopLoss: p.stopLoss, takeProfit: p.takeProfit })),
    asOf: snap?.at.toISOString() ?? null, lastSyncAt: fresh?.lastSyncAt?.toISOString() ?? null, error: error ?? (fresh?.status === "connected" ? null : fresh?.lastError ?? null),
    needsFullSync: !!fresh?.externalId && fresh.status !== "disconnected" && (!fresh.lastSyncAt || now.getTime() - fresh.lastSyncAt.getTime() > FULL_SYNC_MS),
  };
}

/** Removes the account from MetaApi (deleting the password MetaApi holds) and marks it disconnected. Owner-scoped. */
export async function revokeConnection(userId: string, tradingAccountId: string) {
  const row = await ownedConnection(userId, tradingAccountId);
  if (!row) return { ok: false, error: "Account not found." };
  if (row.c.externalId && syncStatus().configured) {
    try { await client().remove(split(row.c.externalId).id); } catch (e) { if (!(e instanceof MetaApiError && e.status === 404)) { reportError(e, { where: "sync.revoke" }); return { ok: false, error: "MetaApi did not confirm the removal. Try again." }; } }
  }
  await db.update(schema.providerConnection).set({ status: "disconnected", externalId: null, secretCiphertext: null, accessMode: null, accessVerifiedAt: null }).where(eq(schema.providerConnection.id, row.c.id));
  return { ok: true };
}

/** Disconnect, then delete the Treidify account and everything synced for it (deals, trades, snapshots, journal links). */
export async function deleteConnectedAccount(userId: string, tradingAccountId: string) {
  const row = await ownedConnection(userId, tradingAccountId);
  if (row) { const r = await revokeConnection(userId, tradingAccountId); if (!r.ok) return r; }
  const del = await db.delete(schema.tradingAccount).where(and(eq(schema.tradingAccount.id, tradingAccountId), eq(schema.tradingAccount.userId, userId), ne(schema.tradingAccount.source, "sample"))).returning({ id: schema.tradingAccount.id });
  return del.length ? { ok: true } : { ok: false, error: "Account not found." };
}

/** Connections due for a sync: connected/pending ones not synced in the last `minutes`. */
export async function dueConnections(minutes = 5, limit = 25) {
  return db.select({ id: schema.providerConnection.id }).from(schema.providerConnection)
    .where(and(inArray(schema.providerConnection.status, ["pending", "connected", "synchronizing", "error", "reconnection_required"]), sql`${schema.providerConnection.externalId} is not null`, sql`(${schema.providerConnection.lastSyncAt} is null or ${schema.providerConnection.lastSyncAt} < now() - (${minutes} * interval '1 minute'))`, sql`${schema.providerConnection.consecutiveFailures} < 20`))
    .limit(limit);
}
