/**
 * Canonical instruments Treidify analyses. Pure data, safe to import anywhere.
 * `dxy` is either a vendor symbol (when the plan includes the ICE index) or "computed": the published ICE formula
 * over six USD pairs (see ./dxy.ts). The UI says which one is in use.
 */
export type Timeframe = "1M" | "5M" | "15M" | "1H" | "4H" | "1D";
export const TIMEFRAMES: Timeframe[] = ["1M", "5M", "15M", "1H", "4H", "1D"];
export const TF_SECONDS: Record<Timeframe, number> = { "1M": 60, "5M": 300, "15M": 900, "1H": 3600, "4H": 14_400, "1D": 86_400 };

export type MarketSymbol = "XAUUSD" | "DXY" | "XAGUSD";
export const MARKET_SYMBOLS: MarketSymbol[] = ["XAUUSD", "DXY", "XAGUSD"];

export const INSTRUMENTS: Record<MarketSymbol, { name: string; short: string; digits: number }> = {
  XAUUSD: { name: "Gold / US Dollar", short: "Gold", digits: 2 },
  DXY: { name: "US Dollar Index", short: "DXY", digits: 3 },
  XAGUSD: { name: "Silver / US Dollar", short: "Silver", digits: 3 },
};

export const isMarketSymbol = (s: string): s is MarketSymbol => (MARKET_SYMBOLS as string[]).includes(s);
export const isTimeframe = (s: string): s is Timeframe => (TIMEFRAMES as string[]).includes(s);
