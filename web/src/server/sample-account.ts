/**
 * Creates a clearly labelled SAMPLE trading account for one user. Rows use source = "sample", which the UI
 * always badges and which can never count toward community verification. Shared by the in-app
 * "Load demo account" action and the development seed script, so it must not import server-only.
 */
import { and, eq } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { sampleTrades } from "@/lib/demo/sample";
import * as schema from "./db/schema";

const START = 25_000;

export async function insertSampleAccount(db: PostgresJsDatabase<typeof schema>, userId: string, now = Date.now()) {
  const trades = sampleTrades(140);
  const shift = Math.floor(now / 1000) - 7200 - trades.at(-1)!.closeTime;
  const net = trades.reduce((a, t) => a + t.profit + t.commission + t.swap + t.fees, 0);
  return db.transaction(async (tx) => {
    const [acct] = await tx.insert(schema.tradingAccount).values({ userId, platform: "mt5", login: "SAMPLE", server: "Sample-Server", broker: "Sample broker", currency: "USD", nickname: "Sample MT5 account", source: "sample" }).returning();
    const id = acct!.id;
    await tx.insert(schema.cashFlow).values({ tradingAccountId: id, kind: "deposit", amount: START, at: new Date((trades[0]!.openTime + shift - 86_400) * 1000) });
    await tx.insert(schema.closedTrade).values(trades.map((t) => ({
      tradingAccountId: id, positionId: t.id, symbol: t.symbol, side: t.side, volume: t.volume,
      openPrice: 0, closePrice: 0, openTime: new Date((t.openTime + shift) * 1000), closeTime: new Date((t.closeTime + shift) * 1000),
      profit: t.profit, commission: t.commission, swap: t.swap, fee: t.fees, netUsd: t.profit + t.commission + t.swap + t.fees,
    })));
    await tx.insert(schema.position).values([
      { tradingAccountId: id, externalId: "S1", symbol: "XAUUSD", side: "buy", volume: 1, openPrice: 3962.4, currentPrice: 3968.6, stopLoss: 3948, takeProfit: 3995, floatingPnl: 620, openedAt: new Date(now - 5 * 3600_000) },
      { tradingAccountId: id, externalId: "S2", symbol: "XAGUSD", side: "sell", volume: 0.5, openPrice: 48.12, currentPrice: 48.31, stopLoss: 48.6, takeProfit: 47.2, floatingPnl: -475.8, openedAt: new Date(now - 9 * 3600_000) },
      { tradingAccountId: id, externalId: "S3", symbol: "EURUSD", side: "buy", volume: 1.5, openPrice: 1.1642, currentPrice: 1.16447, stopLoss: 1.161, takeProfit: 1.17, floatingPnl: 40, openedAt: new Date(now - 2 * 3600_000) },
    ]);
    await tx.insert(schema.accountSnapshot).values({ tradingAccountId: id, at: new Date(now), balance: START + net, equity: START + net + 184.2, floatingPnl: 184.2 });
    return { id, trades: trades.length, net };
  });
}

/** Deletes only this user's sample accounts; trades, positions and snapshots cascade. */
export async function deleteSampleAccounts(db: PostgresJsDatabase<typeof schema>, userId: string) {
  const rows = await db.delete(schema.tradingAccount).where(and(eq(schema.tradingAccount.userId, userId), eq(schema.tradingAccount.source, "sample"))).returning({ id: schema.tradingAccount.id });
  return rows.length;
}
