import { ema } from "./indicators";
import { detectSwings } from "./swings";
import type { Candle } from "./types";

export const BIAS_ALGORITHM = "structure-ema-v1";

export type Bias = "bullish" | "bearish" | "neutral" | "insufficientData";
export type Structure = "higherHighsHigherLows" | "lowerHighsLowerLows" | "mixed";

export interface BiasResult {
  bias: Bias;
  structure: Structure | null;
  previousSwingHigh: number | null;
  latestSwingHigh: number | null;
  previousSwingLow: number | null;
  latestSwingLow: number | null;
  ema: number | null;
  close: number | null;
  invalidationLevel: number | null;
  rationale: string[];
  candleCount: number;
  algorithm: typeof BIAS_ALGORITHM;
}

const empty = (candleCount: number, reason: string): BiasResult => ({
  bias: "insufficientData",
  structure: null,
  previousSwingHigh: null,
  latestSwingHigh: null,
  previousSwingLow: null,
  latestSwingLow: null,
  ema: null,
  close: null,
  invalidationLevel: null,
  rationale: [reason],
  candleCount,
  algorithm: BIAS_ALGORITHM,
});

/** Market bias v1. Mirrors TreidifyCore MarketBiasEngine.swift and the Python engine (shared/test-vectors/bias.json). */
export function evaluateBias(
  candles: readonly Candle[],
  { swingStrength = 2, emaPeriod = 50, minimumCandles = 60 } = {},
): BiasResult {
  const required = Math.max(minimumCandles, emaPeriod);
  if (candles.length < required) {
    return empty(candles.length, `Only ${candles.length} candles; at least ${required} required.`);
  }
  const swings = detectSwings(candles, swingStrength);
  const highs = swings.filter((s) => s.kind === "high");
  const lows = swings.filter((s) => s.kind === "low");
  if (highs.length < 2 || lows.length < 2) {
    return empty(candles.length, "Fewer than two confirmed swing highs and lows.");
  }
  const h1 = highs.at(-2)!, h2 = highs.at(-1)!;
  const l1 = lows.at(-2)!, l2 = lows.at(-1)!;
  const structure: Structure =
    h2.price > h1.price && l2.price > l1.price
      ? "higherHighsHigherLows"
      : h2.price < h1.price && l2.price < l1.price
        ? "lowerHighsLowerLows"
        : "mixed";
  const e = ema(candles.map((c) => c.c), emaPeriod).at(-1)!;
  const close = candles.at(-1)!.c;
  let bias: Bias = "neutral";
  let invalidation: number | null = null;
  if (structure === "higherHighsHigherLows" && close > e && close > l2.price) {
    bias = "bullish";
    invalidation = l2.price;
  } else if (structure === "lowerHighsLowerLows" && close < e && close < h2.price) {
    bias = "bearish";
    invalidation = h2.price;
  }
  return {
    bias,
    structure,
    previousSwingHigh: h1.price,
    latestSwingHigh: h2.price,
    previousSwingLow: l1.price,
    latestSwingLow: l2.price,
    ema: e,
    close,
    invalidationLevel: invalidation,
    rationale: [
      `Swing highs ${h1.price} then ${h2.price}; swing lows ${l1.price} then ${l2.price}.`,
      `Structure: ${structure}.`,
      `Close ${close} vs EMA(${emaPeriod}) ${e.toFixed(5)}.`,
      `Classification: ${bias}.`,
    ],
    candleCount: candles.length,
    algorithm: BIAS_ALGORITHM,
  };
}
