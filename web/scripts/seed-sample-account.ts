/**
 * Development only. Attaches a clearly labelled SAMPLE trading account to an existing user so the
 * dashboard can be exercised before a sync provider is connected. Rows use source = "sample", which
 * the UI always badges and which can never count toward community verification.
 *
 *   npx tsx scripts/seed-sample-account.ts you@example.com
 */
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { sampleTrades } from "../src/lib/demo/sample";
import * as schema from "../src/server/db/schema";

if (process.env.NODE_ENV === "production") throw new Error("Refusing to seed sample data in production.");
const email = process.argv[2];
if (!email || !process.env.DATABASE_URL) throw new Error("Usage: DATABASE_URL=… npx tsx scripts/seed-sample-account.ts <email>");

const sql = postgres(process.env.DATABASE_URL, { max: 1 });
const db = drizzle(sql, { schema });

const [u] = await db.select().from(schema.user).where(eq(schema.user.email, email));
if (!u) throw new Error(`No user with email ${email}`);

const trades = sampleTrades(140);
const shift = Math.floor(Date.now() / 1000) - 7200 - trades.at(-1)!.closeTime;
const START = 25_000;

const [acct] = await db.insert(schema.tradingAccount).values({ userId: u.id, platform: "mt5", login: "SAMPLE", server: "Sample-Server", broker: "Sample broker", currency: "USD", nickname: "Sample MT5 account", source: "sample" }).returning();
await db.insert(schema.cashFlow).values({ tradingAccountId: acct!.id, kind: "deposit", amount: START, at: new Date((trades[0]!.openTime + shift - 86_400) * 1000) });
await db.insert(schema.closedTrade).values(trades.map((t) => ({
  tradingAccountId: acct!.id, positionId: t.id, symbol: t.symbol, side: t.side, volume: t.volume,
  openPrice: 0, closePrice: 0, openTime: new Date((t.openTime + shift) * 1000), closeTime: new Date((t.closeTime + shift) * 1000),
  profit: t.profit, commission: t.commission, swap: t.swap, fee: t.fees, netUsd: t.profit + t.commission + t.swap + t.fees,
})));
const net = trades.reduce((a, t) => a + t.profit + t.commission + t.swap + t.fees, 0);
await db.insert(schema.accountSnapshot).values({ tradingAccountId: acct!.id, at: new Date(), balance: START + net, equity: START + net + 184.2, floatingPnl: 184.2 });
console.log(`Seeded sample account ${acct!.id} for ${email}: ${trades.length} trades, net ${net.toFixed(2)}`);
await sql.end();
