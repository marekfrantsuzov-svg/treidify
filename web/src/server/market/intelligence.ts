import "server-only";
import { analyzeInstrument, overallConditions, type EngineTf, type InstrumentIntel, type UpcomingEvent } from "@/lib/intelligence";
import type { Candle } from "@/lib/analytics/types";
import { sampleMtf } from "@/lib/demo/markets";
import { INSTRUMENTS, type MarketSymbol } from "./instruments";
import { getMultiTimeframe, marketDataStatus, type SeriesResult } from "./service";
import type { Freshness } from "./freshness";

export interface IntelSnapshot {
  /** "live": real vendor bars. "sample": provider not connected, clearly labelled preview on sample bars. "error": provider failed. */
  mode: "live" | "sample" | "error";
  asOf: string;
  vendor: string | null;
  dxyMethod: "vendor" | "computed-ice" | null;
  freshness: Freshness | null;
  needs: string[];
  message: string | null;
  gold: InstrumentIntel; dxy: InstrumentIntel; silver: InstrumentIntel;
  overall: ReturnType<typeof overallConditions>;
  quotes: Record<MarketSymbol, { last: number | null; changePct: number | null; lastBarAt: string | null }>;
}

const TFS: EngineTf[] = ["4H", "1H", "15M", "5M"];
const worst = (xs: Freshness[]): Freshness | null => (["stale", "delayed", "live", "closed"] as Freshness[]).find((f) => xs.includes(f)) ?? null;

function quoteFrom(h1: Candle[] | undefined, lastBarAt: string | null) {
  if (!h1?.length) return { last: null, changePct: null, lastBarAt };
  const last = h1.at(-1)!.c, ref = h1.at(-25)?.c ?? h1[0]!.c;
  return { last, changePct: ((last - ref) / ref) * 100, lastBarAt };
}

function build(series: Record<MarketSymbol, Partial<Record<EngineTf, Candle[]>>>, now: Date, events: UpcomingEvent[]) {
  const dxy = analyzeInstrument({ symbol: "DXY", digits: INSTRUMENTS.DXY.digits, now, candles: series.DXY, events });
  const dxyCtx = { intel: dxy, h1: series.DXY["1H"] ?? [] };
  const gold = analyzeInstrument({ symbol: "XAUUSD", digits: INSTRUMENTS.XAUUSD.digits, now, candles: series.XAUUSD, dxy: dxyCtx, events });
  const silver = analyzeInstrument({ symbol: "XAGUSD", digits: INSTRUMENTS.XAGUSD.digits, now, candles: series.XAGUSD, dxy: dxyCtx, events });
  return { gold, dxy, silver, overall: overallConditions(gold, dxy, events, now) };
}

/** One call for every intelligence surface. Never mixes sample and live bars. */
export async function marketIntelligence(events: UpcomingEvent[] = [], now = new Date()): Promise<IntelSnapshot> {
  const st = marketDataStatus();
  if (!st.configured) {
    const series = Object.fromEntries((["XAUUSD", "DXY", "XAGUSD"] as const).map((s) => [s, sampleMtf(s)])) as Record<MarketSymbol, Record<EngineTf, Candle[]>>;
    const sampleNow = new Date(series.XAUUSD["5M"].at(-1)!.t * 1000);
    const r = build(series, sampleNow, []);
    return { mode: "sample", asOf: sampleNow.toISOString(), vendor: null, dxyMethod: null, freshness: null, needs: st.needs, message: "Market data is not connected. Everything below runs the real engine on sample bars so you can see the layout. It is not a market reading.", ...r,
      quotes: Object.fromEntries((["XAUUSD", "DXY", "XAGUSD"] as const).map((s) => [s, quoteFrom(series[s]["1H"], null)])) as IntelSnapshot["quotes"] };
  }
  const [g, d, s] = await Promise.all((["XAUUSD", "DXY", "XAGUSD"] as const).map((sym) => getMultiTimeframe(sym, now)));
  const all: Record<MarketSymbol, Record<EngineTf, SeriesResult>> = { XAUUSD: g!, DXY: d!, XAGUSD: s! };
  const failures = Object.values(all).flatMap((m) => Object.values(m)).filter((r) => !r.ok);
  const series = Object.fromEntries(Object.entries(all).map(([sym, m]) => [sym, Object.fromEntries(Object.entries(m).filter(([, r]) => r.ok).map(([tf, r]) => [tf, (r as Extract<SeriesResult, { ok: true }>).candles]))])) as Record<MarketSymbol, Partial<Record<EngineTf, Candle[]>>>;
  const r = build(series, now, events);
  const fresh = Object.values(all).map((m) => m["5M"]).filter((x): x is Extract<SeriesResult, { ok: true }> => x.ok).map((x) => x.freshness);
  const lastAt = (sym: MarketSymbol) => { const x = all[sym]["5M"]; return x.ok ? x.lastBarAt : null; };
  return {
    mode: failures.length === Object.values(all).length * TFS.length ? "error" : "live",
    asOf: now.toISOString(), vendor: st.vendor, dxyMethod: st.dxyMethod, freshness: worst(fresh), needs: [],
    message: failures.length ? `${failures.length} of ${Object.values(all).length * TFS.length} data requests failed; affected readings show Insufficient Data.` : null,
    ...r,
    quotes: { XAUUSD: quoteFrom(series.XAUUSD["1H"], lastAt("XAUUSD")), DXY: quoteFrom(series.DXY["1H"], lastAt("DXY")), XAGUSD: quoteFrom(series.XAGUSD["1H"], lastAt("XAGUSD")) },
  };
}
