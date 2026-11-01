import "server-only";
import type { Candle } from "@/lib/analytics/types";
import { DXY_WEIGHTS, computeDxyCandles, type DxyPair } from "./dxy";
import { classifyFreshness, type Freshness } from "./freshness";
import { INSTRUMENTS, isMarketSymbol, type MarketSymbol, type Timeframe } from "./instruments";
import { isCoverageError, twelveData, VendorError } from "./twelvedata";
import { recordUnavailable, recordVerified, vendorCandidates } from "./coverage";
import { reportError } from "@/lib/monitoring";

/**
 * The only way the app reads market prices. Returns real vendor bars or an explicit failure; it never substitutes
 * sample or synthetic candles. Configure with MARKET_DATA_PROVIDER=twelvedata and MARKET_DATA_API_KEY.
 * MARKET_DATA_DXY_SYMBOL: set to the vendor's ICE index symbol (for example "DXY") if your plan includes it;
 * otherwise DXY is computed from the six ICE component pairs and labelled "computed".
 */
export interface SeriesOk {
  ok: true;
  symbol: MarketSymbol;
  timeframe: Timeframe;
  candles: Candle[];
  vendor: string;
  method: "vendor" | "computed-ice";
  fetchedAt: string;
  lastBarAt: string;
  freshness: Freshness;
  digits: number;
}
export interface SeriesFail { ok: false; symbol: MarketSymbol; timeframe: Timeframe; reason: "not-configured" | "vendor-error" | "empty" | "not-covered" | "unknown-symbol"; message: string; needs?: string[] }
export type SeriesResult = SeriesOk | SeriesFail;

const env = (k: string) => process.env[k]?.trim() || null;
/** DXY component pairs. USDSEK is not a Treidify instrument, so its vendor symbol is listed here. */
const DXY_VENDOR: Record<DxyPair, string> = { EURUSD: "EUR/USD", USDJPY: "USD/JPY", GBPUSD: "GBP/USD", USDCAD: "USD/CAD", USDSEK: "USD/SEK", USDCHF: "USD/CHF" };

export function marketDataStatus() {
  const provider = env("MARKET_DATA_PROVIDER");
  const needs = [!provider && "MARKET_DATA_PROVIDER", !env("MARKET_DATA_API_KEY") && "MARKET_DATA_API_KEY"].filter(Boolean) as string[];
  const supported = provider === null || provider === "twelvedata";
  return { configured: needs.length === 0 && supported, vendor: provider, needs: supported ? needs : [`a supported MARKET_DATA_PROVIDER (twelvedata), not "${provider}"`], dxyMethod: env("MARKET_DATA_DXY_SYMBOL") ? ("vendor" as const) : ("computed-ice" as const) };
}

export async function getSeries(symbol: MarketSymbol, timeframe: Timeframe, count = 300, now = new Date()): Promise<SeriesResult> {
  if (!isMarketSymbol(symbol)) return { ok: false, symbol, timeframe, reason: "unknown-symbol", message: "Treidify does not list this instrument." };
  const st = marketDataStatus();
  if (!st.configured) return { ok: false, symbol, timeframe, reason: "not-configured", message: "Market data is not connected.", needs: st.needs };
  const client = twelveData(env("MARKET_DATA_API_KEY")!);
  const def = INSTRUMENTS[symbol]!;
  try {
    let candles: Candle[] = [];
    let method: SeriesOk["method"] = "vendor";
    if (def.providers.twelvedata.computed === "ice-dxy") {
      const vendorDxy = env("MARKET_DATA_DXY_SYMBOL");
      if (vendorDxy) candles = await client.candles(vendorDxy, timeframe, count);
      else {
        const parts = await Promise.all(DXY_WEIGHTS.map((w) => client.candles(DXY_VENDOR[w.pair], timeframe, count)));
        candles = computeDxyCandles(Object.fromEntries(DXY_WEIGHTS.map((w, i) => [w.pair, parts[i]!])) as Record<DxyPair, Candle[]>);
        method = "computed-ice";
      }
    } else {
      // Try each candidate the provider has not refused. Never substitute a different instrument (an ETF for an index).
      const cands = await vendorCandidates(symbol);
      let served: string | null = null;
      const refused: string[] = [];
      for (const cand of cands) {
        try { candles = await client.candles(cand, timeframe, count); served = cand; break; }
        catch (e) { if (isCoverageError(e)) { refused.push(`${cand}: ${(e as Error).message}`); continue; } throw e; }
      }
      if (!served) {
        void recordUnavailable(symbol, refused.join(" · ") || "No candidate symbol.");
        return { ok: false, symbol, timeframe, reason: "not-covered", message: `${def.short} is not available on the connected market-data plan, so nothing is shown for it.` };
      }
      void recordVerified(symbol, served);
    }
    const last = candles.at(-1);
    if (!last) return { ok: false, symbol, timeframe, reason: "empty", message: "The provider returned no bars." };
    return {
      ok: true, symbol, timeframe, candles, vendor: client.vendor, method,
      fetchedAt: now.toISOString(), lastBarAt: new Date(last.t * 1000).toISOString(),
      freshness: classifyFreshness(last.t, timeframe, now, symbol), digits: def.digits,
    };
  } catch (e) {
    reportError(e, { where: "market.getSeries", extra: { symbol, timeframe } });
    return { ok: false, symbol, timeframe, reason: "vendor-error", message: e instanceof VendorError ? "The market-data provider did not answer correctly. Showing nothing rather than a guess." : "Market data could not be loaded." };
  }
}

/** All timeframes the intelligence engine needs for one symbol, fetched in parallel. */
export async function getMultiTimeframe(symbol: MarketSymbol, now = new Date()) {
  const tfs: Timeframe[] = ["4H", "1H", "15M", "5M"];
  const results = await Promise.all(tfs.map((tf) => getSeries(symbol, tf, tf === "4H" ? 300 : 400, now)));
  return Object.fromEntries(tfs.map((tf, i) => [tf, results[i]!])) as Record<"4H" | "1H" | "15M" | "5M", SeriesResult>;
}
