import { analyzeLevels, type PriceZone } from "@/lib/analytics/levels";
import { atr as atrSeries, ema } from "@/lib/analytics/indicators";
import { analyzeVolatility } from "@/lib/analytics/volatility";
import type { Candle } from "@/lib/analytics/types";
import { structuralFib, type FibLeg } from "./fibonacci";
import { equalLevels, recentSweeps, type LiquidityPool, type Sweep } from "./liquidity";
import { clamp, correlation, rsi } from "./math";
import { analyzeStructure, type StructureEvent, type StructureResult, type Trend } from "./structure";

/**
 * Treidify intelligence engine. Deterministic: the same candles always give the same output. AI may only explain
 * what this returns; it never adds levels or changes a bias. Methodology: docs/INTELLIGENCE_METHODOLOGY.md.
 */
export const ENGINE_VERSION = "mtf-structure-v2";

export type EngineTf = "4H" | "1H" | "15M" | "5M";
export type BiasLabel = "bullish" | "bearish" | "neutral" | "insufficient";
export interface UpcomingEvent { title: string; at: Date; importance: "high" | "medium" | "low"; country?: string }

export interface ScoreComponent { id: string; label: string; weight: number; value: number | null; contribution: number | null; detail: string }
export interface Zone {
  id: string; side: "buy" | "sell"; lower: number; upper: number; timeframe: "1H";
  reasons: string[]; withTrend: boolean; confirmation: string; invalidation: { level: number; text: string };
  status: "watching" | "in-zone" | "confirmed"; distanceATR: number | null;
}
export interface Bubble { id: string; kind: "buy" | "sell" | "context" | "liquidity" | "risk" | "structure"; title: string; text: string; timeframe: string; zoneId?: string }

export interface InstrumentIntel {
  symbol: string; engine: typeof ENGINE_VERSION; asOf: string; lastPrice: number | null; digits: number;
  bias: BiasLabel; score: number | null; confidence: "high" | "medium" | "low" | null; components: ScoreComponent[]; limitations: string[];
  trends: Record<EngineTf, Trend | null>;
  structure: { tf: EngineTf; events: StructureEvent[] }[];
  fib: FibLeg | null; levels: PriceZone[]; liquidity: LiquidityPool[]; sweeps: Sweep[];
  zones: Zone[]; bubbles: Bubble[]; invalidation: string | null; volatility: string | null;
}

export interface EngineInput {
  symbol: string; digits: number; now: Date;
  candles: Partial<Record<EngineTf, Candle[]>>;
  /** For Gold and Silver: the DXY result computed first, plus DXY 1H candles for the correlation check. */
  dxy?: { intel: InstrumentIntel; h1: Candle[] } | null;
  events?: UpcomingEvent[];
}

const MIN_BARS: Record<EngineTf, number> = { "4H": 120, "1H": 120, "15M": 80, "5M": 60 };
const BULL_T = 25, BEAR_T = -25;
const fmt = (v: number, d: number) => v.toFixed(d);
const range = (z: { lower: number; upper: number }, d: number) => `${fmt(z.lower, d)} – ${fmt(z.upper, d)}`;
const trendScore = (t: Trend | null) => (t === "bullish" ? 1 : t === "bearish" ? -1 : t === "none" ? 0 : null);

export function analyzeInstrument(input: EngineInput): InstrumentIntel {
  const { symbol, digits: d, now } = input;
  const ok = (tf: EngineTf) => (input.candles[tf]?.length ?? 0) >= MIN_BARS[tf];
  const limitations: string[] = [];
  const st: Partial<Record<EngineTf, StructureResult>> = {};
  for (const tf of ["4H", "1H", "15M", "5M"] as EngineTf[]) {
    if (ok(tf)) st[tf] = analyzeStructure(input.candles[tf]!);
    else limitations.push(`${tf}: only ${input.candles[tf]?.length ?? 0} bars, at least ${MIN_BARS[tf]} needed.`);
  }
  const h4 = input.candles["4H"], h1 = input.candles["1H"], m15 = input.candles["15M"], m5 = input.candles["5M"];
  const last = (m5?.at(-1) ?? m15?.at(-1) ?? h1?.at(-1) ?? h4?.at(-1))?.c ?? null;

  // ── Score components ──
  const comps: ScoreComponent[] = [];
  const t4 = st["4H"]?.trend ?? null, t1 = st["1H"]?.trend ?? null;
  comps.push({ id: "structure4h", label: "4H market structure", weight: 30, value: trendScore(t4), contribution: null,
    detail: t4 === null ? "Not enough 4H bars." : t4 === "none" ? "No confirmed 4H break of structure yet." : `Latest 4H ${st["4H"]!.events.at(-1)!.kind} was ${t4} at ${fmt(st["4H"]!.events.at(-1)!.level, d)}.` });
  comps.push({ id: "structure1h", label: "1H market structure", weight: 20, value: trendScore(t1), contribution: null,
    detail: t1 === null ? "Not enough 1H bars." : t1 === "none" ? "No confirmed 1H break of structure yet." : `Latest 1H ${st["1H"]!.events.at(-1)!.kind} was ${t1} at ${fmt(st["1H"]!.events.at(-1)!.level, d)}.` });

  let atr4: number | null = null;
  if (ok("4H")) {
    atr4 = atrSeries(h4!, 14).at(-1) ?? null;
    const e = ema(h4!.map((c) => c.c), 50).at(-1) ?? null;
    const c = h4!.at(-1)!.c;
    const v = atr4 && e !== null ? clamp((c - e) / (2 * atr4)) : null;
    comps.push({ id: "trend", label: "Trend strength (4H)", weight: 15, value: v, contribution: null,
      detail: v === null ? "EMA or ATR unavailable." : `Close is ${((c - e!) / atr4!).toFixed(2)} ATR ${c >= e! ? "above" : "below"} the 4H EMA(50) at ${fmt(e!, d)}.` });
  } else comps.push({ id: "trend", label: "Trend strength (4H)", weight: 15, value: null, contribution: null, detail: "Not enough 4H bars." });

  const r = ok("1H") ? rsi(h1!.map((c) => c.c), 14) : null;
  comps.push({ id: "momentum", label: "Momentum (1H RSI 14)", weight: 10, value: r === null ? null : clamp((r - 50) / 20),
    contribution: null, detail: r === null ? "RSI unavailable." : `RSI(14) on 1H is ${r.toFixed(1)}.` });

  let sweeps: Sweep[] = [];
  if (ok("15M")) {
    sweeps = recentSweeps(m15!, st["15M"]!.swings, 16);
    const latest = sweeps.at(-1);
    comps.push({ id: "liquidity", label: "Liquidity (15M sweeps)", weight: 10, value: latest ? (latest.direction === "bullish" ? 1 : -1) : 0, contribution: null,
      detail: latest ? `15M ${latest.side === "sell" ? "sell-side (lows)" : "buy-side (highs)"} liquidity at ${fmt(latest.level, d)} was swept and price closed back inside: ${latest.direction} context.` : "No 15M liquidity sweep in the last 16 bars." });
  } else comps.push({ id: "liquidity", label: "Liquidity (15M sweeps)", weight: 10, value: null, contribution: null, detail: "Not enough 15M bars." });

  if (input.dxy !== undefined) {
    const dx = input.dxy;
    let v: number | null = null, detail = "DXY data unavailable.";
    if (dx && dx.intel.score !== null && ok("1H") && dx.h1.length >= 60) {
      const map = new Map(dx.h1.map((c) => [c.t, c.c]));
      const pairs = h1!.filter((c) => map.has(c.t)).map((c) => [c.c, map.get(c.t)!] as const).slice(-121);
      const ra = pairs.slice(1).map((p, i) => Math.log(p[0] / pairs[i]![0]));
      const rb = pairs.slice(1).map((p, i) => Math.log(p[1] / pairs[i]![1]));
      const rho = correlation(ra, rb);
      if (rho !== null && rho <= -0.3) { v = clamp(-dx.intel.score / 100); detail = `${symbol} and DXY 1H returns are inversely correlated (ρ = ${rho.toFixed(2)}, last ${ra.length} bars). DXY reads ${dx.intel.bias} (${dx.intel.score > 0 ? "+" : ""}${dx.intel.score}).`; }
      else { v = 0; detail = rho === null ? "Too few overlapping bars to measure the DXY relationship." : `The usual inverse DXY relationship is weak right now (ρ = ${rho.toFixed(2)}), so DXY is not counted.`; }
    }
    comps.push({ id: "dxy", label: "DXY relationship", weight: 15, value: v, contribution: null, detail });
  }

  for (const c of comps) c.contribution = c.value === null ? null : c.value * c.weight;
  const avail = comps.filter((c) => c.value !== null);
  const totalW = comps.reduce((s, c) => s + c.weight, 0);
  const availW = avail.reduce((s, c) => s + c.weight, 0);
  const coreMissing = t4 === null || t1 === null;
  const score = coreMissing || availW === 0 ? null : Math.round((avail.reduce((s, c) => s + c.contribution!, 0) / availW) * 100);
  const bias: BiasLabel = score === null ? "insufficient" : score >= BULL_T ? "bullish" : score <= BEAR_T ? "bearish" : "neutral";

  // ── Volatility and event risk shape confidence, never direction ──
  const vol = ok("4H") ? analyzeVolatility(h4!) : null;
  const soon = (input.events ?? []).filter((e) => e.importance === "high" && e.at.getTime() > now.getTime() && e.at.getTime() - now.getTime() <= 4 * 3600_000);
  let confidence: InstrumentIntel["confidence"] = null;
  if (score !== null) {
    const coverage = availW / totalW;
    const agree = t4 !== "none" && t4 === t1;
    confidence = coverage >= 0.9 && agree && Math.abs(score) >= 50 ? "high" : coverage >= 0.7 && Math.abs(score) >= 25 ? "medium" : "low";
    if (vol?.regime === "elevated" && confidence === "high") { confidence = "medium"; limitations.push("4H volatility is in its top quartile; levels can be overrun."); }
    if (soon.length) { confidence = "low"; limitations.push(`High-impact event within 4 hours: ${soon.map((e) => e.title).join(", ")}.`); }
    if (coverage < 1) limitations.push(`Score uses ${Math.round(coverage * 100)}% of its inputs; missing inputs are left out, not guessed.`);
  }

  // ── Levels, Fibonacci and zones (1H) ──
  const lv = ok("1H") ? analyzeLevels(h1!) : null;
  const atr1 = lv?.atr ?? null;
  const fib = ok("1H") ? structuralFib(h1!, st["1H"]!) : null;
  const liquidity = ok("1H") && atr1 ? equalLevels(h1!, st["1H"]!.swings, atr1) : [];
  const zones = last !== null && atr1 ? buildZones({ last, atr: atr1, levels: lv!.zones, fib, trend4: t4, h1: h1!, m5: ok("5M") ? m5! : null, m5s: st["5M"] ?? null, d }) : [];

  const invalidation = bias === "bullish" && st["4H"]?.lastLow ? `A 4H close below ${fmt(st["4H"].lastLow.price, d)} (last 4H swing low) would undo the bullish structure.`
    : bias === "bearish" && st["4H"]?.lastHigh ? `A 4H close above ${fmt(st["4H"].lastHigh.price, d)} (last 4H swing high) would undo the bearish structure.` : null;

  const intel: InstrumentIntel = {
    symbol, engine: ENGINE_VERSION, asOf: now.toISOString(), lastPrice: last, digits: d, bias, score, confidence, components: comps, limitations,
    trends: { "4H": t4, "1H": t1, "15M": st["15M"]?.trend ?? null, "5M": st["5M"]?.trend ?? null },
    structure: (["4H", "1H", "15M", "5M"] as EngineTf[]).filter((tf) => st[tf]).map((tf) => ({ tf, events: st[tf]!.events.slice(-6) })),
    fib, levels: lv?.zones ?? [], liquidity, sweeps, zones, bubbles: [], invalidation,
    volatility: vol && vol.regime !== "insufficientData" ? `${vol.regime} (ATR at the ${Math.round(vol.percentile!)}th percentile of the last ${vol.sampleSize} 4H bars)` : null,
  };
  intel.bubbles = buildBubbles(intel, input, soon);
  return intel;
}

function buildZones(a: { last: number; atr: number; levels: PriceZone[]; fib: FibLeg | null; trend4: Trend | null; h1: Candle[]; m5: Candle[] | null; m5s: StructureResult | null; d: number }): Zone[] {
  const out: Zone[] = [];
  for (const side of ["buy", "sell"] as const) {
    const buy = side === "buy";
    const cands: { lower: number; upper: number; reasons: string[] }[] = [];
    for (const z of a.levels.filter((z) => z.kind === (buy ? "support" : "resistance"))) {
      cands.push({ lower: z.lower, upper: z.upper === z.lower ? z.upper + a.atr * 0.1 : z.upper, reasons: [`1H ${buy ? "support" : "resistance"} formed by ${z.touches} swing ${buy ? "lows" : "highs"}`] });
    }
    if (a.fib && (a.fib.direction === "up") === buy) {
      const p618 = a.fib.levels.find((l) => l.ratio === 0.618)!.price, p786 = a.fib.levels.find((l) => l.ratio === 0.786)!.price;
      cands.push({ lower: Math.min(p618, p786), upper: Math.max(p618, p786), reasons: [`1H Fibonacci 61.8–78.6% retracement of the ${a.fib.direction === "up" ? "up" : "down"}-leg ${a.fib.from.price.toFixed(a.d)} → ${a.fib.to.price.toFixed(a.d)}`] });
    }
    // Only zones on the correct side of price (or containing it), merged when they overlap.
    const valid = cands.filter((c) => (buy ? c.lower <= a.last : c.upper >= a.last)).sort((x, y) => (buy ? y.upper - x.upper : x.lower - y.lower));
    const first = valid[0];
    if (!first) continue;
    const merged = { ...first, reasons: [...first.reasons] };
    for (const c of valid.slice(1)) if (c.lower <= merged.upper && c.upper >= merged.lower) { merged.lower = Math.min(merged.lower, c.lower); merged.upper = Math.max(merged.upper, c.upper); merged.reasons.push(...c.reasons); }
    if (merged.reasons.length > 1) merged.reasons.push("Confluence: independent methods agree on this area.");
    const invLevel = buy ? merged.lower - 0.25 * a.atr : merged.upper + 0.25 * a.atr;
    // A 1H close beyond the invalidation level since the zone formed removes it.
    if (a.h1.slice(-3).some((b) => (buy ? b.c < invLevel : b.c > invLevel))) continue;
    const inside = a.last >= merged.lower && a.last <= merged.upper;
    let status: Zone["status"] = inside ? "in-zone" : "watching";
    if (inside && a.m5 && a.m5s) {
      const ev = a.m5s.events.findLast((e) => e.direction === (buy ? "bullish" : "bearish"));
      const from = Math.max(0, a.m5.length - 48);
      const enteredAt = a.m5.findIndex((b, k) => k >= from && (buy ? b.l <= merged.upper : b.h >= merged.lower));
      if (ev && enteredAt >= 0 && ev.index >= enteredAt) status = "confirmed";
    }
    const dist = buy ? Math.max(0, a.last - merged.upper) / a.atr : Math.max(0, merged.lower - a.last) / a.atr;
    const withTrend = a.trend4 === (buy ? "bullish" : "bearish");
    out.push({
      id: `${side}-${merged.lower.toFixed(a.d)}-${merged.upper.toFixed(a.d)}`, side, lower: merged.lower, upper: merged.upper, timeframe: "1H",
      reasons: merged.reasons, withTrend,
      confirmation: buy
        ? `Let price trade into ${range(merged, a.d)}, then wait for a 5M bullish change of character (a 5M close above the last 5M swing high). A sweep of 15M lows into the zone strengthens it.`
        : `Let price trade into ${range(merged, a.d)}, then wait for a 5M bearish change of character (a 5M close below the last 5M swing low). A sweep of 15M highs into the zone strengthens it.`,
      invalidation: { level: invLevel, text: `A 1H close ${buy ? "below" : "above"} ${invLevel.toFixed(a.d)} (zone edge ± 0.25 × 1H ATR) invalidates the zone.` },
      status, distanceATR: Number(dist.toFixed(2)),
    });
  }
  return out;
}

function buildBubbles(i: InstrumentIntel, input: EngineInput, soon: UpcomingEvent[]): Bubble[] {
  const d = i.digits, out: Bubble[] = [];
  for (const z of i.zones) {
    const rng = `${z.lower.toFixed(d)} – ${z.upper.toFixed(d)}`;
    const why = z.reasons[0]!.charAt(0).toLowerCase() + z.reasons[0]!.slice(1);
    const where = z.status === "in-zone" ? "Price is inside" : z.status === "confirmed" ? "Price reacted inside" : `Price is ${z.distanceATR} ATR from`;
    out.push({
      id: z.id, kind: z.side, zoneId: z.id, timeframe: "1H",
      title: `Potential ${z.side.toUpperCase()} zone${z.status === "confirmed" ? " · 5M confirmed" : ""}`,
      text: `${where} ${rng}, the ${why}${z.reasons.length > 2 ? " with confluence" : ""}. ${z.status === "confirmed" ? `A 5M ${z.side === "buy" ? "bullish" : "bearish"} structure break has printed inside the zone.` : `Wait for 5M ${z.side === "buy" ? "bullish" : "bearish"} structure confirmation.`}${z.withTrend ? "" : " This is against the 4H trend."}`,
    });
  }
  if (input.dxy?.intel && input.dxy.intel.bias !== "insufficient") {
    const dx = input.dxy.intel;
    const comp = i.components.find((c) => c.id === "dxy");
    const supports = dx.bias === "bearish" ? "may support" : dx.bias === "bullish" ? "may weigh on" : "is not giving a clear signal for";
    out.push({ id: "dxy", kind: "context", timeframe: "4H/1H", title: "DXY context", text: `DXY reads ${dx.bias}${dx.score !== null ? ` (${dx.score > 0 ? "+" : ""}${dx.score})` : ""}, which ${supports} ${i.symbol === "XAUUSD" ? "Gold" : i.symbol}${comp?.value === 0 ? ", although their usual inverse link is weak right now" : ""}.` });
  }
  const sw = i.sweeps.at(-1);
  if (sw) out.push({ id: `sweep-${sw.t}`, kind: "liquidity", timeframe: "15M", title: "Liquidity sweep", text: `15M ${sw.side === "sell" ? "lows" : "highs"} at ${sw.level.toFixed(d)} were swept and price closed back ${sw.side === "sell" ? "above" : "below"}: ${sw.direction} reaction context.` });
  const ev = i.structure.find((s) => s.tf === "1H")?.events.at(-1);
  if (ev) out.push({ id: `ms-${ev.t}`, kind: "structure", timeframe: "1H", title: `1H ${ev.kind}`, text: `1H printed a ${ev.direction} ${ev.kind === "BOS" ? "break of structure" : "change of character"} with a close through ${ev.level.toFixed(d)}.` });
  for (const e of soon) out.push({ id: `ev-${e.title}`, kind: "risk", timeframe: "Event", title: "Event risk", text: `${e.title} is due at ${e.at.toISOString().slice(11, 16)} UTC. Levels and bias can change sharply around it.` });
  return out;
}

/** Overall market conditions for a Gold trader: Gold's score and the inverse of DXY's, averaged; event risk halves it. */
export function overallConditions(gold: InstrumentIntel, dxy: InstrumentIntel, events: UpcomingEvent[] = [], now = new Date()) {
  if (gold.score === null || dxy.score === null) return { bias: "insufficient" as BiasLabel, score: null, detail: "Needs both Gold and DXY readings." };
  const risk = events.some((e) => e.importance === "high" && e.at > now && e.at.getTime() - now.getTime() <= 4 * 3600_000);
  const raw = (gold.score + -dxy.score) / 2;
  const score = Math.round(risk ? raw / 2 : raw);
  return { bias: (score >= BULL_T ? "bullish" : score <= BEAR_T ? "bearish" : "neutral") as BiasLabel, score, detail: `Average of Gold (${gold.score}) and inverted DXY (${-dxy.score})${risk ? ", halved for high-impact event risk in the next 4 hours" : ""}.` };
}
