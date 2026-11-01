import "server-only";
import { eq } from "drizzle-orm";
import { cache } from "react";
import { normalizeDesk, isSymbol, SYMBOLS } from "@/lib/markets/registry";
import { reportError } from "@/lib/monitoring";
import { db, dbConfigured, schema } from "../db";

export interface MarketPrefs { desk: string[]; favorites: string[] }

/** The user's Macro Desk instruments and favourites. Always three valid, distinct desk symbols. */
export const marketPrefs = cache(async (userId: string): Promise<MarketPrefs> => {
  if (!dbConfigured) return { desk: normalizeDesk(null), favorites: [] };
  try {
    const [row] = await db.select().from(schema.userMarketPrefs).where(eq(schema.userMarketPrefs.userId, userId)).limit(1);
    return { desk: normalizeDesk(row?.desk), favorites: (row?.favorites ?? []).filter((s) => isSymbol(s)) };
  } catch (e) {
    reportError(e, { where: "market.prefs.read" });
    return { desk: normalizeDesk(null), favorites: [] };
  }
});

export async function saveMarketPrefs(userId: string, p: Partial<MarketPrefs>) {
  const cur = await marketPrefs(userId);
  const desk = normalizeDesk(p.desk ?? cur.desk);
  const favorites = [...new Set((p.favorites ?? cur.favorites).filter((s) => isSymbol(s)))].sort((a, b) => SYMBOLS.indexOf(a) - SYMBOLS.indexOf(b));
  await db.insert(schema.userMarketPrefs).values({ userId, desk, favorites })
    .onConflictDoUpdate({ target: schema.userMarketPrefs.userId, set: { desk, favorites, updatedAt: new Date() } });
  return { desk, favorites };
}
