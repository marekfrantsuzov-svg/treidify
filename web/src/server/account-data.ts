import "server-only";
import { and, asc, desc, eq, inArray } from "drizzle-orm";
import type { ClosedTrade } from "@/lib/analytics";
import { db, schema } from "./db";

const S = schema;

export interface AccountSummary {
  id: string;
  label: string;
  platform: "mt4" | "mt5";
  login: string;
  server: string;
  broker: string | null;
  currency: string;
  source: string;
  status: (typeof S.connectionStatus.enumValues)[number] | null;
  lastSyncAt: string | null;
  lastError: string | null;
  lastErrorAt: string | null;
}

/** Id used by the account picker for the combined view of every real account in one currency. */
export const ALL_ACCOUNTS = "all";

/** Real (synced) accounts can be combined only when they share a currency; amounts are never converted silently. */
export function combinable(list: readonly AccountSummary[]) {
  const real = list.filter((a) => a.source === "provider");
  return real.length >= 2 && new Set(real.map((a) => a.currency)).size === 1 ? real : null;
}

export interface AccountOverview {
  account: AccountSummary;
  balance: number | null;
  equity: number | null;
  floating: number | null;
  snapshotAt: string | null;
  startingEquity: number;
  trades: ClosedTrade[];
  positions: (typeof S.position.$inferSelect)[];
  orders: (typeof S.pendingOrder.$inferSelect)[];
  margin: number | null;
  freeMargin: number | null;
  /** Equity / used margin × 100, as MetaTrader shows it. Null when no margin is in use. */
  marginLevel: number | null;
  /** Deposits minus withdrawals recorded in the synced history (never counted as profit). */
  netDeposits: number;
  /** Ids of the accounts included (more than one for the combined view). */
  accountIds: string[];
}

/** The user's trading accounts with their sync state. Only the owner's rows are ever read. */
export async function listAccounts(userId: string): Promise<AccountSummary[]> {
  const rows = await db
    .select({ a: S.tradingAccount, c: S.providerConnection })
    .from(S.tradingAccount)
    .leftJoin(S.providerConnection, eq(S.providerConnection.tradingAccountId, S.tradingAccount.id))
    .where(eq(S.tradingAccount.userId, userId))
    .orderBy(asc(S.tradingAccount.createdAt));
  return rows.map(({ a, c }) => ({
    id: a.id,
    label: a.nickname ?? `${a.platform.toUpperCase()} ${a.login}`,
    platform: a.platform,
    login: a.login,
    server: a.server,
    broker: a.broker,
    currency: a.currency ?? "USD",
    source: a.source,
    status: c?.status ?? null,
    lastSyncAt: c?.lastSyncAt?.toISOString() ?? null,
    lastError: c?.lastError ?? null,
    lastErrorAt: c?.lastErrorAt?.toISOString() ?? null,
  }));
}

export async function accountOverview(userId: string, accountId: string | undefined, accounts?: AccountSummary[]): Promise<AccountOverview | null> {
  const list = accounts ?? (await listAccounts(userId));
  if (accountId === ALL_ACCOUNTS) {
    const real = combinable(list);
    if (real) return combinedOverview(real);
  }
  const account = list.find((a) => a.id === accountId) ?? list[0];
  if (!account) return null;
  return singleOverview(account);
}

async function singleOverview(account: AccountSummary): Promise<AccountOverview> {
  const [snap] = await db.select().from(S.accountSnapshot).where(eq(S.accountSnapshot.tradingAccountId, account.id)).orderBy(desc(S.accountSnapshot.at)).limit(1);
  const rows = await db.select().from(S.closedTrade).where(eq(S.closedTrade.tradingAccountId, account.id)).orderBy(asc(S.closedTrade.closeTime));
  const positions = await db.select().from(S.position).where(eq(S.position.tradingAccountId, account.id)).orderBy(desc(S.position.openedAt));
  const orders = await db.select().from(S.pendingOrder).where(eq(S.pendingOrder.tradingAccountId, account.id)).orderBy(desc(S.pendingOrder.placedAt));
  const flows = await db.select({ amount: S.cashFlow.amount }).from(S.cashFlow).where(and(eq(S.cashFlow.tradingAccountId, account.id), inArray(S.cashFlow.kind, ["deposit", "withdrawal", "transfer_in", "transfer_out"])));

  const trades: ClosedTrade[] = rows.map((r) => ({
    id: r.id,
    symbol: r.symbol,
    side: r.side === "sell" ? "sell" : "buy",
    volume: r.volume,
    openTime: Math.floor(r.openTime.getTime() / 1000),
    closeTime: Math.floor(r.closeTime.getTime() / 1000),
    profit: r.profit,
    commission: r.commission,
    swap: r.swap,
    fees: r.fee,
    openPrice: r.openPrice,
    closePrice: r.closePrice,
  }));
  const net = trades.reduce((a, t) => a + t.profit + t.commission + t.swap + t.fees, 0);
  const deposits = flows.reduce((a, f) => a + f.amount, 0);
  // Trading-only equity starts from net deposits; without cash-flow history, back it out of the balance.
  const startingEquity = flows.length ? deposits : snap ? snap.balance - net : 0;
  const margin = snap?.margin ?? null;

  return {
    account,
    balance: snap?.balance ?? null,
    equity: snap?.equity ?? null,
    floating: snap ? (snap.floatingPnl ?? snap.equity - snap.balance) : null,
    snapshotAt: snap?.at.toISOString() ?? null,
    startingEquity,
    trades,
    positions,
    orders,
    margin,
    freeMargin: snap?.freeMargin ?? null,
    marginLevel: snap && margin && margin > 0 ? (snap.equity / margin) * 100 : null,
    netDeposits: deposits,
    accountIds: [account.id],
  };
}

/** Sums balances, equity, margin and history of same-currency accounts. The snapshot time is the oldest one, so it never overstates freshness. */
async function combinedOverview(real: AccountSummary[]): Promise<AccountOverview> {
  const parts = await Promise.all(real.map(singleOverview));
  const sum = (f: (o: AccountOverview) => number | null) => parts.every((o) => f(o) !== null) ? parts.reduce((a, o) => a + f(o)!, 0) : null;
  const margin = sum((o) => o.margin ?? 0), equity = sum((o) => o.equity);
  const snaps = parts.map((o) => o.snapshotAt).filter((x): x is string => !!x).sort();
  const okAll = real.every((a) => a.status === "connected");
  const lastSyncs = real.map((a) => a.lastSyncAt).filter((x): x is string => !!x).sort();
  return {
    account: {
      id: ALL_ACCOUNTS, label: `All accounts (${real.length})`, platform: real[0]!.platform, login: "", server: "", broker: null, currency: real[0]!.currency, source: "provider",
      status: okAll ? "connected" : real.some((a) => a.status === "connected") ? "synchronizing" : real[0]!.status, lastSyncAt: lastSyncs[0] ?? null, lastError: real.find((a) => a.lastError)?.lastError ?? null, lastErrorAt: null,
    },
    balance: sum((o) => o.balance),
    equity,
    floating: sum((o) => o.floating),
    snapshotAt: snaps[0] ?? null,
    startingEquity: parts.reduce((a, o) => a + o.startingEquity, 0),
    trades: parts.flatMap((o) => o.trades).sort((a, b) => a.closeTime - b.closeTime),
    positions: parts.flatMap((o) => o.positions),
    orders: parts.flatMap((o) => o.orders),
    margin: margin || null,
    freeMargin: sum((o) => o.freeMargin),
    marginLevel: equity !== null && margin ? (equity / margin) * 100 : null,
    netDeposits: parts.reduce((a, o) => a + o.netDeposits, 0),
    accountIds: real.map((a) => a.id),
  };
}

/** Options for the account picker: each account, plus "All accounts" when they can be combined honestly. */
export function pickerOptions(list: readonly AccountSummary[]) {
  const opts = list.map((a) => ({ id: a.id, label: a.label }));
  const real = combinable(list);
  return real ? [{ id: ALL_ACCOUNTS, label: `All accounts (${real.length}, ${real[0]!.currency})` }, ...opts] : opts;
}
