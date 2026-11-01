/**
 * Timeframes and the symbol type used by the market-data layer. Instrument facts (precision, pip/point, contract,
 * sessions, provider symbols) live in the registry: src/lib/markets/registry.ts.
 */
import { INSTRUMENTS as REGISTRY, isSymbol } from "@/lib/markets/registry";

export type Timeframe = "1M" | "5M" | "15M" | "1H" | "4H" | "1D";
export const TIMEFRAMES: Timeframe[] = ["1M", "5M", "15M", "1H", "4H", "1D"];
export const TF_SECONDS: Record<Timeframe, number> = { "1M": 60, "5M": 300, "15M": 900, "1H": 3600, "4H": 14_400, "1D": 86_400 };

/** Any registry symbol. */
export type MarketSymbol = string;
/** The three instruments of the original Gold desk, still used by the dashboard snapshot. */
export const CORE_SYMBOLS = ["XAUUSD", "DXY", "XAGUSD"] as const;
export type CoreSymbol = (typeof CORE_SYMBOLS)[number];

export const INSTRUMENTS = REGISTRY;
export const isMarketSymbol = (s: string): boolean => isSymbol(s);
export const isTimeframe = (s: string): s is Timeframe => (TIMEFRAMES as string[]).includes(s);
