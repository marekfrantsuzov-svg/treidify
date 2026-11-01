import type { Candle, SwingPoint } from "@/lib/analytics/types";
import type { StructureResult } from "./structure";

export const FIB_LEVELS = [0.236, 0.382, 0.5, 0.618, 0.786, 0.886] as const;

/**
 * Anchor selection (documented in docs/INTELLIGENCE_METHODOLOGY.md):
 * - Bullish trend: the leg starts at the most recent confirmed swing low before the latest bullish BOS/CHOCH bar
 *   (where the move began) and ends at the highest high traded since that low. Retracements are measured down from it.
 * - Bearish trend: the mirror image.
 * - No trend: no Fibonacci is drawn. We never pick an arbitrary pair of points.
 * - If price has since closed beyond the origin, the leg is void and nothing is returned.
 */
export interface FibLeg { direction: "up" | "down"; from: SwingPoint; to: SwingPoint; levels: { ratio: number; price: number }[] }

export function structuralFib(candles: readonly Candle[], s: StructureResult): FibLeg | null {
  if (s.trend === "none") return null;
  const bull = s.trend === "bullish";
  const ev = s.events.findLast((e) => e.direction === s.trend);
  if (!ev) return null;
  const origin = s.swings.findLast((x) => x.kind === (bull ? "low" : "high") && x.index < ev.index);
  if (!origin) return null;
  let toIdx = origin.index;
  for (let i = origin.index + 1; i < candles.length; i++) {
    if (bull ? candles[i]!.h > candles[toIdx]!.h : candles[i]!.l < candles[toIdx]!.l) toIdx = i;
  }
  const toBar = candles[toIdx]!;
  const to: SwingPoint = { kind: bull ? "high" : "low", index: toIdx, t: toBar.t, price: bull ? toBar.h : toBar.l };
  const range = Math.abs(to.price - origin.price);
  if (range <= 0 || toIdx === origin.index) return null;
  const voided = candles.slice(toIdx + 1).some((b) => (bull ? b.c < origin.price : b.c > origin.price));
  if (voided) return null;
  return {
    direction: bull ? "up" : "down",
    from: origin,
    to,
    levels: FIB_LEVELS.map((r) => ({ ratio: r, price: bull ? to.price - range * r : to.price + range * r })),
  };
}
