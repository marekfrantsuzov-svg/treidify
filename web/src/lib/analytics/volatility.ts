import { atr } from "./indicators";
import type { Candle } from "./types";

export type VolatilityRegime = "low" | "normal" | "elevated" | "insufficientData";

export interface VolatilityAnalysis {
  atr: number | null;
  atrPercent: number | null;
  percentile: number | null;
  regime: VolatilityRegime;
  sampleSize: number;
}

/** Regime from the percentile of the current ATR among the last `lookback` ATR values. */
export function analyzeVolatility(candles: readonly Candle[], atrPeriod = 14, lookback = 100): VolatilityAnalysis {
  const series = atr(candles, atrPeriod).filter((v): v is number => v !== null);
  const current = series.at(-1);
  const close = candles.at(-1)?.c;
  if (series.length < lookback || current === undefined || close === undefined) {
    return { atr: current ?? null, atrPercent: null, percentile: null, regime: "insufficientData", sampleSize: series.length };
  }
  const window = series.slice(-lookback);
  const percentile = (window.filter((v) => v < current).length / window.length) * 100;
  const regime: VolatilityRegime = percentile < 25 ? "low" : percentile > 75 ? "elevated" : "normal";
  return { atr: current, atrPercent: (current / close) * 100, percentile, regime, sampleSize: window.length };
}
