import "server-only";
import type { Candle } from "@/lib/analytics/types";
import { DXY_WEIGHTS, computeDxyCandles, type DxyPair } from "./dxy";
import { classifyFreshness, type Freshness } from "./freshness";
import { INSTRUMENTS, isMarketSymbol, type MarketSymbol, type Timeframe } from "./instruments";
import { CACHE_SECONDS, FREE_PLAN_CACHE_SECONDS, isCoverageError, twelveData, VendorError } from "./twelvedata";
import { coverageMap, recordUnavailable, recordVerified, vendorCandidates } from "./coverage";
import { reportError } from "@/lib/monitoring";
import { and, eq } from "drizzle-orm";
import { db, dbConfigured, schema } from "../db";

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
  /** True when the provider could not be asked just now and these are the last bars it returned (see fetchedAt). */
  savedCopy: boolean;
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

/** Bars requested from the provider per series. A request costs one credit whatever its size, so take the most once. */
const FETCH_BARS = 500;

// Requests this instance has sent in the last minute. On the free plan (8 per minute) it stops sending before the
// provider refuses, and the saved copy is served instead. Other instances share the saved copy through the database.
const sent: number[] = [];
function takeBudget(n: number, plan: PlanTier, nowMs = Date.now()): boolean {
  if (plan !== "free") return true;
  while (sent.length && nowMs - sent[0]! > 60_000) sent.shift();
  if (sent.length + n > FREE_PER_MINUTE) return false;
  for (let i = 0; i < n; i++) sent.push(nowMs);
  return true;
}
const FREE_PER_MINUTE = 8;
export const _resetMarketBudget = () => { sent.length = 0; _resetMarketMemo(); };

type Saved = { candles: Candle[]; vendor: string; method: SeriesOk["method"]; fetchedAt: Date };

// This instance's copy of the shared saved bars. The database copy stays the source of truth between instances; the
// memo only spares a database read (up to ~40 KB of bars per series) while the copy is still inside the plan's refresh
// window, the same rule the database copy is held to. Freshness is still judged from the last bar's own time.
const memo = new Map<string, Saved>();
const inflightRead = new Map<string, Promise<Saved | null>>();
const inflightFetch = new Map<string, Promise<Fetched>>();
export const _resetMarketMemo = () => { memo.clear(); inflightRead.clear(); inflightFetch.clear(); };

/** One read per series at a time on this instance; concurrent callers share it. */
function readSavedShared(symbol: string, tf: Timeframe): Promise<Saved | null> {
  const key = `${symbol}|${tf}`;
  let p = inflightRead.get(key);
  if (!p) {
    p = readSaved(symbol, tf).then((r) => { if (r) { const m = memo.get(key); if (!m || m.fetchedAt <= r.fetchedAt) memo.set(key, r); } return r; }).finally(() => inflightRead.delete(key));
    inflightRead.set(key, p);
  }
  return p;
}

async function readSaved(symbol: string, tf: Timeframe): Promise<Saved | null> {
  if (!dbConfigured) return null;
  try {
    const [r] = await db.select().from(schema.marketSeriesCache).where(and(eq(schema.marketSeriesCache.symbol, symbol), eq(schema.marketSeriesCache.timeframe, tf))).limit(1);
    return r ? { candles: r.candles, vendor: r.vendor, method: r.method as SeriesOk["method"], fetchedAt: r.fetchedAt } : null;
  } catch (e) { reportError(e, { where: "market.readSaved" }); return null; }
}
async function writeSaved(symbol: string, tf: Timeframe, v: Omit<Saved, "fetchedAt">, at: Date) {
  if (!dbConfigured) return;
  try {
    await db.insert(schema.marketSeriesCache).values({ symbol, timeframe: tf, vendor: v.vendor, method: v.method, candles: v.candles, fetchedAt: at })
      .onConflictDoUpdate({ target: [schema.marketSeriesCache.symbol, schema.marketSeriesCache.timeframe], set: { vendor: v.vendor, method: v.method, candles: v.candles, fetchedAt: at } });
  } catch (e) { reportError(e, { where: "market.writeSaved" }); }
}

type Fetched = { ok: true; candles: Candle[]; method: SeriesOk["method"] } | SeriesFail;

/** One provider read for a series, with no caching of its own beyond the HTTP data cache. */
async function fetchSeries(symbol: MarketSymbol, timeframe: Timeframe, plan: PlanTier, cacheSeconds: Record<Timeframe, number>): Promise<Fetched> {
  const client = twelveData(env("MARKET_DATA_API_KEY")!, fetch, cacheSeconds);
  const def = INSTRUMENTS[symbol]!;
  const limited = (detail: string): SeriesFail => ({ ok: false, symbol, timeframe, reason: "rate-limited", message: "The market-data plan's request limit was reached, so this chart is waiting for the next minute's allowance. Nothing is shown rather than a guess.", detail });
  const budgetMsg = `Free data plan: holding back to stay within ${FREE_PER_MINUTE} requests per minute.`;
  try {
    if (def.providers.twelvedata.computed === "ice-dxy") {
      const vendorDxy = env("MARKET_DATA_DXY_SYMBOL");
      if (vendorDxy) {
        if (!takeBudget(1, plan)) return limited(budgetMsg);
        return { ok: true, candles: await client.candles(vendorDxy, timeframe, FETCH_BARS), method: "vendor" };
      }
      if (!takeBudget(DXY_WEIGHTS.length, plan)) return limited(budgetMsg);
      const parts = await Promise.all(DXY_WEIGHTS.map((w) => client.candles(DXY_VENDOR[w.pair], timeframe, FETCH_BARS)));
      return { ok: true, candles: computeDxyCandles(Object.fromEntries(DXY_WEIGHTS.map((w, i) => [w.pair, parts[i]!])) as Record<DxyPair, Candle[]>), method: "computed-ice" };
    }
    // Try each candidate the provider has not refused. Never substitute a different instrument (an ETF for an index).
    const cands = await vendorCandidates(symbol);
    const notCovered = (detail?: string): SeriesFail => ({ ok: false, symbol, timeframe, reason: "not-covered", message: `${def.short} is not available on the connected market-data plan, so nothing is shown for it.`, detail });
    if (!cands.length) {
      // Refused by the provider within the last day: do not spend a request asking again.
      return notCovered((await coverageMap())[symbol]?.reason ?? undefined);
    }
    const refused: string[] = [];
    for (const cand of cands) {
      if (!takeBudget(1, plan)) return limited(budgetMsg);
      try {
        const candles = await client.candles(cand, timeframe, FETCH_BARS);
        void recordVerified(symbol, cand);
        return { ok: true, candles, method: "vendor" };
      } catch (e) { if (isCoverageError(e)) { refused.push(`${cand}: ${(e as Error).message}`); continue; } throw e; }
    }
    void recordUnavailable(symbol, refused.join(" · ") || "No candidate symbol.");
    return notCovered(refused.join(" · ") || undefined);
  } catch (e) {
    if (e instanceof VendorError && e.status === 429) return limited(e.message);
    reportError(e, { where: "market.getSeries", extra: { symbol, timeframe } });
    return { ok: false, symbol, timeframe, reason: "vendor-error", message: e instanceof VendorError ? "Market data could not be loaded just now. Showing nothing rather than a guess." : "Market data could not be loaded.", detail: e instanceof VendorError ? e.message : undefined };
  }
}

/**
 * Bars for one instrument and timeframe. Order: the saved copy while it is younger than the plan's refresh window;
 * otherwise the provider; if the provider is rate limiting or failing, the last saved real bars (labelled with their
 * true age through `freshness` and `savedCopy`). Never sample or synthetic bars.
 */
export async function getSeries(symbol: MarketSymbol, timeframe: Timeframe, count = 300, now = new Date()): Promise<SeriesResult> {
  if (!isMarketSymbol(symbol)) return { ok: false, symbol, timeframe, reason: "unknown-symbol", message: "Treidify does not list this instrument." };
  const st = marketDataStatus();
  if (!st.configured) return { ok: false, symbol, timeframe, reason: "not-configured", message: "Market data is not connected.", needs: st.needs };
  const plan = await marketPlan();
  const cacheSeconds = planCache(plan);
  const def = INSTRUMENTS[symbol]!;
  const result = (s: Saved, savedCopy: boolean): SeriesResult => {
    const candles = s.candles.slice(-count);
    const last = candles.at(-1);
    if (!last) return { ok: false, symbol, timeframe, reason: "empty", message: "The provider returned no bars." };
    return {
      ok: true, symbol, timeframe, candles, vendor: s.vendor, method: s.method,
      fetchedAt: s.fetchedAt.toISOString(), lastBarAt: new Date(last.t * 1000).toISOString(),
      freshness: classifyFreshness(last.t, timeframe, now, symbol, cacheSeconds[timeframe]), digits: def.digits,
      refreshSeconds: cacheSeconds[timeframe], plan, savedCopy,
    };
  };

  const key = `${symbol}|${timeframe}`;
  const isFresh = (s: Saved | null | undefined): boolean => !!s && now.getTime() - s.fetchedAt.getTime() < cacheSeconds[timeframe] * 1000 && s.candles.length > 0;
  const mem = memo.get(key);
  if (mem && isFresh(mem)) return result(mem, false);
  const saved = await readSavedShared(symbol, timeframe);
  if (saved && isFresh(saved)) return result(saved, false);

  // Several sections asking for the same series at once send one provider request, not one each.
  let pending = inflightFetch.get(key);
  if (!pending) {
    pending = fetchSeries(symbol, timeframe, plan, cacheSeconds).then(async (got) => {
      if (got.ok && got.candles.length) {
        const fresh: Saved = { candles: got.candles, vendor: "twelvedata", method: got.method, fetchedAt: now };
        memo.set(key, fresh);
        await writeSaved(symbol, timeframe, fresh, now);
      }
      return got;
    }).finally(() => inflightFetch.delete(key));
    inflightFetch.set(key, pending);
  }
  const got = await pending;
  if (got.ok) {
    if (!got.candles.length) return { ok: false, symbol, timeframe, reason: "empty", message: "The provider returned no bars." };
    const fresh = memo.get(key);
    return result(fresh && fresh.candles === got.candles ? fresh : { candles: got.candles, vendor: "twelvedata", method: got.method, fetchedAt: now }, false);
  }
  // Rate limited or the provider failed: the last real bars we hold are better than nothing, and say how old they are.
  if ((got.reason === "rate-limited" || got.reason === "vendor-error") && saved?.candles.length) return result(saved, true);
  return got;
}

/** All timeframes the intelligence engine needs for one symbol, fetched in parallel. */
export async function getMultiTimeframe(symbol: MarketSymbol, now = new Date()) {
  const tfs: Timeframe[] = ["4H", "1H", "15M", "5M"];
  const results = await Promise.all(tfs.map((tf) => getSeries(symbol, tf, tf === "4H" ? 300 : 400, now)));
  return Object.fromEntries(tfs.map((tf, i) => [tf, results[i]!])) as Record<"4H" | "1H" | "15M" | "5M", SeriesResult>;
}
