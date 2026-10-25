import { detectSwings } from "./swings";
import type { Candle, SwingPoint } from "./types";

export const FIB_RATIOS = [0, 0.236, 0.382, 0.5, 0.618, 0.786, 1] as const;

export interface FibonacciRetracement {
  direction: "up" | "down";
  swingHigh: SwingPoint;
  swingLow: SwingPoint;
  levels: { ratio: number; price: number }[];
}

/** Retracement of the latest leg between the most recent confirmed swing high and low. */
export function latestFibonacci(candles: readonly Candle[], swingStrength = 2): FibonacciRetracement | null {
  const swings = detectSwings(candles, swingStrength);
  const high = swings.findLast((s) => s.kind === "high");
  const low = swings.findLast((s) => s.kind === "low");
  if (!high || !low || high.price <= low.price) return null;
  const direction = low.index < high.index ? "up" : "down";
  const range = high.price - low.price;
  return {
    direction,
    swingHigh: high,
    swingLow: low,
    levels: FIB_RATIOS.map((r) => ({ ratio: r, price: direction === "up" ? high.price - range * r : low.price + range * r })),
  };
}
