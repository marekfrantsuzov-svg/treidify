/**
 * Illustrative data for the landing page mockups. Nothing here is market, news or account data: it is generated
 * from a fixed seed so every visitor sees the same example, and every surface that renders it is labelled
 * "Illustrative". Stop distances run through the real pip rule in `lib/trading/pips.ts`, so the examples obey the
 * same 50-pip XAUUSD limit as the product.
 */
import { formatPips, stopCheck } from "@/lib/trading/pips";

export type Tf = "15M" | "1H" | "4H";
export const TFS: Tf[] = ["15M", "1H", "4H"];

export interface Candle { o: number; h: number; l: number; c: number }
export interface Zone { kind: "demand" | "supply"; lo: number; hi: number; from: number; label: string }
export interface Level { price: number; label: string }
export interface Liquidity { price: number; label: string; side: "buy" | "sell"; from: number; to: number }

export interface TfScene {
  tf: Tf;
  candles: Candle[];
  min: number;
  max: number;
  zones: Zone[];
  fib: Level[];
  liquidity: Liquidity[];
  structure: "Bullish" | "Bearish";
  /** One-line read for the timeframe, written for the illustration. */
  read: string;
  setup: { zone: string; entry: number; stop: number; pips: number; eligible: boolean; text: string; status: string };
}

/** mulberry32: tiny deterministic PRNG so server and client render identical candles. */
function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Candles that follow a scripted path through `anchors`, with seeded noise and wicks. */
function candlesFrom(anchors: number[], n: number, noise: number, wick: number, seed: number): Candle[] {
  const r = rng(seed);
  const out: Candle[] = [];
  const seg = (n - 1) / (anchors.length - 1);
  let prev = anchors[0]!;
  for (let i = 0; i < n; i++) {
    const k = Math.min(anchors.length - 2, Math.floor(i / seg));
    const t = (i - k * seg) / seg;
    const ease = t * t * (3 - 2 * t);
    const a0 = anchors[k]!;
    const target = a0 + (anchors[k + 1]! - a0) * ease;
    const c = target + (r() - 0.5) * noise;
    const o = prev;
    const h = Math.max(o, c) + r() * wick;
    const l = Math.min(o, c) - r() * wick;
    out.push({ o, h, l, c });
    prev = c;
  }
  return out;
}

const round = (n: number) => Math.round(n * 100) / 100;

function setupFor(zone: Zone, stop: number, status: string) {
  const entry = zone.kind === "demand" ? zone.hi : zone.lo;
  const check = stopCheck("XAUUSD", entry, stop);
  return {
    zone: `${zone.kind === "demand" ? "Buy" : "Sell"} zone ${fmt(zone.lo)} – ${fmt(zone.hi)}`,
    entry,
    stop,
    pips: check.pips,
    eligible: check.eligible,
    text: formatPips("XAUUSD", check.pips),
    status: check.eligible ? status : "WAIT · NO VALID SETUP",
  };
}

function scene(
  tf: Tf,
  anchors: number[],
  n: number,
  noise: number,
  wick: number,
  seed: number,
  rest: Omit<TfScene, "tf" | "candles" | "min" | "max" | "setup"> & { setupZone: number; stop: number; status: string },
): TfScene {
  const candles = candlesFrom(anchors, n, noise, wick, seed);
  const lows = candles.map((c) => c.l);
  const highs = candles.map((c) => c.h);
  const pad = (Math.max(...highs) - Math.min(...lows)) * 0.12;
  const min = Math.min(...lows, ...rest.zones.map((z) => z.lo)) - pad;
  const max = Math.max(...highs, ...rest.zones.map((z) => z.hi)) + pad;
  const { setupZone, stop, status, ...scene } = rest;
  return { tf, candles, min, max, ...scene, setup: setupFor(rest.zones[setupZone]!, stop, status) };
}

export const fmt = (n: number) => n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const fibLevels = (lo: number, hi: number): Level[] =>
  [0.382, 0.5, 0.618].map((r) => ({ price: round(hi - (hi - lo) * r), label: `${(r * 100).toFixed(1).replace(".0", "")}%` }));

export const SCENES: Record<Tf, TfScene> = {
  "4H": scene("4H", [4046, 4098, 4062, 4128, 4096, 4154, 4120, 4131], 64, 6, 5, 11, {
    structure: "Bullish",
    read: "Higher highs and higher lows since the 4,062 low. The big picture favours buyers above the 4H demand zone.",
    zones: [
      { kind: "demand", lo: 4054.2, hi: 4066.8, from: 14, label: "4H demand" },
      { kind: "supply", lo: 4149.6, hi: 4161.0, from: 46, label: "4H supply" },
    ],
    fib: fibLevels(4062, 4154),
    liquidity: [
      { price: 4061.0, label: "Sell-side liquidity", side: "sell", from: 16, to: 64 },
      { price: 4156.4, label: "Buy-side liquidity", side: "buy", from: 46, to: 64 },
    ],
    setupZone: 0,
    stop: 4052.0,
    status: "Awaiting 5M confirmation",
  }),
  "1H": scene("1H", [4092, 4118, 4100, 4126, 4104, 4131, 4112, 4118], 64, 3.2, 2.6, 7, {
    structure: "Bullish",
    read: "1H holds above the 4,098 demand zone. A pullback into it, with a 5M change of character, would be the setup.",
    zones: [
      { kind: "demand", lo: 4098.0, hi: 4101.2, from: 22, label: "1H demand" },
      { kind: "supply", lo: 4129.4, hi: 4132.6, from: 50, label: "1H supply" },
    ],
    fib: fibLevels(4104, 4131),
    liquidity: [
      { price: 4100.0, label: "Equal lows", side: "sell", from: 24, to: 64 },
      { price: 4131.8, label: "Equal highs", side: "buy", from: 52, to: 64 },
    ],
    setupZone: 0,
    stop: 4097.4,
    status: "Awaiting 5M confirmation",
  }),
  "15M": scene("15M", [4112, 4106, 4114, 4105, 4118, 4110, 4120, 4115], 64, 1.4, 1.2, 3, {
    structure: "Bearish",
    read: "15M is pulling back inside the 1H range. Lower highs into the 4,119 supply keep short-term pressure down.",
    zones: [
      { kind: "demand", lo: 4103.6, hi: 4105.8, from: 12, label: "15M demand" },
      { kind: "supply", lo: 4118.4, hi: 4120.6, from: 50, label: "15M supply" },
    ],
    fib: fibLevels(4105, 4120),
    liquidity: [
      { price: 4104.8, label: "Sell-side liquidity", side: "sell", from: 14, to: 64 },
      { price: 4121.0, label: "Buy-side liquidity", side: "buy", from: 50, to: 64 },
    ],
    setupZone: 0,
    stop: 4103.0,
    status: "Awaiting 5M confirmation",
  }),
};

/** A month of illustrative journal results (P&L in account currency, null = no trades). */
export const JOURNAL_MONTH: { day: number; pnl: number | null; trades: number }[] = (() => {
  const r = rng(65);
  const out: { day: number; pnl: number | null; trades: number }[] = [];
  for (let d = 1; d <= 30; d++) {
    const dow = (d + 5) % 7; // month starts on a Saturday in this example
    if (dow === 0 || dow === 6) { out.push({ day: d, pnl: null, trades: 0 }); continue; }
    if (r() < 0.12) { out.push({ day: d, pnl: null, trades: 0 }); continue; }
    const win = r() < 0.6;
    const size = 40 + Math.round(r() * 320);
    out.push({ day: d, pnl: win ? size : -Math.round(size * 0.75), trades: 1 + Math.floor(r() * 4) });
  }
  return out;
})();

export const EQUITY: number[] = (() => {
  let v = 10000;
  return [10000, ...JOURNAL_MONTH.filter((d) => d.pnl !== null).map((d) => (v += d.pnl as number))];
})();
