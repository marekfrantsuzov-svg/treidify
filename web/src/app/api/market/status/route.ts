import { NextResponse } from "next/server";
import { getSeries, marketDataStatus, marketPlan, type SeriesResult } from "@/server/market/service";
import { coverageMap, probeCoverage } from "@/server/market/coverage";
import { TIMEFRAMES, type Timeframe } from "@/server/market/instruments";
import { economicCalendar, latestHeadlines, newsStatus } from "@/server/news/service";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Production verification of the market-data integration, read by the market-verify GitHub workflow.
 * Runs REAL provider requests (through the same loader the charts use) and reports what came back: bar counts,
 * last bar time, freshness, latency and the provider's exact error text. It never returns sample data and never
 * reveals the API key. Only fixed request sets are allowed, and each set is reused for 30 s per instance, so
 * this endpoint cannot be used to burn the plan's credits.
 */
const SETS: Record<string, [string, Timeframe][]> = {
  gold: TIMEFRAMES.map((tf) => ["XAUUSD", tf]),
  core: [["XAGUSD", "1H"], ["EURUSD", "1H"], ["GBPUSD", "1H"], ["USDJPY", "1H"], ["BTCUSD", "1H"]],
  dxy: [["DXY", "1H"]],
};
const memo = new Map<string, { at: number; body: unknown }>();
const REUSE_MS = 30_000;

function summarize(r: SeriesResult, ms: number) {
  if (!r.ok) return { symbol: r.symbol, tf: r.timeframe, ok: false, ms, reason: r.reason, message: r.message, detail: r.detail ?? null };
  const last = r.candles.at(-1)!;
  return {
    symbol: r.symbol, tf: r.timeframe, ok: true, ms, vendor: r.vendor, method: r.method, bars: r.candles.length,
    firstBarAt: new Date(r.candles[0]!.t * 1000).toISOString(), lastBarAt: r.lastBarAt, lastClose: last.c,
    freshness: r.freshness, fetchedAt: r.fetchedAt,
  };
}

export async function GET(req: Request) {
  const st = marketDataStatus();
  const set = new URL(req.url).searchParams.get("set") ?? "";
  const base = { configured: st.configured, vendor: st.vendor, needs: st.needs, dxyMethod: st.dxyMethod, commit: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? null };
  const headers = { "Cache-Control": "no-store" };
  if (set === "news") {
    // News and calendar check (Finnhub). Reports counts, newest time and sources, never the stories themselves.
    const ns = newsStatus();
    if (!ns.configured) return NextResponse.json({ news: { configured: false, needs: ns.needs } }, { headers });
    const now = new Date();
    const [h, c] = await Promise.all([latestHeadlines(40), economicCalendar(now, new Date(now.getTime() + 7 * 86_400_000))]);
    return NextResponse.json({ news: {
      configured: true, vendor: ns.vendor,
      headlines: h.ok ? { ok: true, count: h.data.length, newest: h.data.map((x) => x.publishedAt).sort().at(-1) ?? null, sources: [...new Set(h.data.map((x) => x.source))].slice(0, 8), breaking: h.data.filter((x) => x.breaking).length, withInstruments: h.data.filter((x) => x.instruments.length).length } : h,
      calendar: c.ok ? { ok: true, count: c.data.length, next: c.data.find((x) => x.at >= now.toISOString())?.at ?? null, high: c.data.filter((x) => x.importance === "high").length } : c,
    } }, { headers });
  }
  if (!st.configured) return NextResponse.json({ ...base, results: [] }, { headers });
  Object.assign(base, { plan: await marketPlan() });

  const hit = memo.get(set);
  if (hit && Date.now() - hit.at < REUSE_MS) return NextResponse.json({ ...base, reused: true, ...(hit.body as object) }, { headers });

  let body: object;
  if (set === "probe") {
    body = { probe: await probeCoverage(process.env.MARKET_DATA_API_KEY!.trim(), 6) };
  } else if (set === "coverage") {
    body = { coverage: Object.values(await coverageMap()) };
  } else if (SETS[set]) {
    const results = await Promise.all(SETS[set]!.map(async ([sym, tf]) => {
      const t0 = Date.now();
      const r = await getSeries(sym, tf, 300);
      return summarize(r, Date.now() - t0);
    }));
    body = { checkedAt: new Date().toISOString(), results };
  } else {
    return NextResponse.json({ ...base, sets: [...Object.keys(SETS), "probe", "coverage"] }, { headers });
  }
  memo.set(set, { at: Date.now(), body });
  return NextResponse.json({ ...base, ...body }, { headers });
}
