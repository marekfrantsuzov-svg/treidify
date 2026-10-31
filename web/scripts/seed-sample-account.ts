/**
 * Development only. Attaches a clearly labelled SAMPLE trading account to an existing user so the
 * dashboard can be exercised before a sync provider is connected. Users can do the same in the app
 * with "Load demo account" under Trading accounts.
 *
 *   npx tsx scripts/seed-sample-account.ts you@example.com
 */
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "../src/server/db/schema";
import { insertSampleAccount } from "../src/server/sample-account";

if (process.env.NODE_ENV === "production") throw new Error("Refusing to seed sample data in production.");
const email = process.argv[2];
if (!email || !process.env.DATABASE_URL) throw new Error("Usage: DATABASE_URL=… npx tsx scripts/seed-sample-account.ts <email>");

const sql = postgres(process.env.DATABASE_URL, { max: 1 });
const db = drizzle(sql, { schema });

const [u] = await db.select().from(schema.user).where(eq(schema.user.email, email));
if (!u) throw new Error(`No user with email ${email}`);
const r = await insertSampleAccount(db, u.id);
console.log(`Seeded sample account ${r.id} for ${email}: ${r.trades} trades, net ${r.net.toFixed(2)}`);
await sql.end();
