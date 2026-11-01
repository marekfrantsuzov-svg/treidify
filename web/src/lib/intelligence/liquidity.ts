import { cluster } from "@/lib/analytics/levels";
import type { Candle, SwingPoint } from "@/lib/analytics/types";

/**
 * Liquidity context.
 * - Equal highs / lows: two or more confirmed swing highs (lows) within `equalTolATR` × ATR of each other. Resting
 *   orders are assumed to sit just beyond them. Only pools price has not yet traded through are returned.
 * - Sweep: within the last `lookback` bars, a bar's wick trades beyond a prior swing high (low) but the bar CLOSES back
 *   on the original side. A sweep of highs is bearish context (buy-side taken), of lows bullish context.
 */
export interface LiquidityPool { side: "buy" | "sell"; price: number; lower: number; upper: number; swings: number; lastT: number }
export interface Sweep { side: "buy" | "sell"; index: number; t: number; level: number; direction: "bullish" | "bearish" }

export function equalLevels(candles: readonly Candle[], swings: readonly SwingPoint[], atr: number, equalTolATR = 0.15): LiquidityPool[] {
  const out: LiquidityPool[] = [];
  for (const kind of ["high", "low"] as const) {
    for (const g of cluster(swings.filter((s) => s.kind === kind), equalTolATR * atr)) {
      if (g.length < 2) continue;
      const prices = g.map((s) => s.price);
      const lower = Math.min(...prices), upper = Math.max(...prices);
      const lastIdx = Math.max(...g.map((s) => s.index));
      const taken = candles.slice(lastIdx + 1).some((b) => (kind === "high" ? b.h > upper : b.l < lower));
      if (!taken) out.push({ side: kind === "high" ? "buy" : "sell", price: kind === "high" ? upper : lower, lower, upper, swings: g.length, lastT: Math.max(...g.map((s) => s.t)) });
    }
  }
  return out;
}

export function recentSweeps(candles: readonly Candle[], swings: readonly SwingPoint[], lookback = 12, strength = 2): Sweep[] {
  const out: Sweep[] = [];
  const start = Math.max(0, candles.length - lookback);
  for (let i = start; i < candles.length; i++) {
    const b = candles[i]!;
    // Only swings confirmed before this bar count.
    const prior = swings.filter((s) => s.index + strength < i);
    const hi = prior.findLast((s) => s.kind === "high");
    const lo = prior.findLast((s) => s.kind === "low");
    if (hi && b.h > hi.price && b.c < hi.price) out.push({ side: "buy", index: i, t: b.t, level: hi.price, direction: "bearish" });
    if (lo && b.l < lo.price && b.c > lo.price) out.push({ side: "sell", index: i, t: b.t, level: lo.price, direction: "bullish" });
  }
  return out;
}
