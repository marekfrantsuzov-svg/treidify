import "server-only";
import { randomUUID } from "node:crypto";
import { and, eq, inArray, sql } from "drizzle-orm";
import { reportError } from "@/lib/monitoring";
import { db, schema } from "../db";
import { metaApi, MetaApiError } from "./metaapi";
import { cashFlows, closedPositions, normaliseDeal } from "./reconstruct";

/**
 * MetaTrader sync through MetaApi. Configure METAAPI_TOKEN (a MetaApi API token with account-management and
 * read access). The connection's externalId is stored as "<region>:<metaapi account id>".
 */
const env = (k: string) => process.env[k]?.trim() || null;
export const syncStatus = () => ({ configured: !!env("METAAPI_TOKEN"), needs: env("METAAPI_TOKEN") ? [] : ["METAAPI_TOKEN"] });
const client = () => metaApi(env("METAAPI_TOKEN")!);
const split = (ext: string) => { const i = ext.indexOf(":"); return i > 0 ? { region: ext.slice(0, i), id: ext.slice(i + 1) } : { region: "new-york", id: ext }; };
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export async function createConnection(userId: string, a: { platform: "mt4" | "mt5"; server: string; login: string; investorPassword: string }) {
  const api = client();
  const transactionId = randomUUID().replace(/-/g, "");
  let created: { id: string } | null = null;
  // MetaApi answers 202 while it validates the server and login; retry the same transaction a few times.
  for (let attempt = 0; attempt < 4 && !created; attempt++) {
    try {
      created = await api.createAccount({ platform: a.platform, server: a.server, login: a.login, password: a.investorPassword, name: `treidify-${userId.slice(0, 8)}-${a.login}`, transactionId });
    } catch (e) {
      if (e instanceof MetaApiError && e.status === 202) { await sleep(Math.min(10, e.retryAfter ?? 5) * 1000); continue; }
      throw e;
    }
  }
  if (!created) return { ok: false as const, error: "The broker check is still running. Try again in a minute; nothing was saved." };
  const acc = await api.account(created.id).catch(() => null);
  const region = acc?.region ?? "new-york";
  const [row] = await db.insert(schema.tradingAccount).values({ userId, platform: a.platform, server: a.server, login: a.login, source: "provider" }).returning();
  await db.insert(schema.providerConnection).values({ tradingAccountId: row!.id, provider: "metaapi", externalId: `${region}:${created.id}`, status: "pending", historyFrom: new Date(Date.now() - 730 * 86_400_000) });
  return { ok: true as const, accountId: row!.id };
}

/** Pulls account information, open positions and deals since the last sync. Safe to call repeatedly. */
export async function syncConnection(connectionId: string) {
  const [conn] = await db.select().from(schema.providerConnection).where(eq(schema.providerConnection.id, connectionId));
  if (!conn?.externalId || conn.status === "disconnected") return { ok: false, error: "No active connection." };
  const [run] = await db.insert(schema.syncRun).values({ connectionId, kind: conn.lastSyncAt ? "incremental" : "backfill" }).returning();
  const api = client();
  const { region, id } = split(conn.externalId);
  try {
    const acc = await api.account(id);
    if (acc.state !== "DEPLOYED" || acc.connectionStatus !== "CONNECTED") {
      const status = acc.state === "DEPLOYED" && acc.connectionStatus === "DISCONNECTED_FROM_BROKER" ? "reconnection_required" : "synchronizing";
      await db.update(schema.providerConnection).set({ status }).where(eq(schema.providerConnection.id, connectionId));
      await db.update(schema.syncRun).set({ finishedAt: new Date(), ok: false, error: `account ${acc.state}/${acc.connectionStatus ?? "?"}` }).where(eq(schema.syncRun.id, run!.id));
      return { ok: false, error: status === "reconnection_required" ? "The broker rejected the login. Check the server and investor password." : "MetaApi is still connecting to the broker." };
    }
    const info = await api.info(region, id);
    if (info.investorMode === false) {
      // Treidify only holds read-only access. A master password was used: remove it from MetaApi immediately.
      await api.remove(id).catch(() => {});
      await db.update(schema.providerConnection).set({ status: "error", lastError: "A trading (master) password was entered. Treidify removed the connection; reconnect with the investor password.", lastErrorAt: new Date(), externalId: null }).where(eq(schema.providerConnection.id, connectionId));
      return { ok: false, error: "That was the trading password, not the investor password. The connection was removed for your safety." };
    }
    const now = new Date();
    const from = conn.lastSyncAt ? new Date(conn.lastSyncAt.getTime() - 2 * 86_400_000) : conn.historyFrom ?? new Date(now.getTime() - 730 * 86_400_000);
    const [positions, rawDeals] = await Promise.all([api.positions(region, id), api.deals(region, id, from, now)]);
    const deals = rawDeals.map(normaliseDeal);
    const acctId = conn.tradingAccountId;
    await db.transaction(async (tx) => {
      await tx.update(schema.tradingAccount).set({ currency: info.currency, broker: info.broker ?? null }).where(eq(schema.tradingAccount.id, acctId));
      const floating = positions.reduce((s, p) => s + (p.profit ?? p.unrealizedProfit ?? 0), 0);
      await tx.insert(schema.accountSnapshot).values({ tradingAccountId: acctId, at: now, balance: info.balance, equity: info.equity, margin: info.margin ?? null, freeMargin: info.freeMargin ?? null, floatingPnl: floating });
      await tx.delete(schema.position).where(eq(schema.position.tradingAccountId, acctId));
      if (positions.length) await tx.insert(schema.position).values(positions.map((p) => ({
        tradingAccountId: acctId, externalId: String(p.id), symbol: p.symbol, side: p.type === "POSITION_TYPE_SELL" ? "sell" : "buy", volume: p.volume, openPrice: p.openPrice,
        currentPrice: p.currentPrice ?? null, stopLoss: p.stopLoss ?? null, takeProfit: p.takeProfit ?? null, floatingPnl: p.profit ?? p.unrealizedProfit ?? null, swap: p.swap ?? null, openedAt: new Date(p.time),
      })));
      if (deals.length) {
        const inserted = await tx.insert(schema.deal).values(deals.map((d) => ({ tradingAccountId: acctId, ...d }))).onConflictDoNothing().returning({ id: schema.deal.id, externalId: schema.deal.externalId });
        const idOf = new Map(inserted.map((r) => [r.externalId, r.id]));
        const flows = cashFlows(deals).filter((f) => idOf.has(f.externalId));
        if (flows.length) await tx.insert(schema.cashFlow).values(flows.map((f) => ({ tradingAccountId: acctId, dealId: idOf.get(f.externalId)!, kind: f.kind, amount: f.amount, at: f.at })));
        // Rebuild closed trades for every position touched, from ALL stored deals of those positions.
        const pids = [...new Set(deals.map((d) => d.positionId).filter((p): p is string => !!p))];
        if (pids.length) {
          const all = await tx.select().from(schema.deal).where(and(eq(schema.deal.tradingAccountId, acctId), inArray(schema.deal.positionId, pids)));
          const closed = closedPositions(all.map((d) => ({ ...d, entry: d.entry, type: d.type, volume: d.volume, price: d.price })));
          for (const c of closed) {
            const net = c.profit + c.commission + c.swap + c.fee;
            await tx.insert(schema.closedTrade).values({ tradingAccountId: acctId, ...c, netUsd: info.currency === "USD" ? net : null, fxRateToUsd: info.currency === "USD" ? 1 : null })
              .onConflictDoUpdate({ target: [schema.closedTrade.tradingAccountId, schema.closedTrade.positionId], set: { closePrice: c.closePrice, closeTime: c.closeTime, profit: c.profit, commission: c.commission, swap: c.swap, fee: c.fee, volume: c.volume } });
          }
        }
      }
      await tx.update(schema.providerConnection).set({ status: "connected", lastSyncAt: now, consecutiveFailures: 0, lastError: null }).where(eq(schema.providerConnection.id, connectionId));
      await tx.update(schema.syncRun).set({ finishedAt: new Date(), ok: true, dealsImported: deals.length }).where(eq(schema.syncRun.id, run!.id));
    });
    return { ok: true };
  } catch (e) {
    reportError(e, { where: "sync.syncConnection", extra: { connectionId } });
    const msg = e instanceof MetaApiError ? e.message : "Sync failed.";
    await db.update(schema.providerConnection).set({ status: "error", lastError: msg.slice(0, 300), lastErrorAt: new Date(), consecutiveFailures: sql`${schema.providerConnection.consecutiveFailures} + 1` }).where(eq(schema.providerConnection.id, connectionId));
    await db.update(schema.syncRun).set({ finishedAt: new Date(), ok: false, error: msg.slice(0, 300) }).where(eq(schema.syncRun.id, run!.id));
    return { ok: false, error: "Sync failed. It will retry automatically." };
  }
}

/** Removes the account from MetaApi (deleting the stored investor password there) and marks it disconnected. */
export async function revokeConnection(userId: string, tradingAccountId: string) {
  const [row] = await db.select({ c: schema.providerConnection }).from(schema.providerConnection)
    .innerJoin(schema.tradingAccount, eq(schema.tradingAccount.id, schema.providerConnection.tradingAccountId))
    .where(and(eq(schema.tradingAccount.id, tradingAccountId), eq(schema.tradingAccount.userId, userId)));
  if (!row) return { ok: false, error: "Account not found." };
  if (row.c.externalId && syncStatus().configured) {
    try { await client().remove(split(row.c.externalId).id); } catch (e) { if (!(e instanceof MetaApiError && e.status === 404)) { reportError(e, { where: "sync.revoke" }); return { ok: false, error: "MetaApi did not confirm the removal. Try again." }; } }
  }
  await db.update(schema.providerConnection).set({ status: "disconnected", externalId: null, secretCiphertext: null }).where(eq(schema.providerConnection.id, row.c.id));
  return { ok: true };
}

/** Connections due for a sync: connected/pending ones not synced in the last `minutes`. */
export async function dueConnections(minutes = 5, limit = 25) {
  return db.select({ id: schema.providerConnection.id }).from(schema.providerConnection)
    .where(and(inArray(schema.providerConnection.status, ["pending", "connected", "synchronizing", "error"]), sql`${schema.providerConnection.externalId} is not null`, sql`(${schema.providerConnection.lastSyncAt} is null or ${schema.providerConnection.lastSyncAt} < now() - (${minutes} * interval '1 minute'))`, sql`${schema.providerConnection.consecutiveFailures} < 20`))
    .limit(limit);
}
