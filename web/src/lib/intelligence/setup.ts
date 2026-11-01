import type { InstrumentIntel, Zone } from "./engine";

/**
 * Turns the engine's zones into one actionable setup, or WAIT.
 *
 * Gold pip convention (house rule): $1.00 of XAUUSD price movement = 100 pips, so 1 pip = $0.01.
 * Hard rule: a Gold setup whose stop loss needs more than 50 pips ($0.50) is not a valid trade. The stop is never
 * tightened to fit the rule: it is placed where the zone is structurally invalidated, and if that is too far the
 * answer is WAIT.
 */
export const PIP_SIZE: Record<string, number> = { XAUUSD: 0.01, XAGUSD: 0.001, DXY: 0.01 };
export const MAX_STOP_PIPS: Record<string, number> = { XAUUSD: 50 };

export interface TradeSetup {
  symbol: string;
  status: "valid" | "wait";
  side: "buy" | "sell" | null;
  /** Entry area: the qualified zone. */
  entry: { lower: number; upper: number } | null;
  stop: number | null;
  targets: number[];
  /** Stop distance from the worst entry (the zone edge price reaches first), in pips. */
  stopPips: number | null;
  maxStopPips: number | null;
  quality: "high" | "medium" | "low" | null;
  timeframe: "1H";
  zoneId: string | null;
  /** Why this is a setup, or why it is WAIT. Plain sentences, computed from the engine output only. */
  reasons: string[];
  asOf: string;
}

export const pips = (symbol: string, priceDistance: number) => Math.round(Math.abs(priceDistance) / (PIP_SIZE[symbol] ?? 0.0001) * 10) / 10;

function wait(i: InstrumentIntel, reasons: string[], extra: Partial<TradeSetup> = {}): TradeSetup {
  return { symbol: i.symbol, status: "wait", side: null, entry: null, stop: null, targets: [], stopPips: null, maxStopPips: MAX_STOP_PIPS[i.symbol] ?? null, quality: null, timeframe: "1H", zoneId: null, reasons, asOf: i.asOf, ...extra };
}

/** Structural targets beyond the entry, nearest first: opposing zones, 1H levels, liquidity pools and Fibonacci levels. */
function targetsFor(i: InstrumentIntel, z: Zone): number[] {
  const buy = z.side === "buy";
  const from = buy ? z.upper : z.lower;
  const c: number[] = [];
  for (const o of i.zones) if (o.side !== z.side) c.push(buy ? o.lower : o.upper);
  for (const l of i.levels) if (l.kind === (buy ? "resistance" : "support")) c.push(buy ? l.lower : l.upper);
  for (const p of i.liquidity) if (p.side === (buy ? "buy" : "sell")) c.push(p.price);
  if (i.fib) for (const l of i.fib.levels) c.push(l.price);
  return [...new Set(c.filter((p) => (buy ? p > from : p < from)).map((p) => Number(p.toFixed(i.digits))))].sort((a, b) => (buy ? a - b : b - a));
}

export function tradeSetup(i: InstrumentIntel): TradeSetup {
  if (i.bias === "insufficient" || i.lastPrice === null) return wait(i, ["Not enough verified market data to form a setup."]);
  if (i.bias === "neutral") return wait(i, ["Structure is mixed across timeframes, so neither side has an edge."]);
  const side = i.bias === "bullish" ? "buy" : "sell";
  const z = i.zones.find((x) => x.side === side && x.withTrend);
  if (!z) return wait(i, [`The bias is ${i.bias}, but there is no qualified ${side} zone with the 4H trend near price.`]);

  const buy = side === "buy";
  const worstEntry = buy ? z.upper : z.lower;
  const stop = z.invalidation.level;
  const stopPips = pips(i.symbol, worstEntry - stop);
  const max = MAX_STOP_PIPS[i.symbol] ?? null;
  const entry = { lower: z.lower, upper: z.upper };
  if (max !== null && stopPips > max) {
    return wait(i, [
      `The ${side} zone ${z.lower.toFixed(i.digits)}–${z.upper.toFixed(i.digits)} is only invalidated at ${stop.toFixed(i.digits)}, a ${stopPips}-pip stop from the zone edge.`,
      `That is above the ${max}-pip maximum ($${(max * (PIP_SIZE[i.symbol] ?? 0)).toFixed(2)}), so there is no valid trade. The stop is not tightened to fit.`,
    ], { side, entry, stop, stopPips, zoneId: z.id });
  }

  const risk = Math.abs(worstEntry - stop);
  const t = targetsFor(i, z).filter((p) => Math.abs(p - worstEntry) >= risk);
  if (t.length === 0) return wait(i, [`No structural target at least 1R beyond the ${side} zone, so the trade is not worth its risk.`], { side, entry, stop, stopPips, zoneId: z.id });

  const quality = z.status === "confirmed" && i.confidence === "high" ? "high" : z.status === "confirmed" || i.confidence === "high" ? "medium" : "low";
  return {
    symbol: i.symbol, status: "valid", side, entry, stop: Number(stop.toFixed(i.digits)), targets: t.slice(0, 2), stopPips, maxStopPips: max, quality, timeframe: "1H", zoneId: z.id, asOf: i.asOf,
    reasons: [
      `${z.reasons[0]}${z.reasons.length > 2 ? ", with confluence" : ""}.`,
      z.status === "confirmed" ? "A 5M structure break has printed inside the zone." : z.confirmation,
      `Stop at ${stop.toFixed(i.digits)} is where the zone is invalidated (${stopPips} pips${max !== null ? `, within the ${max}-pip limit` : ""}).`,
    ],
  };
}
