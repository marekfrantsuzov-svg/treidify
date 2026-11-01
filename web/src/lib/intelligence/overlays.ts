import { atr as atrSeries } from "@/lib/analytics/indicators";
import { cluster } from "@/lib/analytics/levels";
import type { Candle, SwingPoint } from "@/lib/analytics/types";
import { stopCheck, type StopCheck } from "@/lib/trading/pips";
import { INSTRUMENTS } from "@/lib/markets/registry";
import { FIB_LEVELS } from "./fibonacci";
import { analyzeStructure, type StructureEvent, type Trend } from "./structure";

/**
 * Timeframe overlays: zones, Fibonacci, liquidity, structure and volume computed from the candles of ONE timeframe —
 * the one on screen. Pure and deterministic, so it runs in the browser on the bars the chart shows and every
 * timeframe switch recomputes its own overlays. Nothing here is fetched, guessed or drawn at an arbitrary price.
 * Methodology: docs/INTELLIGENCE_METHODOLOGY.md § "Timeframe overlays".
 */
export const OVERLAY_VERSION = "tf-overlays-v1";
export type OverlayTf = "1M" | "5M" | "15M" | "1H" | "4H" | "1D";

export const OVERLAY_RULES = {
  atrPeriod: 14,
  swingStrength: 2,
  /** A displacement candle: body ≥ 1.2 × ATR(14) and the body is ≥ 60% of the candle's range. */
  displacementBodyATR: 1.2,
  displacementBodyShare: 0.6,
  /** Or a run of 2–3 same-direction candles whose net move is ≥ 1.8 × ATR(14). */
  legMoveATR: 1.8,
  /** How many bars before a displacement candle we search for its base (the last opposite candle). */
  baseLookback: 3,
  /** Structural invalidation sits this far beyond the zone's distal edge. */
  invalidationBufferATR: 0.1,
  /** Invalidated zones older than this many bars become "historical". */
  recentInvalidationBars: 30,
  /** A zone tested this many times is considered consumed and becomes "historical". */
  maxTests: 3,
  zonesPerSide: 3,
  historyPerSide: 2,
  equalTolATR: 0.15,
  previousSwings: 3,
  liquidityLookback: 160,
  unsweptPerSide: 3,
  sweptPerSide: 2,
  recentSweepBars: 40,
  relVolPeriod: 20,
  relVolHigh: 1.5,
  minBars: 40,
} as const;

export type ZoneStatus = "active" | "tested" | "invalidated" | "historical";
export interface SDZone {
  id: string;
  side: "buy" | "sell";
  kind: "demand" | "supply";
  tf: OverlayTf;
  lower: number;
  upper: number;
  /** Bar index / time of the base candle the zone is drawn from. The zone extends right from here. */
  originIndex: number;
  originT: number;
  displacementIndex: number;
  /** Size of the displacement candle body in ATR units. */
  displacementATR: number;
  brokeStructure: StructureEvent | null;
  status: ZoneStatus;
  tests: number;
  firstTestIndex: number | null;
  invalidatedIndex: number | null;
  strength: "strong" | "moderate" | "weak";
  /** Structural invalidation price (distal edge ± buffer). Never moved to make a setup fit. */
  invalidation: number;
  /** Worst realistic entry: the edge price reaches first (top of demand, bottom of supply). */
  proximal: number;
  stop: StopCheck;
  fib: { ratio: number; price: number }[];
  liquidity: string | null;
  reasons: string[];
}

export interface FibScenario {
  direction: "bullish" | "bearish";
  from: { price: number; t: number; index: number };
  to: { price: number; t: number; index: number };
  levels: { ratio: number; price: number }[];
  tf: OverlayTf;
}

export interface LiquidityBand {
  id: string;
  side: "buy" | "sell";
  kind: "equal-highs" | "equal-lows" | "swing-high" | "swing-low";
  lower: number;
  upper: number;
  price: number;
  swings: number;
  firstIndex: number;
  lastIndex: number;
  /** Swept: a later wick traded through and the bar closed back. Taken: a later bar closed through. */
  state: "unswept" | "swept" | "taken";
  sweptIndex: number | null;
  /** Qualitative estimate from swing structure only. This is NOT order-book liquidity. */
  estimate: "High" | "Medium" | "Low";
}

export interface SwingLabel extends SwingPoint { label: "HH" | "HL" | "LH" | "LL" | "H" | "L" }

export interface VolumeInfo {
  kind: "exchange" | "tick" | "none";
  label: string;
  note: string;
  /** Relative volume per bar (v / SMA20), null where unavailable. */
  rel: (number | null)[];
  highIndices: number[];
}

export interface TfOverlays {
  version: typeof OVERLAY_VERSION;
  symbol: string;
  tf: OverlayTf;
  digits: number;
  bars: number;
  atr: number | null;
  last: number | null;
  trend: Trend;
  zones: SDZone[];
  fib: { bullish: FibScenario | null; bearish: FibScenario | null; active: "bullish" | "bearish" | null };
  liquidity: LiquidityBand[];
  structure: { events: StructureEvent[]; swings: SwingLabel[]; displacement: number[] };
  volume: VolumeInfo;
  limitations: string[];
}

/** Whether the provider's volume is tick volume (OTC spot metals, FX, energy CFDs) or traded volume (crypto). */
const volumeKind = (symbol: string) => INSTRUMENTS[symbol]?.volume ?? "tick";

const body = (c: Candle) => Math.abs(c.c - c.o);
const fmt = (v: number, d: number) => v.toFixed(d);

/**
 * Displacement ending at bar i, in ATR units, or null. Either one candle with body ≥ 1.2 × ATR and body ≥ 60% of its
 * range, or a run of two or three same-direction candles (each body ≥ 50% of its range) whose net move from the first
 * open to the last close is ≥ 1.8 × ATR. Returns the leg's first index too, so the base is found before the whole leg.
 */
export function displacementAt(candles: readonly Candle[], atr: readonly (number | null)[], i: number): { atr: number; start: number } | null {
  const R = OVERLAY_RULES;
  const c = candles[i]!, a = atr[i - 1] ?? atr[i];
  if (!a || a <= 0) return null;
  const share = (x: Candle) => (x.h - x.l > 0 ? body(x) / (x.h - x.l) : 0);
  if (body(c) >= R.displacementBodyATR * a && share(c) >= R.displacementBodyShare) return { atr: body(c) / a, start: i };
  const up = c.c > c.o;
  for (let n = 2; n <= 3; n++) {
    const s = i - n + 1;
    if (s < 1) break;
    const run = candles.slice(s, i + 1);
    if (!run.every((x) => (x.c > x.o) === up && x.c !== x.o && share(x) >= 0.5)) break;
    const move = Math.abs(c.c - run[0]!.o);
    // Only the last bar of a run reports it, and only if the run is not just the tail of a longer qualifying run.
    if (move >= R.legMoveATR * a) {
      const next = candles[i + 1];
      if (next && (next.c > next.o) === up && share(next) >= 0.5 && Math.abs(next.c - run[0]!.o) >= R.legMoveATR * a && n < 3) return null;
      return { atr: move / a, start: s };
    }
  }
  return null;
}

function labelSwings(swings: readonly SwingPoint[]): SwingLabel[] {
  let ph: SwingPoint | null = null, pl: SwingPoint | null = null;
  return swings.map((s) => {
    if (s.kind === "high") { const l = ph ? (s.price > ph.price ? "HH" : "LH") : "H"; ph = s; return { ...s, label: l }; }
    const l = pl ? (s.price > pl.price ? "HL" : "LL") : "L"; pl = s; return { ...s, label: l };
  });
}

export function volumeInfo(symbol: string, candles: readonly Candle[], sample = false): VolumeInfo {
  const has = candles.some((c) => (c.v ?? 0) > 0);
  if (!has) return { kind: "none", label: "Volume unavailable", note: volumeKind(symbol) === "none" && INSTRUMENTS[symbol]?.category === "indices" ? `The data source does not report volume for the ${symbol} cash index. Index level is calculated from its members, so the index itself has no traded volume.` : `The data source does not report volume for ${symbol}. ${INSTRUMENTS[symbol]?.category === "crypto" ? "" : "OTC markets such as spot metals and FX have no single exchange volume."}`.trim(), rel: candles.map(() => null), highIndices: [] };
  const n = OVERLAY_RULES.relVolPeriod;
  const rel = candles.map((c, i) => {
    if (i < n || !c.v) return null;
    const avg = candles.slice(i - n, i).reduce((s, x) => s + (x.v ?? 0), 0) / n;
    return avg > 0 ? c.v / avg : null;
  });
  const highIndices = rel.flatMap((r, i) => (r !== null && r >= OVERLAY_RULES.relVolHigh ? [i] : []));
  const tick = volumeKind(symbol) !== "exchange";
  return {
    kind: tick ? "tick" : "exchange",
    label: sample ? "Sample volume" : tick ? "Tick volume" : "Volume",
    note: sample ? "Sample bars: volume is illustrative." : tick ? "Tick volume counts price updates from the data provider. It is a proxy for activity, not traded contracts, and it cannot show who bought or sold." : "Traded volume aggregated by the data provider. Crypto volume is spread over many exchanges, so it is a partial view.",
    rel, highIndices,
  };
}

/** Bullish and bearish Fibonacci retracements on the latest confirmed legs of this timeframe. */
export function fibScenarios(candles: readonly Candle[], swings: readonly SwingPoint[], trend: Trend, tf: OverlayTf): TfOverlays["fib"] {
  const pt = (i: number, price: number) => ({ price, t: candles[i]!.t, index: i });
  let bullish: FibScenario | null = null, bearish: FibScenario | null = null;
  // Up-leg: the latest confirmed swing low that has a confirmed swing high after it, to the highest high since.
  const lowForUp = swings.findLast((s) => s.kind === "low" && swings.some((h) => h.kind === "high" && h.index > s.index));
  if (lowForUp) {
    let hi = lowForUp.index;
    for (let i = lowForUp.index + 1; i < candles.length; i++) if (candles[i]!.h > candles[hi]!.h) hi = i;
    const top = candles[hi]!.h, range = top - lowForUp.price;
    const voided = candles.slice(hi + 1).some((b) => b.c < lowForUp.price);
    if (range > 0 && hi > lowForUp.index && !voided) bullish = { direction: "bullish", from: pt(lowForUp.index, lowForUp.price), to: pt(hi, top), tf, levels: FIB_LEVELS.map((r) => ({ ratio: r, price: top - range * r })) };
  }
  const highForDown = swings.findLast((s) => s.kind === "high" && swings.some((l) => l.kind === "low" && l.index > s.index));
  if (highForDown) {
    let lo = highForDown.index;
    for (let i = highForDown.index + 1; i < candles.length; i++) if (candles[i]!.l < candles[lo]!.l) lo = i;
    const bottom = candles[lo]!.l, range = highForDown.price - bottom;
    const voided = candles.slice(lo + 1).some((b) => b.c > highForDown.price);
    if (range > 0 && lo > highForDown.index && !voided) bearish = { direction: "bearish", from: pt(highForDown.index, highForDown.price), to: pt(lo, bottom), tf, levels: FIB_LEVELS.map((r) => ({ ratio: r, price: bottom + range * r })) };
  }
  let active: "bullish" | "bearish" | null = null;
  if (trend === "bullish" && bullish) active = "bullish";
  else if (trend === "bearish" && bearish) active = "bearish";
  else if (bullish && bearish) active = bullish.to.index >= bearish.to.index ? "bullish" : "bearish";
  else active = bullish ? "bullish" : bearish ? "bearish" : null;
  return { bullish, bearish, active };
}

export function liquidityBands(candles: readonly Candle[], swings: readonly SwingPoint[], atr: number): LiquidityBand[] {
  const out: LiquidityBand[] = [];
  const pad = atr * 0.04;
  const stateOf = (kind: "high" | "low", lower: number, upper: number, after: number) => {
    for (let i = after + 1; i < candles.length; i++) {
      const b = candles[i]!;
      if (kind === "high" ? b.c > upper : b.c < lower) return { state: "taken" as const, at: i };
      if (kind === "high" ? b.h > upper : b.l < lower) return { state: "swept" as const, at: i };
    }
    return { state: "unswept" as const, at: null };
  };
  const inEqual = new Set<number>();
  for (const kind of ["high", "low"] as const) {
    for (const g of cluster(swings.filter((s) => s.kind === kind), OVERLAY_RULES.equalTolATR * atr)) {
      if (g.length < 2) continue;
      const prices = g.map((s) => s.price);
      const lower = Math.min(...prices), upper = Math.max(...prices);
      const lastIndex = Math.max(...g.map((s) => s.index)), firstIndex = Math.min(...g.map((s) => s.index));
      const st = stateOf(kind, lower, upper, lastIndex);
      g.forEach((s) => inEqual.add(s.index * 2 + (kind === "high" ? 0 : 1)));
      out.push({ id: `eq-${kind}-${firstIndex}-${lastIndex}`, side: kind === "high" ? "buy" : "sell", kind: kind === "high" ? "equal-highs" : "equal-lows", lower: lower - pad, upper: upper + pad, price: kind === "high" ? upper : lower, swings: g.length, firstIndex, lastIndex, state: st.state, sweptIndex: st.at, estimate: g.length >= 3 ? "High" : "Medium" });
    }
  }
  for (const kind of ["high", "low"] as const) {
    const recent = swings.filter((s) => s.kind === kind && !inEqual.has(s.index * 2 + (kind === "high" ? 0 : 1))).slice(-OVERLAY_RULES.previousSwings);
    for (const s of recent) {
      const st = stateOf(kind, s.price, s.price, s.index);
      out.push({ id: `sw-${kind}-${s.index}`, side: kind === "high" ? "buy" : "sell", kind: kind === "high" ? "swing-high" : "swing-low", lower: s.price - pad, upper: s.price + pad, price: s.price, swings: 1, firstIndex: s.index, lastIndex: s.index, state: st.state, sweptIndex: st.at, estimate: "Low" });
    }
  }
  // Keep it readable: the nearest unswept pools per side, recent sweeps, and drop old or already-taken levels.
  const price = candles.at(-1)!.c;
  const recentFrom = candles.length - OVERLAY_RULES.liquidityLookback;
  const keep: LiquidityBand[] = [];
  for (const side of ["buy", "sell"] as const) {
    const mine = out.filter((b) => b.side === side && b.lastIndex >= recentFrom);
    keep.push(...mine.filter((b) => b.state === "unswept" && (side === "buy" ? b.price >= price : b.price <= price)).sort((a, b) => Math.abs(a.price - price) - Math.abs(b.price - price)).slice(0, OVERLAY_RULES.unsweptPerSide));
    keep.push(...mine.filter((b) => b.state === "swept" && b.sweptIndex! >= candles.length - OVERLAY_RULES.recentSweepBars).sort((a, b) => b.sweptIndex! - a.sweptIndex!).slice(0, OVERLAY_RULES.sweptPerSide));
  }
  return keep;
}

/**
 * Supply and demand zones. A zone is the base candle (the last opposite-coloured candle within three bars) before a
 * displacement candle. Demand spans the base's low to its body top; supply spans its body bottom to its high.
 * Status walks forward bar by bar: a close beyond the distal edge invalidates, a wick into the zone is a test.
 */
export function sdZones(symbol: string, tf: OverlayTf, candles: readonly Candle[], atr: readonly (number | null)[], events: readonly StructureEvent[], d: number): { zones: SDZone[]; displacement: number[] } {
  const R = OVERLAY_RULES;
  const raw: SDZone[] = [];
  const displacement: number[] = [];
  const last = candles.length - 1;
  for (let i = 1; i <= last; i++) {
    const disp = displacementAt(candles, atr, i);
    if (disp === null) continue;
    const dATR = disp.atr;
    displacement.push(i);
    const c = candles[i]!, bull = c.c > c.o;
    let baseIdx = -1;
    for (let k = disp.start - 1; k >= Math.max(0, disp.start - R.baseLookback); k--) { const b = candles[k]!; if (bull ? b.c < b.o : b.c > b.o) { baseIdx = k; break; } }
    if (baseIdx < 0) baseIdx = disp.start - 1;
    if (baseIdx < 0) continue;
    const base = candles[baseIdx]!;
    const a = atr[i] ?? atr[i - 1]!;
    let lower = bull ? base.l : Math.min(base.o, base.c);
    let upper = bull ? Math.max(base.o, base.c) : base.h;
    if (upper - lower < a * 0.05) { lower = base.l; upper = base.h; }
    // The displacement must close beyond the whole base, or it did not leave the zone.
    if (bull ? c.c <= base.h : c.c >= base.l) continue;
    const brokeStructure = events.find((e) => e.direction === (bull ? "bullish" : "bearish") && e.index >= i && e.index <= i + 3) ?? null;
    // Walk forward.
    let tests = 0, firstTest: number | null = null, inv: number | null = null, away = false;
    for (let k = i + 1; k <= last; k++) {
      const b = candles[k]!;
      if (bull ? b.c < lower : b.c > upper) { inv = k; break; }
      const touching = bull ? b.l <= upper : b.h >= lower;
      if (touching && away) { tests++; firstTest ??= k; away = false; }
      else if (!touching) away = true;
    }
    const status: ZoneStatus = inv !== null ? (last - inv > R.recentInvalidationBars ? "historical" : "invalidated") : tests >= R.maxTests ? "historical" : tests > 0 ? "tested" : "active";
    const buffer = a * R.invalidationBufferATR;
    const invalidation = Number((bull ? lower - buffer : upper + buffer).toFixed(d));
    const proximal = bull ? upper : lower;
    const strength: SDZone["strength"] = (dATR >= 2 && brokeStructure) ? "strong" : (dATR >= 1.6 || brokeStructure) ? "moderate" : "weak";
    const reasons = [
      `${tf} ${bull ? "demand" : "supply"}: the base candle before a ${dATR.toFixed(1)}× ATR ${bull ? "bullish" : "bearish"} displacement${disp.start < i ? ` (${i - disp.start + 1}-candle leg)` : ""}`,
      ...(brokeStructure ? [`The move broke ${tf} structure (${brokeStructure.kind} through ${fmt(brokeStructure.level, d)})`] : []),
    ];
    raw.push({
      id: `${tf}-${bull ? "d" : "s"}-${base.t}`, side: bull ? "buy" : "sell", kind: bull ? "demand" : "supply", tf, lower, upper,
      originIndex: baseIdx, originT: base.t, displacementIndex: i, displacementATR: Number(dATR.toFixed(2)), brokeStructure,
      status, tests, firstTestIndex: firstTest, invalidatedIndex: inv, strength, invalidation, proximal,
      stop: stopCheck(symbol, proximal, invalidation), fib: [], liquidity: null, reasons,
    });
  }
  // Overlapping zones on the same side: keep the most recent (fresher information).
  const dedup: SDZone[] = [];
  for (const z of [...raw].reverse()) {
    if (dedup.some((o) => o.side === z.side && o.status === z.status && z.lower <= o.upper && z.upper >= o.lower)) continue;
    dedup.push(z);
  }
  const price = candles[last]!.c;
  const pick = (side: "buy" | "sell") => {
    const mine = dedup.filter((z) => z.side === side);
    const live = mine.filter((z) => z.status === "active" || z.status === "tested")
      .sort((a, b) => Math.abs((a.lower + a.upper) / 2 - price) - Math.abs((b.lower + b.upper) / 2 - price)).slice(0, R.zonesPerSide);
    const dead = mine.filter((z) => z.status === "invalidated" || z.status === "historical").sort((a, b) => b.originIndex - a.originIndex).slice(0, R.historyPerSide);
    return [...live, ...dead];
  };
  return { zones: [...pick("buy"), ...pick("sell")], displacement };
}

export function computeOverlays(input: { symbol: string; tf: OverlayTf; digits: number; candles: readonly Candle[]; sample?: boolean }): TfOverlays {
  const { symbol, tf, digits: d, candles } = input;
  const base: TfOverlays = {
    version: OVERLAY_VERSION, symbol, tf, digits: d, bars: candles.length, atr: null, last: candles.at(-1)?.c ?? null, trend: "none",
    zones: [], fib: { bullish: null, bearish: null, active: null }, liquidity: [], structure: { events: [], swings: [], displacement: [] },
    volume: volumeInfo(symbol, candles, input.sample), limitations: [],
  };
  if (candles.length < OVERLAY_RULES.minBars) return { ...base, limitations: [`${tf}: only ${candles.length} bars; at least ${OVERLAY_RULES.minBars} are needed before anything is drawn.`] };
  const atr = atrSeries(candles, OVERLAY_RULES.atrPeriod);
  const a = atr.at(-1) ?? null;
  if (!a) return { ...base, limitations: ["ATR could not be computed."] };
  const st = analyzeStructure(candles, OVERLAY_RULES.swingStrength);
  const { zones, displacement } = sdZones(symbol, tf, candles, atr, st.events, d);
  const fib = fibScenarios(candles, st.swings, st.trend, tf);
  const liquidity = liquidityBands(candles, st.swings, a);
  // Confluence: Fibonacci levels and liquidity next to each zone.
  for (const z of zones) {
    const w = Math.max(z.upper - z.lower, a * 0.1);
    const scen = z.side === "buy" ? fib.bullish : fib.bearish;
    z.fib = scen ? scen.levels.filter((l) => l.price >= z.lower - w * 0.25 && l.price <= z.upper + w * 0.25) : [];
    if (z.fib.length) z.reasons.push(`Fibonacci ${z.fib.map((l) => `${(l.ratio * 100).toFixed(1)}%`).join(" / ")} of the ${tf} ${scen!.direction === "bullish" ? "up" : "down"}-leg sits inside the zone`);
    const nearPool = liquidity.find((p) => p.side !== z.side && p.state !== "taken" && Math.abs(p.price - (z.side === "buy" ? z.lower : z.upper)) <= w * 1.5)
      ?? liquidity.find((p) => (z.side === "buy" ? p.kind === "equal-lows" || p.kind === "swing-low" : p.kind === "equal-highs" || p.kind === "swing-high") && p.state === "swept" && p.sweptIndex !== null && p.price >= z.lower - w && p.price <= z.upper + w);
    if (nearPool) {
      z.liquidity = nearPool.state === "swept" ? `${nearPool.kind.replace("-", " ")} liquidity at ${fmt(nearPool.price, d)} was swept into this zone` : `${nearPool.estimate} estimated ${nearPool.side === "sell" ? "sell-side" : "buy-side"} liquidity (${nearPool.kind.replace("-", " ")}) rests near ${fmt(nearPool.price, d)}`;
      z.reasons.push(z.liquidity.charAt(0).toUpperCase() + z.liquidity.slice(1));
    }
  }
  return { ...base, atr: a, trend: st.trend, zones, fib, liquidity, structure: { events: st.events.slice(-10), swings: labelSwings(st.swings).slice(-24), displacement: displacement.slice(-30) } };
}

/** Zone readiness. Touching a zone is never enough: alignment, a confirming structure break and the stop rule must all hold. */
export interface ZoneCheck { id: string; label: string; done: boolean; detail: string }
export function zoneReadiness(o: TfOverlays, z: SDZone, htfTrend: Trend | null): { status: "valid" | "wait"; checks: ZoneCheck[]; headline: string } {
  const dir = z.side === "buy" ? "bullish" : "bearish";
  const last = o.last;
  const inZone = last !== null && last >= z.lower && last <= z.upper;
  const reached = inZone || z.tests > 0;
  const after = z.firstTestIndex ?? Infinity;
  const confirm = o.structure.events.find((e) => e.direction === dir && e.index >= after);
  const live = z.status === "active" || z.status === "tested";
  const aligned = htfTrend === dir;
  const checks: ZoneCheck[] = [
    { id: "live", label: "Zone still valid", done: live, detail: live ? `No ${o.tf} close beyond ${fmt(z.side === "buy" ? z.lower : z.upper, o.digits)} since it formed.` : `A ${o.tf} close went through the zone's far edge.` },
    { id: "trend", label: "Higher-timeframe trend agrees", done: aligned, detail: htfTrend === null ? "4H structure is unavailable." : htfTrend === "none" ? "4H has no confirmed structure break yet." : aligned ? `4H structure is ${htfTrend}.` : `4H structure is ${htfTrend}, against this ${z.kind} zone.` },
    { id: "reach", label: "Price has reached the zone", done: reached, detail: reached ? (inZone ? "Price is inside the zone now." : `Price tested it ${z.tests} time${z.tests === 1 ? "" : "s"}.`) : `Price is ${last !== null && o.atr ? (Math.abs(last - z.proximal) / o.atr).toFixed(1) : "?"} × ATR away.` },
    { id: "confirm", label: `${dir === "bullish" ? "Bullish" : "Bearish"} structure break after the touch`, done: !!confirm, detail: confirm ? `${o.tf} ${confirm.kind} through ${fmt(confirm.level, o.digits)}.` : `Still missing: a ${o.tf === "5M" || o.tf === "1M" ? o.tf : "lower-timeframe (5M)"} ${dir} CHOCH from inside the zone.` },
    { id: "stop", label: z.stop.max !== null ? `Structural stop within ${z.stop.max} pips` : "Structural stop defined", done: z.stop.eligible, detail: `${z.stop.pips} ${z.stop.unit}s from ${fmt(z.proximal, o.digits)} to ${fmt(z.invalidation, o.digits)}${z.stop.max !== null ? ` (max ${z.stop.max} pips = $${z.stop.maxPrice!.toFixed(2)})` : ""}.` },
  ];
  const valid = checks.every((c) => c.done);
  const missing = checks.filter((c) => !c.done && c.id !== "live" && c.id !== "stop").map((c) => c.label.toLowerCase());
  const headline = valid ? `${z.side === "buy" ? "BUY" : "SELL"} conditions met on ${o.tf}. Manage risk; this is analysis, not advice.`
    : !live ? `No setup: this ${z.kind} zone was invalidated by a ${o.tf} close through its far edge.`
    : !z.stop.eligible ? `WAIT / NO VALID SETUP: the structural stop needs ${z.stop.pips} pips, over the ${z.stop.max}-pip limit ($${z.stop.maxPrice!.toFixed(2)}). The stop is never tightened.`
    : `WAIT. Still missing: ${missing.join("; ")}.`;
  return { status: valid ? "valid" : "wait", checks, headline };
}
