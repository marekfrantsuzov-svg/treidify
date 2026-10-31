import type { PeriodId } from "@/lib/analytics/periods";

export const PERIOD_IDS: PeriodId[] = ["7D", "30D", "90D", "MTD", "CUSTOM", "ALL"];
export const PERIOD_NAMES: Record<PeriodId, string> = { "7D": "Last 7 days", "30D": "Last 30 days", "90D": "Last 90 days", MTD: "This month", CUSTOM: "Custom range", ALL: "All time" };

const isDate = (s: string | undefined) => !!s && /^\d{4}-\d{2}-\d{2}$/.test(s);

/** Reads the dashboard period from URL search params, falling back to 30 days. */
export function readPeriod(p: { period?: string; from?: string; to?: string }): { id: PeriodId; custom?: { from: string; to: string } } {
  const id = PERIOD_IDS.includes(p.period as PeriodId) ? (p.period as PeriodId) : "30D";
  if (id === "CUSTOM") return isDate(p.from) && isDate(p.to) ? { id, custom: { from: p.from!, to: p.to! } } : { id: "30D" };
  return { id };
}
