import { dayKey } from "./calendar";
import { netProfit, type ClosedTrade } from "./types";

/**
 * Daily, weekly and monthly realized results for the journal, by CLOSE time in the trader's time zone.
 * Net = profit + commission + swap + fees. Weeks start on Monday. Pure and unit tested.
 */
export type BucketUnit = "day" | "week" | "month";
export interface Bucket { key: string; net: number; trades: number; wins: number; losses: number; winRate: number | null }

/** Monday (YYYY-MM-DD) of the week containing a local calendar date. */
export function weekStart(day: string): string {
  const d = new Date(`${day}T00:00:00Z`);
  const dow = (d.getUTCDay() + 6) % 7; // Monday = 0
  return new Date(d.getTime() - dow * 86_400_000).toISOString().slice(0, 10);
}

export function buckets(trades: readonly ClosedTrade[], tz: string, unit: BucketUnit): Bucket[] {
  const m = new Map<string, Bucket>();
  for (const t of trades) {
    const day = dayKey(t.closeTime, tz);
    const key = unit === "day" ? day : unit === "week" ? weekStart(day) : day.slice(0, 7);
    const b = m.get(key) ?? { key, net: 0, trades: 0, wins: 0, losses: 0, winRate: null };
    const n = netProfit(t);
    b.net += n; b.trades += 1;
    if (n > 0) b.wins += 1; else if (n < 0) b.losses += 1;
    m.set(key, b);
  }
  return [...m.values()].map((b) => ({ ...b, winRate: b.wins + b.losses ? b.wins / (b.wins + b.losses) : null })).sort((a, b) => b.key.localeCompare(a.key));
}

/** Best and worst trading day by net result (null when there are no trades; worst is null if no day lost money). */
export function bestWorstDays(trades: readonly ClosedTrade[], tz: string) {
  const days = buckets(trades, tz, "day");
  if (!days.length) return { best: null, worst: null, green: 0, red: 0 };
  const sorted = [...days].sort((a, b) => b.net - a.net);
  const best = sorted[0]!.net > 0 ? sorted[0]! : null;
  const worst = sorted.at(-1)!.net < 0 ? sorted.at(-1)! : null;
  return { best, worst, green: days.filter((d) => d.net > 0).length, red: days.filter((d) => d.net < 0).length };
}
