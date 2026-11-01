import { analyzeLevels, evaluateBias, type Candle } from "@/lib/analytics";
import { mulberry32, sampleCandles } from "./sample";

export type SampleSymbol = "XAUUSD" | "DXY" | "XAGUSD";
export type SampleTf = "1D" | "4H" | "1H" | "15M" | "5M" | "1M";

const profile: Record<SampleSymbol, { start: number; vol: number; drift: number; seed: number; digits: number }> = {
  XAUUSD: { start: 3920, vol: 0.0042, drift: 0.04, seed: 7, digits: 2 },
  DXY: { start: 99.6, vol: 0.0016, drift: -0.03, seed: 11, digits: 3 },
  XAGUSD: { start: 47.2, vol: 0.0065, drift: 0.03, seed: 23, digits: 3 },
};
const tfScale: Record<SampleTf, { step: number; volMul: number; seedAdd: number }> = {
  "1D": { step: 86_400, volMul: 2.2, seedAdd: 500 },
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

/**
 * Consistent multi-timeframe SAMPLE bars: one 5-minute random walk aggregated into 15M, 1H and 4H, so every
 * timeframe describes the same (imaginary) market. Used only while market data is not connected, always labelled.
 */
const mtfCache = new Map<SampleSymbol, Record<"5M" | "15M" | "1H" | "4H", Candle[]>>();
export function sampleMtf(symbol: SampleSymbol): Record<"5M" | "15M" | "1H" | "4H", Candle[]> {
  const hit = mtfCache.get(symbol); if (hit) return hit;
  const p = profile[symbol];
  const rnd = mulberry32(p.seed * 7919);
  // A second stream adds occasional impulse legs (displacement) and sample tick volume without changing the base walk.
  const imp = mulberry32(p.seed * 104_729);
  const N = 48 * 150, step = 300, end = 1_793_000_000 - (1_793_000_000 % 14_400);
  const vol = p.vol * 0.16;
  const m5: Candle[] = [];
  let price = p.start, slow = 0, mid = 0, burst = 0, dir = 1;
  for (let i = 0; i < N; i++) {
    if (i % 420 === 0) slow = (rnd() - 0.5) * 0.5 + p.drift * 2;
    if (i % 36 === 0) mid = (rnd() - 0.5) * 0.9;
    const r1 = rnd(), r2 = rnd(), r3 = rnd();
    if (burst === 0 && imp() < 0.014) { burst = 2 + Math.floor(imp() * 3); dir = imp() < 0.5 + slow * 0.6 ? 1 : -1; }
    const o = price;
    let c: number, w = vol * price * 0.55;
    if (burst > 0) { c = Math.max(o + dir * (0.9 + imp() * 0.9) * vol * price, 0.01); w *= 0.25; burst--; }
    else c = Math.max(o + (r1 - 0.5 + slow * 0.22 + mid * 0.16) * vol * price, 0.01);
    const h = Math.max(o, c) + r2 * w, l = Math.min(o, c) - r3 * w;
    const v = Math.round((600 + imp() * 700) * (Math.abs(c - o) > vol * price * 0.8 ? 2.4 : 1));
    m5.push({ t: end - (N - i) * step, o, h, l, c, v });
    price = c;
  }
  const agg = (k: number) => { const out: Candle[] = []; for (let i = 0; i + k <= m5.length; i += k) { const s = m5.slice(i, i + k); out.push({ t: s[0]!.t, o: s[0]!.o, h: Math.max(...s.map((x) => x.h)), l: Math.min(...s.map((x) => x.l)), c: s.at(-1)!.c, v: s.reduce((a, x) => a + (x.v ?? 0), 0) }); } return out; };
  const r = { "5M": m5.slice(-400), "15M": agg(3).slice(-400), "1H": agg(12).slice(-400), "4H": agg(48) };
  mtfCache.set(symbol, r);
  return r;
}
