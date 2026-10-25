import { analyzeLevels, evaluateBias, type Candle } from "@/lib/analytics";
import { sampleCandles } from "./sample";

export type SampleSymbol = "XAUUSD" | "DXY" | "XAGUSD";
export type SampleTf = "4H" | "1H" | "15M" | "5M" | "1M";

const profile: Record<SampleSymbol, { start: number; vol: number; drift: number; seed: number; digits: number }> = {
  XAUUSD: { start: 3920, vol: 0.0042, drift: 0.04, seed: 7, digits: 2 },
  DXY: { start: 99.6, vol: 0.0016, drift: -0.03, seed: 11, digits: 3 },
  XAGUSD: { start: 47.2, vol: 0.0065, drift: 0.03, seed: 23, digits: 3 },
};
const tfScale: Record<SampleTf, { step: number; volMul: number; seedAdd: number }> = {
  "4H": { step: 14_400, volMul: 1, seedAdd: 0 },
  "1H": { step: 3600, volMul: 0.55, seedAdd: 100 },
  "15M": { step: 900, volMul: 0.3, seedAdd: 200 },
  "5M": { step: 300, volMul: 0.18, seedAdd: 300 },
  "1M": { step: 60, volMul: 0.09, seedAdd: 400 },
};

export const digitsFor = (s: SampleSymbol) => profile[s].digits;

/** Sample series per symbol and timeframe. Marketing previews only. */
export function sampleSeries(symbol: SampleSymbol, tf: SampleTf): Candle[] {
  const p = profile[symbol], s = tfScale[tf];
  return sampleCandles({ seed: p.seed + s.seedAdd, count: 140, start: p.start, vol: p.vol * s.volMul, drift: p.drift, stepSeconds: s.step });
}

export function sampleAnalysis(symbol: SampleSymbol, tf: SampleTf) {
  const candles = sampleSeries(symbol, tf);
  const last = candles.at(-1)!, prev = candles.at(-2)!;
  return { candles, bias: evaluateBias(candles), levels: analyzeLevels(candles), last: last.c, change: last.c - candles.at(-25)!.c, changePct: ((last.c - candles.at(-25)!.c) / candles.at(-25)!.c) * 100, prev: prev.c };
}

export const MTF: { tf: SampleTf; role: string }[] = [
  { tf: "4H", role: "Direction" },
  { tf: "1H", role: "Structure" },
  { tf: "15M", role: "Setup" },
  { tf: "5M", role: "Confirmation" },
  { tf: "1M", role: "Precision" },
];
