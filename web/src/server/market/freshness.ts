import { marketStatus } from "@/lib/analytics/sessions";
import { TF_SECONDS, type Timeframe } from "./instruments";

export type Freshness = "live" | "delayed" | "stale" | "closed";

/**
 * Classifies how current a series is from the open time of its latest bar.
 * A bar is expected every timeframe; "live" allows one bar plus 90 s of vendor latency, "delayed" up to three bars or
 * 15 minutes, anything older is "stale". While spot gold/FX is shut (weekend or daily break), age is not a fault: "closed".
 */
export function classifyFreshness(lastBarOpen: number, tf: Timeframe, now = new Date()): Freshness {
  if (marketStatus(now) !== "open") return "closed";
  const step = TF_SECONDS[tf];
  const age = now.getTime() / 1000 - (lastBarOpen + step);
  if (age <= 90) return "live";
  if (age <= Math.max(3 * step, 900)) return "delayed";
  return "stale";
}

export const freshnessLabel: Record<Freshness, string> = {
  live: "Up to date",
  delayed: "Delayed",
  stale: "Stale",
  closed: "Market closed",
};
