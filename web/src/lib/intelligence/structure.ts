import { detectSwings } from "@/lib/analytics/swings";
import type { Candle, SwingPoint } from "@/lib/analytics/types";

/**
 * Market structure from confirmed fractal swings (strength 2 by default, so a swing is known 2 bars after it forms).
 *
 * Rules (documented in docs/INTELLIGENCE_METHODOLOGY.md):
 * - A swing becomes "active" only once confirmed, i.e. at bar index + strength. Nothing repaints.
 * - A bar CLOSE above the most recent active, unbroken swing high is a bullish break; below the most recent active,
 *   unbroken swing low is a bearish break. Wicks do not count.
 * - The first break sets the trend. A break in the trend's direction is a Break of Structure (BOS); a break against
 *   it is a Change of Character (CHOCH) and flips the trend.
 * - Each swing can be broken once.
 */
export type Trend = "bullish" | "bearish" | "none";
export interface StructureEvent { kind: "BOS" | "CHOCH"; direction: "bullish" | "bearish"; index: number; t: number; level: number; swing: SwingPoint }
export interface StructureResult { trend: Trend; events: StructureEvent[]; swings: SwingPoint[]; lastHigh: SwingPoint | null; lastLow: SwingPoint | null }

export function analyzeStructure(candles: readonly Candle[], strength = 2): StructureResult {
  const swings = detectSwings(candles, strength);
  const byConfirm = new Map<number, SwingPoint[]>();
  for (const s of swings) {
    const at = s.index + strength;
    byConfirm.set(at, [...(byConfirm.get(at) ?? []), s]);
  }
  let trend: Trend = "none";
  let high: SwingPoint | null = null, low: SwingPoint | null = null;
  let highBroken = false, lowBroken = false;
  const events: StructureEvent[] = [];
  for (let i = 0; i < candles.length; i++) {
    for (const s of byConfirm.get(i) ?? []) {
      if (s.kind === "high") { high = s; highBroken = false; } else { low = s; lowBroken = false; }
    }
    const c = candles[i]!;
    if (high && !highBroken && i > high.index && c.c > high.price) {
      events.push({ kind: trend === "bearish" ? "CHOCH" : "BOS", direction: "bullish", index: i, t: c.t, level: high.price, swing: high });
      trend = "bullish"; highBroken = true;
    }
    if (low && !lowBroken && i > low.index && c.c < low.price) {
      events.push({ kind: trend === "bullish" ? "CHOCH" : "BOS", direction: "bearish", index: i, t: c.t, level: low.price, swing: low });
      trend = "bearish"; lowBroken = true;
    }
  }
  return { trend, events, swings, lastHigh: swings.findLast((s) => s.kind === "high") ?? null, lastLow: swings.findLast((s) => s.kind === "low") ?? null };
}
