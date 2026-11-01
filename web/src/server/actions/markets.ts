"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { DESK_SLOTS, INSTRUMENTS, isSymbol } from "@/lib/markets/registry";
import { coverageMap } from "../market/coverage";
import { marketDataStatus } from "../market/service";
import { marketPrefs, saveMarketPrefs } from "../market/prefs";
import { requireUser } from "../session";

export type MarketActionResult = { ok: true; desk: string[]; favorites: string[] } | { ok: false; error: string };

const slotSchema = z.object({ slot: z.number().int().min(0).max(DESK_SLOTS - 1), symbol: z.string().max(16) });

/**
 * Puts an instrument in one Macro Desk slot and saves it to the account. If the instrument is already on the desk the
 * two slots swap, so the desk always shows three different instruments.
 */
export async function setDeskInstrument(input: z.input<typeof slotSchema>): Promise<MarketActionResult> {
  const s = await requireUser();
  const p = slotSchema.safeParse(input);
  if (!p.success || !isSymbol(p.data.symbol)) return { ok: false, error: "Unknown instrument." };
  const { slot, symbol } = p.data;
  if (marketDataStatus().configured) {
    const c = (await coverageMap())[symbol];
    if (c?.state === "unavailable") return { ok: false, error: `${INSTRUMENTS[symbol]!.short} is not available on the connected market-data plan.` };
  }
  const cur = await marketPrefs(s.user.id);
  const desk = [...cur.desk];
  const existing = desk.indexOf(symbol);
  if (existing === slot) return { ok: true, ...cur };
  if (existing >= 0) desk[existing] = desk[slot]!;
  desk[slot] = symbol;
  const saved = await saveMarketPrefs(s.user.id, { desk });
  revalidatePath("/app/macro");
  revalidatePath("/app/markets");
  return { ok: true, ...saved };
}

export async function toggleFavorite(symbol: string): Promise<MarketActionResult> {
  const s = await requireUser();
  if (typeof symbol !== "string" || !isSymbol(symbol)) return { ok: false, error: "Unknown instrument." };
  const cur = await marketPrefs(s.user.id);
  const favorites = cur.favorites.includes(symbol) ? cur.favorites.filter((x) => x !== symbol) : [...cur.favorites, symbol];
  const saved = await saveMarketPrefs(s.user.id, { favorites });
  return { ok: true, ...saved };
}
