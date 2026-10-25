/**
 * Seeded sample data for marketing previews ONLY. Every component that renders it shows a
 * SampleBadge. It is never used on an authenticated dashboard and never labelled live.
 */
import type { Candle, ClosedTrade } from "@/lib/analytics";

export function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Random walk with slow regime changes so swing structure and zones appear naturally. */
export function sampleCandles({ seed, count, start, vol, drift = 0, stepSeconds = 14400, end = 1_793_000_000 }: {
  seed: number; count: number; start: number; vol: number; drift?: number; stepSeconds?: number; end?: number;
}): Candle[] {
  const rnd = mulberry32(seed);
  const out: Candle[] = [];
  let price = start;
  let regime = 0;
  for (let i = 0; i < count; i++) {
    if (i % 28 === 0) regime = (rnd() - 0.5) * 2.2;
    const o = price;
    const move = (rnd() - 0.5 + regime * 0.18 + drift) * vol * price;
    const c = Math.max(o + move, 0.01);
    const wick = vol * price * 0.6;
    const h = Math.max(o, c) + rnd() * wick;
    const l = Math.min(o, c) - rnd() * wick;
    out.push({ t: end - (count - i) * stepSeconds, o: round(o), h: round(h), l: round(l), c: round(c) });
    price = c;
  }
  return out;
}

const round = (v: number) => Math.round(v * 100) / 100;

export const sampleGold = () => sampleCandles({ seed: 7, count: 140, start: 3920, vol: 0.0042, drift: 0.04 });
export const sampleDxy = () => sampleCandles({ seed: 11, count: 140, start: 99.6, vol: 0.0016, drift: -0.03 });
export const sampleSilver = () => sampleCandles({ seed: 23, count: 140, start: 47.2, vol: 0.0065, drift: 0.03 });

/** A sample trade history used to demonstrate Account Health and the Journal. */
export function sampleTrades(count = 120, seed = 42): ClosedTrade[] {
  const rnd = mulberry32(seed);
  const trades: ClosedTrade[] = [];
  let t = 1_785_000_000;
  for (let i = 0; i < count; i++) {
    t += 3600 * (4 + Math.floor(rnd() * 30));
    const win = rnd() < 0.58;
    const size = 0.2 + Math.round(rnd() * 8) / 10;
    const profit = win ? (90 + rnd() * 420) * size : -(70 + rnd() * 260) * size;
    const symbol = rnd() < 0.72 ? "XAUUSD" : rnd() < 0.5 ? "XAGUSD" : "EURUSD";
    trades.push({
      id: `s${i}`,
      symbol,
      side: rnd() < 0.55 ? "buy" : "sell",
      volume: size,
      openTime: t - 3600 * (1 + Math.floor(rnd() * 9)),
      closeTime: t,
      profit: Math.round(profit * 100) / 100,
      commission: -Math.round(size * 7 * 100) / 100,
      swap: rnd() < 0.2 ? -Math.round(rnd() * 600) / 100 : 0,
      fees: 0,
    });
  }
  return trades;
}
