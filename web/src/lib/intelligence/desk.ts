import type { BiasLabel, EngineTf, InstrumentIntel, Zone } from "./engine";
import type { LiquidityPool } from "./liquidity";
import type { StructureEvent } from "./structure";
import type { TradeSetup } from "./setup";
import { maxStopPrice, stopCheck } from "@/lib/trading/pips";
import { INSTRUMENTS } from "@/lib/markets/registry";

/**
 * Presentation models for the Macro Desk. Everything here is derived from the engine's computed output: no new
 * numbers, no probabilities, no invented narrative. Text states what the bars show and what would change it.
 */

export const TFS: EngineTf[] = ["4H", "1H", "15M", "5M"];
export type TfState = "bullish" | "bearish" | "none" | "na";

const f = (v: number, d: number) => v.toFixed(d);
const rng = (lo: number, hi: number, d: number) => `${f(lo, d)} – ${f(hi, d)}`;

export function tfStates(i: InstrumentIntel): { tf: EngineTf; state: TfState }[] {
  return TFS.map((tf) => ({ tf, state: i.trends[tf] === null ? "na" : i.trends[tf]! }));
}

/** Latest BOS/CHOCH on the highest timeframe that has one. */
export function latestStructure(i: InstrumentIntel): (StructureEvent & { tf: EngineTf }) | null {
  for (const tf of TFS) {
    const ev = i.structure.find((s) => s.tf === tf)?.events.at(-1);
    if (ev) return { ...ev, tf };
  }
  return null;
}

export function rsiOf(i: InstrumentIntel): number | null {
  const m = i.components.find((c) => c.id === "momentum")?.detail.match(/RSI\(14\) on 1H is (\d+(?:\.\d+)?)/);
  return m ? Number(m[1]) : null;
}

export function momentumLabel(rsi: number | null): { label: string; tone: TfState } {
  if (rsi === null) return { label: "Unavailable", tone: "na" };
  if (rsi >= 70) return { label: "Stretched up", tone: "bullish" };
  if (rsi >= 55) return { label: "Building up", tone: "bullish" };
  if (rsi <= 30) return { label: "Stretched down", tone: "bearish" };
  if (rsi <= 45) return { label: "Building down", tone: "bearish" };
  return { label: "Flat", tone: "none" };
}

/** Nearest resting liquidity above (equal highs) and below (equal lows) the last price, plus the latest 15M sweep. */
export function liquidityView(i: InstrumentIntel) {
  const p = i.lastPrice;
  const above = p === null ? null : i.liquidity.filter((l) => l.side === "buy" && l.price > p).sort((a, b) => a.price - b.price)[0] ?? null;
  const below = p === null ? null : i.liquidity.filter((l) => l.side === "sell" && l.price < p).sort((a, b) => b.price - a.price)[0] ?? null;
  const sweep = i.sweeps.at(-1) ?? null;
  let summary: string;
  if (sweep) summary = `15M ${sweep.side === "sell" ? "lows" : "highs"} at ${f(sweep.level, i.digits)} were swept and price closed back inside (${sweep.direction} context).`;
  else if (above || below) summary = [above && `Equal highs near ${f(above.price, i.digits)} hold buy-side liquidity`, below && `equal lows near ${f(below.price, i.digits)} hold sell-side liquidity`].filter(Boolean).join("; ") + ".";
  else summary = "No clustered equal highs or lows near price on 1H, and no recent 15M sweep.";
  return { above, below, sweep, summary };
}

/** Why the bias reads as it does: the two largest score contributions, in the engine's own words. */
export function biasReasons(i: InstrumentIntel): string[] {
  if (i.bias === "insufficient") return ["Not enough verified bars to read structure on 4H and 1H."];
  const top = i.components.filter((c) => c.contribution !== null && c.contribution !== 0).sort((a, b) => Math.abs(b.contribution!) - Math.abs(a.contribution!)).slice(0, 3);
  return top.length ? top.map((c) => c.detail) : ["No input is pushing strongly in either direction."];
}

export interface Relation { label: string; tone: "aligned" | "diverging" | "unclear"; text: string }

const nameOf = (i: InstrumentIntel) => (i.symbol === "XAUUSD" ? "Gold" : i.symbol === "XAGUSD" ? "Silver" : INSTRUMENTS[i.symbol]?.short ?? i.symbol);

/**
 * DXY versus an instrument (Gold by default). States what the measured relationship and the two structures show;
 * never assumes the link. USD-quoted markets expect an inverse link, USD-based pairs (USDJPY) a positive one, and
 * markets without a structural dollar link (indices, crypto, oil) say so instead of borrowing Gold's logic.
 */
export function dxyRelation(gold: InstrumentIntel, dxy: InstrumentIntel): Relation {
  const name = nameOf(gold);
  const link = INSTRUMENTS[gold.symbol]?.dxyLink ?? "inverse";
  const comp = gold.components.find((c) => c.id === "dxy");
  if (!comp && INSTRUMENTS[gold.symbol] && !INSTRUMENTS[gold.symbol]!.dxyLink) {
    return { label: "Not modelled", tone: "unclear", text: `${name} has no structural link to the dollar index in Treidify's model, so DXY is shown for context and not scored for ${name}.` };
  }
  const rho = comp?.detail.match(/ρ = (-?[\d.]+)/)?.[1];
  if (gold.bias === "insufficient" || dxy.bias === "insufficient") return { label: "Not enough data", tone: "unclear", text: `Both ${name} and DXY need verified 4H and 1H structure before their relationship can be read.` };
  const measured = rho !== undefined ? ` Measured 1H return correlation: ρ = ${rho}.` : " The 1H return correlation could not be measured on the available bars.";
  const direct = link === "direct";
  const holding = rho !== undefined && (direct ? Number(rho) >= 0.3 : Number(rho) <= -0.3);
  const opposite = (gold.bias === "bullish" && dxy.bias === "bearish") || (gold.bias === "bearish" && dxy.bias === "bullish");
  const same = gold.bias === dxy.bias && gold.bias !== "neutral";
  const expected = direct ? same : opposite;
  const against = direct ? opposite : same;
  const word = direct ? "positive" : "inverse";
  if (expected) return { label: holding ? `${direct ? "Positive" : "Inverse"} link holding` : `${direct ? "Same way" : "Opposite"}, link weak`, tone: "aligned", text: `DXY is ${dxy.bias} while ${name} is ${gold.bias}, the textbook pattern.${measured}${holding ? "" : ` The link is weak right now, so DXY is not counted in ${name}'s score.`}` };
  if (against) return { label: direct ? "Diverging" : "Moving together", tone: "diverging", text: `DXY reads ${dxy.bias} and ${name} reads ${gold.bias}. The usual ${word} relationship is not holding on this structure, so a dollar move is not a reliable read for ${name} right now.${measured}` };
  return { label: "No clear link", tone: "unclear", text: `DXY reads ${dxy.bias} and ${name} reads ${gold.bias}, so the dollar is not giving ${name} a clear signal.${measured}` };
}

/** One instrument versus another (Silver versus Gold by default): does its structure confirm or diverge? */
export function silverRelation(gold: InstrumentIntel, silver: InstrumentIntel): Relation {
  const a = nameOf(gold), b = nameOf(silver);
  if (gold.bias === "insufficient" || silver.bias === "insufficient") return { label: "Not enough data", tone: "unclear", text: `${b} and ${a} both need verified 4H and 1H structure to compare.` };
  const t = (i: InstrumentIntel) => i.trends["4H"];
  const metals = INSTRUMENTS[gold.symbol]?.category === "metals" && INSTRUMENTS[silver.symbol]?.category === "metals";
  if (silver.bias === gold.bias && silver.bias !== "neutral") return { label: `Confirms ${a}`, tone: "aligned", text: `${b} is ${silver.bias} like ${a}${t(silver) === t(gold) && t(gold) && t(gold) !== "none" ? `, and both 4H structures are ${t(gold)}` : ""}.${metals ? ` Agreement across metals supports ${a}'s read.` : " The two markets agree on direction; that is context, not a trading signal."}` };
  if ((silver.bias === "bullish" && gold.bias === "bearish") || (silver.bias === "bearish" && gold.bias === "bullish")) return { label: `Diverges from ${a}`, tone: "diverging", text: `${b} is ${silver.bias} while ${a} is ${gold.bias}.${metals ? ` Divergence between the metals lowers conviction in ${a}'s direction.` : " The two markets disagree on direction right now."}` };
  return { label: "Mixed", tone: "unclear", text: `${b} reads ${silver.bias} and ${a} reads ${gold.bias}: no confirmation either way.` };
}

export const peerRelation = silverRelation;

export interface ZoneBrief {
  zone: Zone;
  range: string;
  why: string[];
  fib: string | null;
  liquidity: string;
  structure: string;
  confirmation: string;
  invalidation: string;
  stopPips: number;
  maxStopPips: number | null;
  readiness: "ready" | "wait";
  readinessText: string;
  /** Position of price relative to the zone, for the mini diagram: 0..1 across [lo, hi] of the diagram range. */
  diagram: { lo: number; hi: number; zoneLo: number; zoneHi: number; price: number | null; stop: number };
}

/** Everything the key-zone card shows, computed from the zone, the engine output and the 50-pip rule. */
export function zoneBrief(i: InstrumentIntel, z: Zone, setup: TradeSetup): ZoneBrief {
  const d = i.digits, buy = z.side === "buy";
  const width = Math.max(z.upper - z.lower, Math.abs(z.upper) * 1e-5);
  const fibs = i.fib?.levels.filter((l) => l.price >= z.lower - width * 0.25 && l.price <= z.upper + width * 0.25) ?? [];
  const fib = fibs.length && i.fib ? `${fibs.map((l) => `${(l.ratio * 100).toFixed(1)}%`).join(" and ")} retracement of the 1H ${i.fib.direction}-leg ${f(i.fib.from.price, d)} → ${f(i.fib.to.price, d)}` : null;
  const near = (p: LiquidityPool) => p.price >= z.lower - width * 2 && p.price <= z.upper + width * 2;
  const pools = i.liquidity.filter(near);
  const swept = i.sweeps.filter((s) => s.level >= z.lower - width && s.level <= z.upper + width);
  const liquidity = swept.length
    ? `Liquidity at ${f(swept.at(-1)!.level, d)} was already swept on 15M, which can fuel a ${buy ? "bounce" : "rejection"} from here.`
    : pools.length ? `${pools.length === 1 ? "A pool" : `${pools.length} pools`} of ${pools[0]!.side === "sell" ? "sell-side (equal lows)" : "buy-side (equal highs)"} liquidity sit near ${f(pools[0]!.price, d)}; a sweep into the zone would strengthen it.`
    : "No clustered liquidity next to this zone.";
  const t4 = i.trends["4H"];
  const structure = z.withTrend ? `With the 4H trend (${t4}). ${z.status === "confirmed" ? "A 5M structure break has printed inside the zone." : z.status === "in-zone" ? "Price is inside the zone now." : `Price is ${z.distanceATR} × 1H ATR away.`}`
    : `Against the 4H trend (${t4 ?? "unavailable"}). Counter-trend zones need extra confirmation.`;
  const worst = buy ? z.upper : z.lower;
  const check = stopCheck(i.symbol, worst, z.invalidation.level);
  const stopPips = check.pips;
  const max = check.max;
  let readiness: ZoneBrief["readiness"] = "wait", readinessText: string;
  if (!check.eligible && max !== null) readinessText = `WAIT / NO VALID SETUP: the structural stop needs ${stopPips} pips, above the ${max}-pip maximum ($${check.maxPrice!.toFixed(2)} of price movement). The stop is never tightened to fit.`;
  else if (setup.status === "valid" && setup.zoneId === z.id) { readiness = "ready"; readinessText = z.status === "confirmed" ? "Setup is valid and 5M has confirmed inside the zone." : "Setup is valid. Entry still needs the 5M confirmation described below."; }
  else if (!z.withTrend) readinessText = "Wait: this zone is against the 4H trend.";
  else if (setup.status === "wait" && setup.zoneId === z.id) readinessText = `Wait: ${setup.reasons[0]}`;
  else readinessText = i.bias === "neutral" ? "Wait: structure is mixed across timeframes." : "Wait: price has not reached the zone with confirmation.";
  const price = i.lastPrice;
  const pts = [z.lower, z.upper, z.invalidation.level, ...(price !== null ? [price] : [])];
  const pad = (Math.max(...pts) - Math.min(...pts)) * 0.18 || width;
  return {
    zone: z, range: rng(z.lower, z.upper, d), why: z.reasons, fib, liquidity, structure, confirmation: z.confirmation, invalidation: z.invalidation.text,
    stopPips, maxStopPips: max, readiness, readinessText,
    diagram: { lo: Math.min(...pts) - pad, hi: Math.max(...pts) + pad, zoneLo: z.lower, zoneHi: z.upper, price, stop: z.invalidation.level },
  };
}

export interface Scenario {
  id: "bullish" | "bearish" | "wait";
  title: string;
  active: boolean;
  headline: string;
  requirements: string[];
  invalidation: string;
  alignment: { tf: EngineTf; state: TfState; supports: boolean }[];
}

/** Bullish, bearish and wait scenarios, with the one the engine currently points to marked active. */
export function scenarios(i: InstrumentIntel, setup: TradeSetup): Scenario[] {
  const d = i.digits;
  const tfs = tfStates(i);
  const buyZ = i.zones.find((z) => z.side === "buy"), sellZ = i.zones.find((z) => z.side === "sell");
  const active: Scenario["id"] = setup.status === "valid" ? (setup.side === "buy" ? "bullish" : "bearish") : "wait";
  const align = (dir: "bullish" | "bearish") => tfs.map((t) => ({ ...t, supports: t.state === dir }));
  const bull: Scenario = {
    id: "bullish", title: "Bullish scenario", active: active === "bullish",
    headline: buyZ ? `Buy only from ${rng(buyZ.lower, buyZ.upper, d)} after confirmation.` : "No qualified buy zone near price.",
    requirements: [
      i.trends["4H"] === "bullish" ? "4H structure is bullish (in place)." : "4H structure turns bullish with a bullish BOS.",
      i.trends["1H"] === "bullish" ? "1H structure agrees (in place)." : "1H prints a bullish break of structure.",
      buyZ ? `Price trades into ${rng(buyZ.lower, buyZ.upper, d)} and 5M closes above its last swing high (CHOCH).` : "A 1H support or 61.8–78.6% retracement zone forms below price.",
      ...(i.symbol === "XAUUSD" ? [`The structural stop fits within 50 pips ($${maxStopPrice("XAUUSD")!.toFixed(2)}).`] : []),
    ],
    invalidation: buyZ ? buyZ.invalidation.text : i.invalidation ?? "Without a zone there is nothing to invalidate.",
    alignment: align("bullish"),
  };
  const bear: Scenario = {
    id: "bearish", title: "Bearish scenario", active: active === "bearish",
    headline: sellZ ? `Sell only from ${rng(sellZ.lower, sellZ.upper, d)} after confirmation.` : "No qualified sell zone near price.",
    requirements: [
      i.trends["4H"] === "bearish" ? "4H structure is bearish (in place)." : "4H structure turns bearish with a bearish BOS.",
      i.trends["1H"] === "bearish" ? "1H structure agrees (in place)." : "1H prints a bearish break of structure.",
      sellZ ? `Price trades into ${rng(sellZ.lower, sellZ.upper, d)} and 5M closes below its last swing low (CHOCH).` : "A 1H resistance or 61.8–78.6% retracement zone forms above price.",
      ...(i.symbol === "XAUUSD" ? [`The structural stop fits within 50 pips ($${maxStopPrice("XAUUSD")!.toFixed(2)}).`] : []),
    ],
    invalidation: sellZ ? sellZ.invalidation.text : i.invalidation ?? "Without a zone there is nothing to invalidate.",
    alignment: align("bearish"),
  };
  const wait: Scenario = {
    id: "wait", title: "Wait / no trade", active: active === "wait",
    headline: setup.status === "wait" ? "Current structure does not offer a valid trade." : "A valid setup exists; waiting is still an option until it confirms.",
    requirements: setup.status === "wait" ? setup.reasons : ["Stand aside if 5M confirmation does not print inside the zone.", "Stand aside into high-impact events."],
    invalidation: "Waiting ends when one of the scenarios above completes all of its conditions.",
    alignment: tfs.map((t) => ({ ...t, supports: t.state === "none" || t.state === "na" })),
  };
  return [bull, bear, wait];
}

export const biasWord: Record<BiasLabel, string> = { bullish: "Bullish", bearish: "Bearish", neutral: "Neutral", insufficient: "No reading" };

// ── Sentiment ───────────────────────────────────────────────────────────────────────────────────────────────
export interface SentHeadline { title: string; source: string; url: string; publishedAt: string; instruments: string[]; importance: "high" | "medium" | "low" }
export interface SentEvent { title: string; country: string; at: string; importance: "high" | "medium" | "low"; kind: string | null; actual: string | null; forecast: string | null; previous: string | null }

const GEO = /\b(war|conflict|sanction|missile|invasion|ceasefire|geopolit|tariff|military|strike on|attack|nuclear|middle east|ukraine|russia|china|taiwan|iran|israel)\b/i;
const CB = /\b(fed|fomc|powell|ecb|lagarde|boe|boj|central bank|rate (cut|hike|decision)|interest rate|monetary policy)\b/i;
const INF = /\b(inflation|cpi|pce|ppi|prices)\b/i;
const YLD = /\b(yield|treasur(y|ies)|bond)\b/i;

/** Headlines are verified facts (from the provider); the topic grouping is a plain keyword filter, not a judgement. */
export function headlinesAbout(h: SentHeadline[], topic: "geo" | "cb" | "inf" | "yld", n = 3) {
  const re = topic === "geo" ? GEO : topic === "cb" ? CB : topic === "inf" ? INF : YLD;
  return h.filter((x) => re.test(x.title)).slice(0, n);
}

/** Latest released and next scheduled event of the given kinds. */
export function releases(events: SentEvent[], kinds: string[], now: number) {
  const of = events.filter((e) => e.kind && kinds.includes(e.kind));
  const last = of.filter((e) => e.actual && Date.parse(e.at) <= now).sort((a, b) => Date.parse(b.at) - Date.parse(a.at))[0] ?? null;
  const next = of.filter((e) => Date.parse(e.at) > now).sort((a, b) => Date.parse(a.at) - Date.parse(b.at))[0] ?? null;
  return { last, next };
}
