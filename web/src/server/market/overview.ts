import "server-only";
import { cache } from "react";
import { analyzeStructure, type InstrumentIntel, type Trend } from "@/lib/intelligence";
import type { Candle } from "@/lib/analytics/types";
import { reportError } from "@/lib/monitoring";
import { loadIntel } from "./load";
import { window24 } from "./intelligence";
import { getSeries, marketDataStatus } from "./service";

export type OverviewCategory = "Forex" | "Metals" | "Indices" | "Crypto";
export interface OverviewRow {
  symbol: string;
  name: string;
  category: OverviewCategory;
  digits: number;
  price: number | null;
  changePct: number | null;
  /** Direction from market structure (swing highs and lows, BOS/CHOCH), never from the price change. */
  trend: Trend | null;
  trendTf: "4H" | "1H" | null;
  status: "live" | "sample" | "unavailable";
  /** Closes of the same fetched 1H bars as the price and change (last 25), never interpolated or invented. */
  spark: number[] | null;
  high24: number | null;
  low24: number | null;
}

const EXTRA: { symbol: string; vendor: string; name: string; category: OverviewCategory; digits: number }[] = [
  { symbol: "EURUSD", vendor: "EUR/USD", name: "Euro / US Dollar", category: "Forex", digits: 4 },
  { symbol: "GBPUSD", vendor: "GBP/USD", name: "British Pound / US Dollar", category: "Forex", digits: 4 },
  { symbol: "USDJPY", vendor: "USD/JPY", name: "US Dollar / Japanese Yen", category: "Forex", digits: 2 },
  { symbol: "BTCUSD", vendor: "BTC/USD", name: "Bitcoin / US Dollar", category: "Crypto", digits: 0 },
];

/** 4H structure when it has a direction, otherwise 1H. */
export function structureTrend(h4: Trend | null, h1: Trend | null): { trend: Trend | null; tf: "4H" | "1H" | null } {
  if (h4 && h4 !== "none") return { trend: h4, tf: "4H" };
  if (h1 && h1 !== "none") return { trend: h1, tf: "1H" };
  if (h4 === "none" || h1 === "none") return { trend: "none", tf: h4 === "none" ? "4H" : "1H" };
  return { trend: null, tf: null };
}

function change(h1: Candle[]) {
  const last = h1.at(-1)?.c ?? null, ref = h1.at(-25)?.c ?? h1[0]?.c ?? null;
  const w = window24(h1);
  return { price: last, changePct: last !== null && ref ? ((last - ref) / ref) * 100 : null, spark: w.spark.length > 1 ? w.spark : null, high24: w.high24, low24: w.low24 };
}

function fromIntel(i: InstrumentIntel, name: string, category: OverviewCategory, q: { last: number | null; changePct: number | null; spark?: number[]; high24?: number | null; low24?: number | null }, sample: boolean): OverviewRow {
  const t = structureTrend(i.trends["4H"], i.trends["1H"]);
  const status = sample ? "sample" : i.lastPrice === null ? "unavailable" : "live";
  return {
    symbol: i.symbol, name, category, digits: i.digits, price: q.last, changePct: q.changePct, trend: t.trend, trendTf: t.tf, status,
    spark: status !== "unavailable" && q.spark && q.spark.length > 1 ? q.spark : null, high24: q.high24 ?? null, low24: q.low24 ?? null,
  };
}

/**
 * Market Overview rows. Gold, Silver and DXY reuse the intelligence snapshot. The other pairs need their own 1H and 4H
 * bars from the market-data provider; without a provider they are listed as unavailable rather than filled with
 * invented prices.
 */
export const marketOverview = cache(async (): Promise<OverviewRow[]> => {
  const snap = await loadIntel();
  const sample = snap.mode === "sample";
  const base = [
    fromIntel(snap.gold, "Gold / US Dollar", "Metals", snap.quotes.XAUUSD, sample),
    fromIntel(snap.silver, "Silver / US Dollar", "Metals", snap.quotes.XAGUSD, sample),
    fromIntel(snap.dxy, "US Dollar Index", "Indices", snap.quotes.DXY, sample),
  ];
  const st = marketDataStatus();
  const unavailable = (e: (typeof EXTRA)[number]): OverviewRow => ({ symbol: e.symbol, name: e.name, category: e.category, digits: e.digits, price: null, changePct: null, trend: null, trendTf: null, status: "unavailable", spark: null, high24: null, low24: null });
  const extra = await Promise.all(EXTRA.map(async (e): Promise<OverviewRow> => {
    if (!st.configured) return unavailable(e);
    try {
      // Same loader and shared saved copy as the charts, so the overview spends no extra requests.
      const [r1, r4] = await Promise.all([getSeries(e.symbol, "1H", 150), getSeries(e.symbol, "4H", 150)]);
      if (!r1.ok) return unavailable(e);
      const h1 = r1.candles, h4 = r4.ok ? r4.candles : [];
      const t = structureTrend(h4.length >= 60 ? analyzeStructure(h4).trend : null, h1.length >= 60 ? analyzeStructure(h1).trend : null);
      return { symbol: e.symbol, name: e.name, category: e.category, digits: e.digits, ...change(h1), trend: t.trend, trendTf: t.tf, status: "live" };
    } catch (err) {
      reportError(err, { where: "market.overview", extra: { symbol: e.symbol } });
      return unavailable(e);
    }
  }));
  // Reference order: Gold, the majors, Bitcoin, then Silver and DXY.
  return [base[0]!, ...extra.slice(0, 3), extra[3]!, base[1]!, base[2]!];
});
