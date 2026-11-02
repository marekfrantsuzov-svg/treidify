import "server-only";
import type { Candle } from "@/lib/analytics/types";
import { DXY_WEIGHTS, computeDxyCandles, type DxyPair } from "./dxy";
import { classifyFreshness, type Freshness } from "./freshness";
import { INSTRUMENTS, isMarketSymbol, type MarketSymbol, type Timeframe } from "./instruments";
import { CACHE_SECONDS, FREE_PLAN_CACHE_SECONDS, isCoverageError, twelveData, VendorError } from "./twelvedata";
import { coverageMap, recordUnavailable, recordVerified, vendorCandidates } from "./coverage";
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
  /** How often a chart should re-read this series: the server cache lifetime for the connected plan. */
  refreshSeconds: number;
  plan: PlanTier;
}
export interface SeriesFail { ok: false; symbol: MarketSymbol; timeframe: Timeframe; reason: "not-configured" | "vendor-error" | "rate-limited" | "empty" | "not-covered" | "unknown-symbol"; message: string; needs?: string[]; detail?: string }
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

export type PlanTier = "free" | "paid";
let planMemo: { at: number; tier: PlanTier } | null = null;
/**
 * Free plan (8 requests/minute) or a paid one. MARKET_DATA_PLAN=free|paid overrides; otherwise the key's own plan is
 * read from the provider (no credit cost) and remembered for 10 minutes. Unknown counts as free, the safe side.
 */
export async function marketPlan(): Promise<PlanTier> {
  const forced = env("MARKET_DATA_PLAN");
  if (forced === "free" || forced === "paid") return forced;
  if (planMemo && Date.now() - planMemo.at < 600_000) return planMemo.tier;
  let tier: PlanTier = "free";
  try {
    const u = await twelveData(env("MARKET_DATA_API_KEY") ?? "").usage();
    tier = u.perMinute !== null && u.perMinute > 8 ? "paid" : "free";
  } catch (e) { reportError(e, { where: "market.plan" }); }
  planMemo = { at: Date.now(), tier };
  return tier;
}
export const planCache = (tier: PlanTier) => (tier === "free" ? FREE_PLAN_CACHE_SECONDS : CACHE_SECONDS);

export async function getSeries(symbol: MarketSymbol, timeframe: Timeframe, count = 300, now = new Date()): Promise<SeriesResult> {
  if (!isMarketSymbol(symbol)) return { ok: false, symbol, timeframe, reason: "unknown-symbol", message: "Treidify does not list this instrument." };
  const st = marketDataStatus();
  if (!st.configured) return { ok: false, symbol, timeframe, reason: "not-configured", message: "Market data is not connected.", needs: st.needs };
  const plan = await marketPlan();
  const cacheSeconds = planCache(plan);
  const client = twelveData(env("MARKET_DATA_API_KEY")!, fetch, cacheSeconds);
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
      if (!served && !refused.length && !cands.length) {
        // Refused by the provider within the last day: do not spend a request asking again.
        const known = (await coverageMap())[symbol];
        return { ok: false, symbol, timeframe, reason: "not-covered", message: `${def.short} is not available on the connected market-data plan, so nothing is shown for it.`, detail: known?.reason ?? undefined };
      }
      if (!served) {
        void recordUnavailable(symbol, refused.join(" · ") || "No candidate symbol.");
        return { ok: false, symbol, timeframe, reason: "not-covered", message: `${def.short} is not available on the connected market-data plan, so nothing is shown for it.`, detail: refused.join(" · ") || undefined };
      }
      void recordVerified(symbol, served);
    }
    const last = candles.at(-1);
    if (!last) return { ok: false, symbol, timeframe, reason: "empty", message: "The provider returned no bars." };
    return {
      ok: true, symbol, timeframe, candles, vendor: client.vendor, method,
      fetchedAt: now.toISOString(), lastBarAt: new Date(last.t * 1000).toISOString(),
      freshness: classifyFreshness(last.t, timeframe, now, symbol), digits: def.digits,
      refreshSeconds: cacheSeconds[timeframe], plan,
    };
  } catch (e) {
    if (e instanceof VendorError && e.status === 429) {
      return { ok: false, symbol, timeframe, reason: "rate-limited", message: "The market-data plan's request limit was reached, so this chart is waiting for the next minute's allowance. Nothing is shown rather than a guess.", detail: e.message };
    }
    reportError(e, { where: "market.getSeries", extra: { symbol, timeframe } });
    return { ok: false, symbol, timeframe, reason: "vendor-error", message: e instanceof VendorError ? "The market-data provider did not answer correctly. Showing nothing rather than a guess." : "Market data could not be loaded.", detail: e instanceof VendorError ? e.message : undefined };
  }
}

/** All timeframes the intelligence engine needs for one symbol, fetched in parallel. */
export async function getMultiTimeframe(symbol: MarketSymbol, now = new Date()) {
  const tfs: Timeframe[] = ["4H", "1H", "15M", "5M"];
  const results = await Promise.all(tfs.map((tf) => getSeries(symbol, tf, tf === "4H" ? 300 : 400, now)));
  return Object.fromEntries(tfs.map((tf, i) => [tf, results[i]!])) as Record<"4H" | "1H" | "15M" | "5M", SeriesResult>;
}
