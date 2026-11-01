import type { Candle } from "@/lib/analytics/types";

/**
 * ICE US Dollar Index formula (published by ICE Futures U.S.):
 *   DXY = 50.14348112 × EURUSD^-0.576 × USDJPY^0.136 × GBPUSD^-0.119 × USDCAD^0.091 × USDSEK^0.042 × USDCHF^0.036
 */
export const DXY_CONSTANT = 50.14348112;
export const DXY_WEIGHTS = [
  { pair: "EURUSD", exp: -0.576 },
  { pair: "USDJPY", exp: 0.136 },
  { pair: "GBPUSD", exp: -0.119 },
  { pair: "USDCAD", exp: 0.091 },
  { pair: "USDSEK", exp: 0.042 },
  { pair: "USDCHF", exp: 0.036 },
] as const;
export type DxyPair = (typeof DXY_WEIGHTS)[number]["pair"];

export function dxyValue(px: Record<DxyPair, number>): number {
  return DXY_WEIGHTS.reduce((acc, w) => acc * Math.pow(px[w.pair], w.exp), DXY_CONSTANT);
}

/**
 * Builds DXY bars from the six component series, using only bars whose open time exists in all six.
 * Open and close are exact (all components share the bar boundary). Component highs and lows are not simultaneous,
 * so the bar's high and low are bounded by its open and close only: the computed range is never wider than what
 * can be proven. Callers must label these bars as computed.
 */
export function computeDxyCandles(series: Record<DxyPair, readonly Candle[]>): Candle[] {
  const maps = DXY_WEIGHTS.map((w) => new Map(series[w.pair].map((c) => [c.t, c])));
  const times = [...maps[0]!.keys()].filter((t) => maps.every((m) => m.has(t))).sort((a, b) => a - b);
  return times.map((t) => {
    const at = (k: "o" | "c") => Object.fromEntries(DXY_WEIGHTS.map((w, i) => [w.pair, maps[i]!.get(t)![k]])) as Record<DxyPair, number>;
    const o = dxyValue(at("o"));
    const c = dxyValue(at("c"));
    return { t, o, h: Math.max(o, c), l: Math.min(o, c), c };
  });
}
