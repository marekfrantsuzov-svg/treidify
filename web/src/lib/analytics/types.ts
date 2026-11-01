/** A price bar. `t` is the bar open time in Unix seconds. */
export interface Candle {
  t: number;
  o: number;
  h: number;
  l: number;
  c: number;
  /** Tick or real volume when the source provides it. */
  v?: number;
}

export interface SwingPoint {
  kind: "high" | "low";
  index: number;
  t: number;
  price: number;
}

/** A closed trade as synchronised from the trading account. Costs are signed as MT5 reports them (negative). */
export interface ClosedTrade {
  id: string;
  symbol: string;
  side: "buy" | "sell";
  volume: number;
  openTime: number;
  closeTime: number;
  profit: number;
  commission: number;
  swap: number;
  fees: number;
  /** Entry and exit prices when the source provides them. */
  openPrice?: number;
  closePrice?: number;
}

export function isValidCandle(c: Candle): boolean {
  const values = [c.o, c.h, c.l, c.c];
  return (
    values.every((v) => Number.isFinite(v) && v > 0) &&
    c.h >= Math.max(c.o, c.c) &&
    c.l <= Math.min(c.o, c.c) &&
    c.h >= c.l
  );
}

export const netProfit = (t: ClosedTrade) => t.profit + t.commission + t.swap + t.fees;
export const tradeCosts = (t: ClosedTrade) => -(t.commission + t.swap + t.fees);
