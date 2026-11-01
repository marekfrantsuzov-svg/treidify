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

export const PIP_SIZE: Record<string, number> = {
  XAUUSD: 0.1,
  // Silver and the Dollar Index keep their conventional pip sizes; only the gold convention is a house rule.
  XAGUSD: 0.001,
  DXY: 0.01,
};
const DEFAULT_PIP = 0.0001;

/** Maximum permitted structural stop, in pips, per symbol. Symbols without a rule return null. */
export const MAX_STOP_PIPS: Record<string, number> = { XAUUSD: 50 };

export const pipSize = (symbol: string) => PIP_SIZE[symbol] ?? DEFAULT_PIP;

/** Absolute price distance → pips, rounded to 0.1 pip. */
export function priceToPips(symbol: string, priceDistance: number): number {
  return Math.round((Math.abs(priceDistance) / pipSize(symbol)) * 10) / 10;
}

/** Pips → absolute price distance (rounded to the instrument's sub-pip precision to avoid float dust). */
export function pipsToPrice(symbol: string, p: number): number {
  return Number((Math.abs(p) * pipSize(symbol)).toFixed(6));
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
  /** Stop distance from the entry reference, in pips. */
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
  return { pips: p, priceDistance: Math.abs(entry - stop), max, maxPrice: maxStopPrice(symbol), eligible: max === null || p <= max };
}

/** "50 pips ($5.00)" for gold; "12 pips" elsewhere. Pips first, price movement in brackets, never money. */
export function formatPips(symbol: string, p: number): string {
  const n = Number.isInteger(p) ? p.toLocaleString("en-US") : p.toLocaleString("en-US", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  if (symbol === "XAUUSD") return `${n} pips ($${pipsToPrice(symbol, p).toFixed(2)})`;
  return `${n} pips`;
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
