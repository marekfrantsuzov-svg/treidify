/**
 * Twelve Data REST adapter (https://twelvedata.com/docs). Server only: the key never reaches the browser.
 * No "server-only" import so it can be unit tested with a mocked fetch.
 */
import type { Candle } from "@/lib/analytics/types";
import type { Timeframe } from "./instruments";

const BASE = "https://api.twelvedata.com";
export const TD_INTERVAL: Record<Timeframe, string> = { "1M": "1min", "5M": "5min", "15M": "15min", "30M": "30min", "1H": "1h", "4H": "4h", "1D": "1day", "1W": "1week" };
/** Data-cache lifetime per timeframe, in seconds. Shorter than a bar so the in-progress bar keeps moving. */
export const CACHE_SECONDS: Record<Timeframe, number> = { "1M": 15, "5M": 20, "15M": 30, "30M": 45, "1H": 60, "4H": 120, "1D": 300, "1W": 900 };

/** Cache lifetimes on the free plan (8 requests/minute, 800/day): long enough that one person can use the app all day. */
export const FREE_PLAN_CACHE_SECONDS: Record<Timeframe, number> = { "1M": 900, "5M": 900, "15M": 900, "30M": 900, "1H": 900, "4H": 3600, "1D": 21_600, "1W": 21_600 };

export class VendorError extends Error {
  constructor(readonly vendor: string, message: string, readonly status?: number) { super(`${vendor}: ${message}`); }
}

/**
 * True when the provider says this symbol is not served (unknown symbol, or not included in the plan), as opposed to
 * an outage, a bad key or a rate limit. Only these errors mark an instrument "unavailable".
 */
export function isCoverageError(e: unknown): boolean {
  if (!(e instanceof VendorError)) return false;
  if (e.status === 401 || e.status === 429 || (e.status !== undefined && e.status >= 500)) return false;
  return e.status === 400 || e.status === 403 || e.status === 404 || /not (found|available)|invalid symbol|symbol .* (is not|not)|upgrade|plan/i.test(e.message);
}

type Fetch = typeof fetch;
interface TdValue { datetime: string; open: string; high: string; low: string; close: string; volume?: string }
interface TdSeries { status?: string; code?: number; message?: string; meta?: { symbol: string; interval: string; exchange_timezone?: string }; values?: TdValue[] }

/** Twelve Data datetimes are wall-clock strings in the requested timezone; we always request UTC. */
export function parseUtc(dt: string): number {
  const iso = dt.length === 10 ? `${dt}T00:00:00Z` : `${dt.replace(" ", "T")}Z`;
  const ms = Date.parse(iso);
  if (!Number.isFinite(ms)) throw new VendorError("twelvedata", `unparseable datetime ${dt}`);
  return Math.floor(ms / 1000);
}

export function parseSeries(body: TdSeries): Candle[] {
  if (body.status === "error" || !body.values) throw new VendorError("twelvedata", body.message ?? "no values returned", body.code);
  return body.values
    .map((v) => ({ t: parseUtc(v.datetime), o: Number(v.open), h: Number(v.high), l: Number(v.low), c: Number(v.close), ...(v.volume && Number(v.volume) > 0 ? { v: Number(v.volume) } : {}) }))
    .filter((c) => [c.o, c.h, c.l, c.c].every((x) => Number.isFinite(x) && x > 0))
    .sort((a, b) => a.t - b.t);
}

export function twelveData(apiKey: string, fetchImpl: Fetch = fetch, cacheSeconds: Record<Timeframe, number> = CACHE_SECONDS) {
  async function get<T>(path: string, params: Record<string, string>, revalidate: number): Promise<T> {
    const url = new URL(path, BASE);
    for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
    // The key goes in a header, so it never appears in logged URLs.
    // Never through Next's data cache: it serves the previous response while revalidating in the background, so bars
    // came back up to a whole refresh window older than their fetch time said. The saved copy (database) is the cache.
    void revalidate;
    const res = await fetchImpl(url, { headers: { Authorization: `apikey ${apiKey}` }, cache: "no-store" } as RequestInit);
    if (!res.ok) throw new VendorError("twelvedata", `HTTP ${res.status}`, res.status);
    return (await res.json()) as T;
  }
  return {
    vendor: "twelvedata" as const,
    async candles(vendorSymbol: string, tf: Timeframe, count: number): Promise<Candle[]> {
      const body = await get<TdSeries>("/time_series", { symbol: vendorSymbol, interval: TD_INTERVAL[tf], outputsize: String(Math.min(count, 5000)), timezone: "UTC", order: "asc" }, cacheSeconds[tf]);
      return parseSeries(body);
    },
    /** The key's plan: requests per minute and category. Twelve Data does not charge credits for this call. */
    async usage(): Promise<{ perMinute: number | null; category: string | null }> {
      const b = await get<{ plan_limit?: number; plan_category?: string; status?: string; message?: string }>("/api_usage", {}, 600);
      if (b.status === "error") throw new VendorError("twelvedata", b.message ?? "usage unavailable");
      return { perMinute: typeof b.plan_limit === "number" ? b.plan_limit : null, category: b.plan_category ?? null };
    },
  };
}
export type TwelveDataClient = ReturnType<typeof twelveData>;
