import { INSTRUMENTS, type StopUnit } from "@/lib/markets/registry";

/**
 * Pip conventions. The ONLY place in the app that converts between price movement and pips.
 *
 * XAUUSD (house convention, confirmed by Marek on 2026-11-01):
 *   1 pip   = $0.10 of gold price movement
 *   10 pips = $1.00
 *   50 pips = $5.00
 *   100 pips = $10.00
 *
 * Maximum permitted structural stop loss on XAUUSD: 50 pips = $5.00 of price movement. A setup whose structural
 * invalidation needs 51+ pips is WAIT / NO VALID SETUP. The stop is never tightened to make a setup qualify.
 *
 * Price movement is NOT money. Monetary P&L depends on position size: see `goldMoneyPerLot()` below, which is kept
 * separate on purpose so no screen confuses "50 pips" with "$50".
 */

/**
 * Pip (or point) size per symbol, from the instrument registry. FX: 0.0001 (JPY quotes 0.01). Indices and crypto
 * are measured in points. Only the gold convention is a house rule; every other market keeps its own convention.
 */
export const PIP_SIZE: Readonly<Record<string, number>> = Object.fromEntries(Object.values(INSTRUMENTS).map((i) => [i.symbol, i.move.size]));
const DEFAULT_PIP = 0.0001;

/** Maximum permitted structural stop, in pips, per symbol. Only XAUUSD has one; other symbols are absent (no rule). */
export const MAX_STOP_PIPS: Readonly<Record<string, number>> = Object.fromEntries(Object.values(INSTRUMENTS).filter((i) => i.maxStop !== null).map((i) => [i.symbol, i.maxStop!]));

export const pipSize = (symbol: string) => PIP_SIZE[symbol] ?? DEFAULT_PIP;
/** "pip" for FX, metals and DXY; "point" for indices, crypto and commodities. */
export const stopUnit = (symbol: string): StopUnit => INSTRUMENTS[symbol]?.move.unit ?? "pip";

/** Absolute price distance → pips (or points), rounded to 0.1. */
export function priceToPips(symbol: string, priceDistance: number): number {
  return Math.round((Math.abs(priceDistance) / pipSize(symbol)) * 10) / 10;
}

/** Pips (or points) → absolute price distance (rounded to avoid float dust). */
export function pipsToPrice(symbol: string, p: number): number {
  return Number((Math.abs(p) * pipSize(symbol)).toFixed(8));
}

/** Kept for existing call sites: `pips(symbol, distance)` === `priceToPips(symbol, distance)`. */
export const pips = priceToPips;

export const maxStopPips = (symbol: string) => MAX_STOP_PIPS[symbol] ?? null;

/** The maximum stop as a price distance (XAUUSD: 50 pips → 5.00), or null if the symbol has no rule. */
export function maxStopPrice(symbol: string): number | null {
  const m = maxStopPips(symbol);
  return m === null ? null : pipsToPrice(symbol, m);
}

export interface StopCheck {
  /** "pip" or "point": what `pips` counts for this symbol. */
  unit: StopUnit;
  /** Stop distance from the entry reference, in pips (or points, see `unit`). */
  pips: number;
  /** The same distance in price units (e.g. $ of gold price movement for XAUUSD). */
  priceDistance: number;
  max: number | null;
  maxPrice: number | null;
  /** True when no rule exists or the structural stop is within it (50.0 pips passes, 50.1 does not). */
  eligible: boolean;
}

/**
 * Structural stop eligibility. `entry` should be the worst realistic entry (the zone edge price reaches first) and
 * `stop` the structural invalidation. Never adjusts the stop.
 */
export function stopCheck(symbol: string, entry: number, stop: number): StopCheck {
  const p = priceToPips(symbol, entry - stop);
  const max = maxStopPips(symbol);
  return { unit: stopUnit(symbol), pips: p, priceDistance: Math.abs(entry - stop), max, maxPrice: maxStopPrice(symbol), eligible: max === null || p <= max };
}

/** "50 pips ($5.00)" for gold; "12 pips" for FX; "85 points" for indices and crypto. Never money. */
export function formatPips(symbol: string, p: number): string {
  const n = Number.isInteger(p) ? p.toLocaleString("en-US") : p.toLocaleString("en-US", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  const unit = stopUnit(symbol);
  const word = `${unit}${p === 1 ? "" : "s"}`;
  if (symbol === "XAUUSD") return `${n} ${word} ($${pipsToPrice(symbol, p).toFixed(2)})`;
  return `${n} ${word}`;
}

/**
 * Money moved by a price distance on a position, in the instrument's quote currency, using the registry's typical
 * MT5 contract size unless the account's own symbol specification is passed. Conversion to the account currency is
 * the caller's job: a USDJPY result is in JPY, a DAX40 result in EUR.
 */
export function moneyForMove(symbol: string, priceDistance: number, lots: number, contractSize?: number): { amount: number; currency: string; contractSize: number; typicalSpec: boolean } {
  const i = INSTRUMENTS[symbol];
  const size = contractSize ?? i?.contract.size ?? 100_000;
  return { amount: Math.abs(priceDistance) * size * lots, currency: i?.quote ?? "USD", contractSize: size, typicalSpec: contractSize === undefined };
}

/** Human description of the house rule, used in tooltips and copy. */
export const GOLD_PIP_RULE = "XAUUSD: 1 pip = $0.10 of price movement (10 pips = $1.00). The structural stop may not exceed 50 pips ($5.00); beyond that the answer is WAIT.";

/**
 * Monetary value of gold price movement for a position size. 1 standard lot of XAUUSD = 100 troy ounces on the
 * usual MT5 contract, so $1.00 of price movement = $100 per lot. Brokers can differ, so pass `contractSize`
 * from the account's symbol specification when it is known.
 */
export function goldMoneyPerLot(priceDistance: number, lots: number, contractSize = 100): number {
  return Math.abs(priceDistance) * contractSize * lots;
}
