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
}

export interface AccountOverview {
  account: AccountSummary;
  balance: number | null;
  equity: number | null;
  floating: number | null;
  snapshotAt: string | null;
  startingEquity: number;
  trades: ClosedTrade[];
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
  }));
}

export async function accountOverview(userId: string, accountId: string | undefined, accounts?: AccountSummary[]): Promise<AccountOverview | null> {
  const list = accounts ?? (await listAccounts(userId));
  const account = list.find((a) => a.id === accountId) ?? list[0];
  if (!account) return null;

  const [snap] = await db.select().from(S.accountSnapshot).where(eq(S.accountSnapshot.tradingAccountId, account.id)).orderBy(desc(S.accountSnapshot.at)).limit(1);
  const rows = await db.select().from(S.closedTrade).where(eq(S.closedTrade.tradingAccountId, account.id)).orderBy(asc(S.closedTrade.closeTime));
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
  }));
  const net = trades.reduce((a, t) => a + t.profit + t.commission + t.swap + t.fees, 0);
  const deposits = flows.reduce((a, f) => a + f.amount, 0);
  // Trading-only equity starts from net deposits; without cash-flow history, back it out of the balance.
  const startingEquity = flows.length ? deposits : snap ? snap.balance - net : 0;

  return {
    account,
    balance: snap?.balance ?? null,
    equity: snap?.equity ?? null,
    floating: snap ? (snap.floatingPnl ?? snap.equity - snap.balance) : null,
    snapshotAt: snap?.at.toISOString() ?? null,
    startingEquity,
    trades,
  };
}
