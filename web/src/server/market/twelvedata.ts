/**
 * Twelve Data REST adapter (https://twelvedata.com/docs). Server only: the key never reaches the browser.
 * No "server-only" import so it can be unit tested with a mocked fetch.
 */
import type { Candle } from "@/lib/analytics/types";
import type { Timeframe } from "./instruments";

const BASE = "https://api.twelvedata.com";
export const TD_INTERVAL: Record<Timeframe, string> = { "1M": "1min", "5M": "5min", "15M": "15min", "1H": "1h", "4H": "4h", "1D": "1day" };
/** Data-cache lifetime per timeframe, in seconds. Shorter than a bar so the in-progress bar keeps moving. */
export const CACHE_SECONDS: Record<Timeframe, number> = { "1M": 20, "5M": 30, "15M": 60, "1H": 120, "4H": 300, "1D": 900 };

export class VendorError extends Error {
  constructor(readonly vendor: string, message: string, readonly status?: number) { super(`${vendor}: ${message}`); }
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

export function twelveData(apiKey: string, fetchImpl: Fetch = fetch) {
  async function get<T>(path: string, params: Record<string, string>, revalidate: number): Promise<T> {
    const url = new URL(path, BASE);
    for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
    // The key goes in a header, so it never appears in logged URLs.
    const res = await fetchImpl(url, { headers: { Authorization: `apikey ${apiKey}` }, next: { revalidate } } as RequestInit);
    if (!res.ok) throw new VendorError("twelvedata", `HTTP ${res.status}`, res.status);
    return (await res.json()) as T;
  }
  return {
    vendor: "twelvedata" as const,
    async candles(vendorSymbol: string, tf: Timeframe, count: number): Promise<Candle[]> {
      const body = await get<TdSeries>("/time_series", { symbol: vendorSymbol, interval: TD_INTERVAL[tf], outputsize: String(Math.min(count, 5000)), timezone: "UTC", order: "asc" }, CACHE_SECONDS[tf]);
      return parseSeries(body);
    },
  };
}
export type TwelveDataClient = ReturnType<typeof twelveData>;
