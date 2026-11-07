/**
 * Illustrative data for the animated product showcase on the homepage hero.
 *
 * Nothing in this file is market, news or account data, and nothing here is fetched: candles come from a fixed seed,
 * so every visitor sees the same example, and every surface that renders them is labelled "Illustrative". The showcase
 * never imports account, broker, market-data or AI modules. Stops run through the real pip rule in
 * `lib/trading/pips.ts`, so the example setups obey the same 50-pip XAUUSD limit as the product.
 */
import { formatPips, stopCheck } from "@/lib/trading/pips";
import { EQUITY, JOURNAL_MONTH, candlesFrom, fmt, type Candle } from "../lx/data";

export { EQUITY, JOURNAL_MONTH, fmt };

/** Scene order and length (ms). One loop is about 28 seconds. */
export const SCENES = [
  { id: "connect", label: "MT5 sync", nav: 0, ms: 6200 },
  { id: "bull", label: "Bullish 4H", nav: 2, ms: 6400 },
  { id: "bear", label: "Bearish 1H", nav: 2, ms: 5000 },
  { id: "journal", label: "Journal", nav: 6, ms: 5400 },
  { id: "macro", label: "Macro & AI", nav: 3, ms: 6400 },
] as const;
export type SceneId = (typeof SCENES)[number]["id"];

export const ACCOUNT = { balance: 24860.4, pnl30: 1284.6, winRate: 58.2, profitFactor: 1.64, health: 82, trades: 34 };

export interface Pivot { i: number; label: string; at: "high" | "low" }
export interface Scenario {
  id: "bull" | "bear";
  tf: "4H" | "1H";
  bias: "BULLISH" | "BEARISH";
  candles: Candle[];
  min: number;
  max: number;
  pivots: Pivot[];
  /** Break of structure: the level that was broken, from the pivot that set it to the candle that broke it. */
  bos: { price: number; from: number; to: number };
  zone: { kind: "demand" | "supply"; lo: number; hi: number; from: number };
  entry: number;
  stop: number;
  pips: number;
  eligible: boolean;
  stopText: string;
  read: string;
  watch: string[];
}

function scenario(
  id: Scenario["id"],
  tf: Scenario["tf"],
  anchors: number[],
  seed: number,
  rest: Pick<Scenario, "pivots" | "zone" | "read" | "watch"> & { bosPivot: number; stop: number },
): Scenario {
  const candles = candlesFrom(anchors, 56, 2.4, 2.1, seed);
  const lows = candles.map((c) => c.l);
  const highs = candles.map((c) => c.h);
  const pad = (Math.max(...highs) - Math.min(...lows)) * 0.1;
  const min = Math.min(...lows, rest.zone.lo) - pad;
  const max = Math.max(...highs, rest.zone.hi) + pad;
  const bull = id === "bull";
  const p = rest.pivots[rest.bosPivot]!;
  const level = bull ? candles[p.i]!.h : candles[p.i]!.l;
  const broke = candles.findIndex((c, i) => i > p.i && (bull ? c.c > level : c.c < level));
  const entry = rest.zone.kind === "demand" ? rest.zone.hi : rest.zone.lo;
  const check = stopCheck("XAUUSD", entry, rest.stop);
  return {
    id, tf, bias: bull ? "BULLISH" : "BEARISH", candles, min, max,
    pivots: rest.pivots, zone: rest.zone, read: rest.read, watch: rest.watch,
    bos: { price: level, from: p.i, to: broke < 0 ? candles.length - 1 : broke },
    entry, stop: rest.stop, pips: check.pips, eligible: check.eligible, stopText: formatPips("XAUUSD", check.pips),
  };
}

/** Bullish 4H example: low, higher low, break above the last high, pullback toward the demand zone. */
export const BULL = scenario("bull", "4H", [4130, 4088, 4114, 4099, 4128, 4106], 21, {
  pivots: [
    { i: 11, label: "Low", at: "low" },
    { i: 22, label: "H", at: "high" },
    { i: 33, label: "HL", at: "low" },
    { i: 44, label: "HH", at: "high" },
  ],
  bosPivot: 1,
  zone: { kind: "demand", lo: 4098.0, hi: 4101.2, from: 31 },
  stop: 4097.4,
  read: "Higher highs and higher lows since the 4,088 low, and price broke the last high. Buyers are in control above the demand zone.",
  watch: ["Price returns into 4,098.0 – 4,101.2", "5M change of character inside the zone", "Structural stop within 50 pips"],
});

/** Bearish 1H example: high, lower high, break below the last low, pullback toward the supply zone. */
export const BEAR = scenario("bear", "1H", [4092, 4134, 4108, 4127, 4097, 4118], 9, {
  pivots: [
    { i: 11, label: "High", at: "high" },
    { i: 22, label: "L", at: "low" },
    { i: 33, label: "LH", at: "high" },
    { i: 44, label: "LL", at: "low" },
  ],
  bosPivot: 1,
  zone: { kind: "supply", lo: 4125.2, hi: 4128.4, from: 31 },
  stop: 4129.4,
  read: "Lower highs and a break below the last low. Sellers are in control below the supply zone while 1H stays under it.",
  watch: ["Price rallies into 4,125.2 – 4,128.4", "5M change of character to the downside", "Structural stop within 50 pips"],
});

/** Example journal rows. */
export const TRADES = [
  { d: "Thu 14:05", s: "XAUUSD", side: "Buy", lots: "0.50", pips: "+46", pnl: 230.0 },
  { d: "Thu 10:42", s: "XAUUSD", side: "Sell", lots: "0.40", pips: "−22", pnl: -88.0 },
  { d: "Wed 16:18", s: "EURUSD", side: "Buy", lots: "1.00", pips: "+18", pnl: 180.0 },
  { d: "Wed 09:31", s: "XAUUSD", side: "Buy", lots: "0.50", pips: "+61", pnl: 305.0 },
  { d: "Tue 15:47", s: "GBPUSD", side: "Sell", lots: "0.80", pips: "−15", pnl: -96.0 },
  { d: "Tue 11:20", s: "XAUUSD", side: "Sell", lots: "0.40", pips: "+38", pnl: 152.0 },
];

/** Example calendar items. Impact only; no forecasts or results, since none of this is real. */
export const EVENTS = [
  { c: "USD", t: "CPI m/m", when: "Tue · 14:30", impact: "High", usd: true },
  { c: "USD", t: "FOMC rate decision", when: "Wed · 20:00", impact: "High", usd: true },
  { c: "EUR", t: "ECB press conference", when: "Thu · 14:45", impact: "Medium", usd: false },
  { c: "USD", t: "Non-farm payrolls", when: "Fri · 14:30", impact: "High", usd: true },
];

export const INSIGHT =
  "If US inflation comes in hotter than expected, yields and the dollar usually rise, which tends to weigh on gold. Let the release pass, then let 1H structure confirm the direction before acting.";

export const COACH = {
  q: "Why do my Friday trades lose?",
  a: "In this example journal, 5 of 7 Friday losses were opened within 30 minutes of a high-impact USD release. Try a no-entry window around those events.",
};
