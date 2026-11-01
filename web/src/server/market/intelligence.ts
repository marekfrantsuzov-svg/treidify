import "server-only";
import { analyzeInstrument, overallConditions, type EngineTf, type InstrumentIntel, type UpcomingEvent } from "@/lib/intelligence";
import type { Candle } from "@/lib/analytics/types";
import { sampleMtf } from "@/lib/demo/markets";
import { INSTRUMENTS, isSymbol, type AssetCategory } from "@/lib/markets/registry";
import { CORE_SYMBOLS, type CoreSymbol } from "./instruments";
import { getMultiTimeframe, marketDataStatus, type SeriesResult } from "./service";
import type { Freshness } from "./freshness";

type Quote = { last: number | null; changePct: number | null; lastBarAt: string | null };

/** One instrument on a multi-asset surface (Macro Desk card, Markets tab). */
export interface DeskItem {
  symbol: string;
  name: string;
  short: string;
  category: AssetCategory;
  digits: number;
  intel: InstrumentIntel;
  quote: Quote;
  /** live: real bars. sample: provider not connected (labelled). unavailable: provider does not serve it. error: request failed. */
  status: "live" | "sample" | "unavailable" | "error";
  freshness: Freshness | null;
  method: "vendor" | "computed-ice" | null;
  message: string | null;
}

export interface DeskSnapshot {
  mode: "live" | "sample" | "error";
  asOf: string;
  vendor: string | null;
  dxyMethod: "vendor" | "computed-ice" | null;
  needs: string[];
  message: string | null;
  items: DeskItem[];
  /** DXY's reading, also when DXY is not one of the requested symbols but a requested instrument has a DXY link. */
  dxy: InstrumentIntel | null;
}

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
  quotes: Record<CoreSymbol, Quote>;
}

const TFS: EngineTf[] = ["4H", "1H", "15M", "5M"];
const worst = (xs: Freshness[]): Freshness | null => (["stale", "delayed", "live", "closed"] as Freshness[]).find((f) => xs.includes(f)) ?? null;

function quoteFrom(h1: Candle[] | undefined, lastBarAt: string | null): Quote {
  if (!h1?.length) return { last: null, changePct: null, lastBarAt };
  const last = h1.at(-1)!.c, ref = h1.at(-25)?.c ?? h1[0]!.c;
  return { last, changePct: ((last - ref) / ref) * 100, lastBarAt };
}

/** Event risk only from the countries whose releases move this instrument (the registry's calendar list). */
const forInstrument = (events: UpcomingEvent[], symbol: string) => {
  const c = INSTRUMENTS[symbol]?.calendar ?? [];
  return events.filter((e) => !e.country || c.includes(e.country));
};

type Bars = Partial<Record<EngineTf, Candle[]>>;

/** DXY first, then every other instrument, each with its own registry conventions and DXY link. */
function analyzeAll(symbols: string[], bars: Record<string, Bars>, now: Date, events: UpcomingEvent[]) {
  const needDxy = symbols.includes("DXY") || symbols.some((s) => INSTRUMENTS[s]?.dxyLink);
  const dxy = needDxy && bars.DXY ? analyzeInstrument({ symbol: "DXY", digits: INSTRUMENTS.DXY!.digits, now, candles: bars.DXY, events: forInstrument(events, "DXY") }) : null;
  const dxyCtx = dxy ? { intel: dxy, h1: bars.DXY?.["1H"] ?? [] } : null;
  const out: Record<string, InstrumentIntel> = {};
  for (const s of symbols) {
    if (s === "DXY" && dxy) { out[s] = dxy; continue; }
    const def = INSTRUMENTS[s]!;
    out[s] = analyzeInstrument({
      symbol: s, digits: def.digits, now, candles: bars[s] ?? {}, events: forInstrument(events, s),
      ...(def.dxyLink ? { dxy: dxyCtx, dxyLink: def.dxyLink } : {}),
    });
  }
  return { intel: out, dxy };
}

/**
 * Intelligence for any set of registry instruments. Never mixes sample and live bars: without a provider every
 * instrument runs on labelled sample bars; with one, every reading comes from the provider or shows Insufficient Data.
 */
export async function deskIntelligence(requested: readonly string[], events: UpcomingEvent[] = [], now = new Date()): Promise<DeskSnapshot> {
  const symbols = [...new Set(requested.filter(isSymbol))];
  const extra = symbols.some((s) => s !== "DXY" && INSTRUMENTS[s]?.dxyLink) && !symbols.includes("DXY") ? ["DXY"] : [];
  const fetchList = [...symbols, ...extra];
  const st = marketDataStatus();
  const item = (s: string, intel: InstrumentIntel, quote: Quote, status: DeskItem["status"], freshness: Freshness | null, method: DeskItem["method"], message: string | null): DeskItem => {
    const d = INSTRUMENTS[s]!;
    return { symbol: s, name: d.name, short: d.short, category: d.category, digits: d.digits, intel, quote, status, freshness, method, message };
  };

  if (!st.configured) {
    const bars = Object.fromEntries(fetchList.map((s) => [s, sampleMtf(s)])) as Record<string, Bars>;
    // Sample bars share one end time, so "now" is the last sample bar: the engine sees a consistent clock.
    const sampleNow = new Date(bars[fetchList[0] ?? "XAUUSD"]?.["5M"]?.at(-1)?.t ? bars[fetchList[0]!]!["5M"]!.at(-1)!.t * 1000 : now.getTime());
    const r = analyzeAll(symbols, bars, sampleNow, []);
    return {
      mode: "sample", asOf: sampleNow.toISOString(), vendor: null, dxyMethod: null, needs: st.needs, dxy: r.dxy,
      message: "Market data is not connected. Everything below runs the real engine on sample bars so you can see the layout. It is not a market reading.",
      items: symbols.map((s) => item(s, r.intel[s]!, quoteFrom(bars[s]?.["1H"], null), "sample", null, null, null)),
    };
  }

  const results = await Promise.all(fetchList.map((s) => getMultiTimeframe(s, now)));
  const all: Record<string, Record<EngineTf, SeriesResult>> = Object.fromEntries(fetchList.map((s, i) => [s, results[i]!]));
  const bars: Record<string, Bars> = Object.fromEntries(Object.entries(all).map(([sym, m]) => [sym, Object.fromEntries(Object.entries(m).flatMap(([tf, r]) => (r.ok ? [[tf, r.candles]] : [])))]));
  const r = analyzeAll(symbols, bars, now, events);
  const failures = Object.values(all).flatMap((m) => Object.values(m)).filter((x) => !x.ok);
  const total = fetchList.length * TFS.length;
  const items = symbols.map((s) => {
    const m = all[s]!;
    const okAny = Object.values(m).find((x): x is Extract<SeriesResult, { ok: true }> => x.ok);
    const fail = Object.values(m).find((x): x is Extract<SeriesResult, { ok: false }> => !x.ok);
    const m5 = m["5M"];
    const status: DeskItem["status"] = okAny ? "live" : fail?.reason === "not-covered" ? "unavailable" : "error";
    return item(s, r.intel[s]!, quoteFrom(bars[s]?.["1H"], m5.ok ? m5.lastBarAt : null), status, m5.ok ? m5.freshness : null, okAny?.method ?? null, okAny ? null : fail?.message ?? null);
  });
  const otherFails = failures.filter((f) => !f.ok && f.reason !== "not-covered").length;
  return {
    mode: failures.length === total ? "error" : "live", asOf: now.toISOString(), vendor: st.vendor, dxyMethod: st.dxyMethod, needs: [], dxy: r.dxy,
    message: otherFails ? `${otherFails} of ${total} data requests failed; affected readings show Insufficient Data.` : null,
    items,
  };
}

/** The original Gold / DXY / Silver snapshot used by the dashboard and the Analysis page. Same output as before. */
export async function marketIntelligence(events: UpcomingEvent[] = [], now = new Date()): Promise<IntelSnapshot> {
  const d = await deskIntelligence(CORE_SYMBOLS, events, now);
  const by = (s: CoreSymbol) => d.items.find((i) => i.symbol === s)!;
  const gold = by("XAUUSD").intel, dxy = by("DXY").intel, silver = by("XAGUSD").intel;
  const fresh = d.items.map((i) => i.freshness).filter((f): f is Freshness => f !== null);
  return {
    mode: d.mode, asOf: d.asOf, vendor: d.vendor, dxyMethod: d.dxyMethod, freshness: d.mode === "sample" ? null : worst(fresh), needs: d.needs, message: d.message,
    gold, dxy, silver, overall: overallConditions(gold, dxy, d.mode === "sample" ? [] : events, d.mode === "sample" ? new Date(d.asOf) : now),
    quotes: { XAUUSD: by("XAUUSD").quote, DXY: by("DXY").quote, XAGUSD: by("XAGUSD").quote },
  };
}
