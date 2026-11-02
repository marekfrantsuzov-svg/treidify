import { symbolOpen } from "@/lib/markets/sessions";
import { TF_SECONDS, type Timeframe } from "./instruments";

export type Freshness = "live" | "delayed" | "stale" | "closed";

/**
 * Classifies how current a series is from the open time of its latest bar.
 * A bar is expected every timeframe; "live" allows one bar plus 90 s of vendor latency, "delayed" up to three bars or
 * 15 minutes, anything older is "stale". While the instrument's market is shut (FX weekend or daily break, an index outside its exchange session), age is
 * not a fault: "closed". Crypto never closes.
 */
export function classifyFreshness(lastBarOpen: number, tf: Timeframe, now = new Date(), symbol = "XAUUSD", refreshSeconds = 0): Freshness {
  if (!symbolOpen(symbol, now)) return "closed";
  const step = TF_SECONDS[tf];
  const age = now.getTime() / 1000 - (lastBarOpen + step);
  if (age <= 90) return "live";
  // A plan that may only re-read a series every `refreshSeconds` is delayed by design within that window (plus one
  // bar), not stale. Still labelled "Delayed", never "live".
  if (age <= Math.max(3 * step, 900, refreshSeconds + step + 120)) return "delayed";
  return "stale";
}

export const freshnessLabel: Record<Freshness, string> = {
  live: "Up to date",
  delayed: "Delayed",
  stale: "Stale",
  closed: "Market closed",
};
