import "server-only";
import { eq } from "drizzle-orm";
import { cache } from "react";
import { INSTRUMENT_LIST, INSTRUMENTS, type InstrumentDef } from "@/lib/markets/registry";
import { reportError } from "@/lib/monitoring";
import { db, dbConfigured, schema } from "../db";
import { isCoverageError, twelveData } from "./twelvedata";

/**
 * Verified provider coverage. Nothing here is assumed: an instrument is "verified" only after the provider returned
 * bars for one of its candidate symbols, and "unavailable" only after the provider said the symbol is unknown or not
 * in the plan. Everything else is "unchecked" and is labelled that way in the instrument picker.
 */
export type CoverageState = "verified" | "unavailable" | "unchecked" | "computed";
export interface Coverage { symbol: string; state: CoverageState; vendorSymbol: string | null; reason: string | null; checkedAt: string | null }

const PROVIDER = "twelvedata";
const REFRESH_MS = 24 * 3600_000;

// Per-instance memory of what bar requests have shown, so a page never retries a refused candidate on every request.
const seen = new Map<string, { state: "verified" | "unavailable"; vendorSymbol: string | null; reason: string | null; at: number }>();
const key = (symbol: string) => `${PROVIDER}:${symbol}`;

async function persist(symbol: string, state: "verified" | "unavailable", vendorSymbol: string | null, reason: string | null) {
  seen.set(key(symbol), { state, vendorSymbol, reason, at: Date.now() });
  if (!dbConfigured) return;
  try {
    await db.insert(schema.instrumentCoverage).values({ symbol, provider: PROVIDER, vendorSymbol, state, reason, checkedAt: new Date() })
      .onConflictDoUpdate({ target: [schema.instrumentCoverage.symbol, schema.instrumentCoverage.provider], set: { vendorSymbol, state, reason, checkedAt: new Date() } });
  } catch (e) { reportError(e, { where: "coverage.persist", extra: { symbol } }); }
}

/** Called by the bar loader after each request. */
export const recordVerified = (symbol: string, vendorSymbol: string) => {
  const s = seen.get(key(symbol));
  if (s?.state === "verified" && s.vendorSymbol === vendorSymbol && Date.now() - s.at < REFRESH_MS) return Promise.resolve();
  return persist(symbol, "verified", vendorSymbol, null);
};
export const recordUnavailable = (symbol: string, reason: string) => persist(symbol, "unavailable", null, reason);

/** Every instrument's coverage, from the database plus this instance's observations. One read per request. */
export const coverageMap = cache(async (): Promise<Record<string, Coverage>> => {
  const rows = new Map<string, Coverage>();
  if (dbConfigured) {
    try {
      const r = await db.select().from(schema.instrumentCoverage).where(eq(schema.instrumentCoverage.provider, PROVIDER));
      for (const x of r) rows.set(x.symbol, { symbol: x.symbol, state: x.state, vendorSymbol: x.vendorSymbol, reason: x.reason, checkedAt: x.checkedAt.toISOString() });
    } catch (e) { reportError(e, { where: "coverage.read" }); }
  }
  for (const [k, v] of seen) {
    const symbol = k.slice(PROVIDER.length + 1);
    const cur = rows.get(symbol);
    if (!cur || !cur.checkedAt || Date.parse(cur.checkedAt) < v.at) rows.set(symbol, { symbol, state: v.state, vendorSymbol: v.vendorSymbol, reason: v.reason, checkedAt: new Date(v.at).toISOString() });
  }
  return Object.fromEntries(INSTRUMENT_LIST.map((i) => [i.symbol, i.providers.twelvedata.computed ? computedCoverage(i, rows) : rows.get(i.symbol) ?? { symbol: i.symbol, state: "unchecked" as const, vendorSymbol: null, reason: null, checkedAt: null }]));
});

/** DXY is computed from six FX pairs, so it is available exactly when EURUSD (a component) is. */
function computedCoverage(i: InstrumentDef, rows: Map<string, Coverage>): Coverage {
  const vendorDxy = process.env.MARKET_DATA_DXY_SYMBOL?.trim();
  if (vendorDxy) return { symbol: i.symbol, state: rows.get(i.symbol)?.state ?? "unchecked", vendorSymbol: vendorDxy, reason: null, checkedAt: rows.get(i.symbol)?.checkedAt ?? null };
  const eur = rows.get("EURUSD");
  return { symbol: i.symbol, state: eur?.state === "unavailable" ? "unavailable" : "computed", vendorSymbol: null, reason: "Computed from the six ICE component pairs.", checkedAt: eur?.checkedAt ?? null };
}

/** The vendor symbol to request: the verified one if known, else candidates not yet refused, in order. */
export async function vendorCandidates(symbol: string): Promise<string[]> {
  const def = INSTRUMENTS[symbol];
  if (!def) return [];
  const local = seen.get(key(symbol));
  if (local?.state === "verified" && local.vendorSymbol) return [local.vendorSymbol];
  const map = await coverageMap();
  const c = map[symbol];
  if (c?.state === "verified" && c.vendorSymbol) return [c.vendorSymbol];
  return def.providers.twelvedata.candidates;
}

/**
 * Background probe (cron): checks up to `limit` instruments that are unchecked or older than a day, one cheap daily-bar
 * request per candidate. Spaced out so a free plan's per-minute credit limit is respected.
 */
export async function probeCoverage(apiKey: string, limit = 6, fetchImpl: typeof fetch = fetch) {
  const client = twelveData(apiKey, fetchImpl);
  const map = await coverageMap();
  const due = INSTRUMENT_LIST.filter((i) => !i.providers.twelvedata.computed)
    .map((i) => ({ i, at: map[i.symbol]?.checkedAt ? Date.parse(map[i.symbol]!.checkedAt!) : 0 }))
    .filter((x) => Date.now() - x.at > REFRESH_MS)
    .sort((a, b) => a.at - b.at)
    .slice(0, limit);
  const out: { symbol: string; state: "verified" | "unavailable" | "error"; vendorSymbol?: string; reason?: string }[] = [];
  for (const { i } of due) {
    let done = false, lastReason = "No candidate symbol is listed.";
    for (const cand of i.providers.twelvedata.candidates) {
      try {
        const bars = await client.candles(cand, "1D", 2);
        if (bars.length) { await persist(i.symbol, "verified", cand, null); out.push({ symbol: i.symbol, state: "verified", vendorSymbol: cand }); done = true; break; }
        lastReason = `${cand}: no bars returned.`;
      } catch (e) {
        if (!isCoverageError(e)) { out.push({ symbol: i.symbol, state: "error", reason: e instanceof Error ? e.message : "request failed" }); done = true; break; }
        lastReason = `${cand}: ${e instanceof Error ? e.message : "not available"}`;
      }
    }
    if (!done) { await persist(i.symbol, "unavailable", null, lastReason); out.push({ symbol: i.symbol, state: "unavailable", reason: lastReason }); }
  }
  return out;
}

/** For tests and the coverage report: drop this instance's memory. */
export const _resetCoverageMemory = () => seen.clear();
