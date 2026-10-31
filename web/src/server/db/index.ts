import "server-only";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

const url = process.env.DATABASE_URL;

declare global {
  // eslint-disable-next-line no-var
  var __treidifySql: ReturnType<typeof postgres> | undefined;
}

/** True when a database is configured. Pages show a clear setup state when it is not. */
export const dbConfigured = Boolean(url);

const client = url ? (globalThis.__treidifySql ??= postgres(url, { max: process.env.VERCEL ? 3 : 10, idle_timeout: 20, prepare: false })) : undefined;

export const db = drizzle(client ?? postgres("postgres://unconfigured@127.0.0.1:1/none", { max: 1 }), { schema });
export { schema };
