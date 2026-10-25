import type { Candle, SwingPoint } from "./types";

/**
 * Fractal swings: strictly beyond the `strength` bars to the left and at least equal
 * to the `strength` bars to the right. Only confirmed swings are returned, so results never repaint.
 */
export function detectSwings(candles: readonly Candle[], strength = 2): SwingPoint[] {
  if (strength <= 0) throw new RangeError("strength must be positive");
  const swings: SwingPoint[] = [];
  if (candles.length < strength * 2 + 1) return swings;
  for (let i = strength; i < candles.length - strength; i++) {
    const c = candles[i]!;
    const left = candles.slice(i - strength, i);
    const right = candles.slice(i + 1, i + 1 + strength);
    if (left.every((x) => c.h > x.h) && right.every((x) => c.h >= x.h)) {
      swings.push({ kind: "high", index: i, t: c.t, price: c.h });
    }
    if (left.every((x) => c.l < x.l) && right.every((x) => c.l <= x.l)) {
      swings.push({ kind: "low", index: i, t: c.t, price: c.l });
    }
  }
  return swings;
}
