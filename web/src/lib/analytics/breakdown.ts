import { performanceMetrics, type PerformanceMetrics } from "./performance";
import { sessionAt, SESSIONS } from "./sessions";
import type { ClosedTrade } from "./types";

export const netOf = (t: ClosedTrade) => t.profit + t.commission + t.swap + t.fees;

export interface Group { key: string; label: string; metrics: PerformanceMetrics }

/** Group trades by any key and compute full metrics per group, largest groups first. */
export function groupMetrics(trades: readonly ClosedTrade[], key: (t: ClosedTrade) => string, label: (k: string) => string = (k) => k): Group[] {
  const m = new Map<string, ClosedTrade[]>();
  for (const t of trades) { const k = key(t); m.set(k, [...(m.get(k) ?? []), t]); }
  return [...m.entries()].map(([k, ts]) => ({ key: k, label: label(k), metrics: performanceMetrics(ts) })).sort((a, b) => b.metrics.tradeCount - a.metrics.tradeCount);
}

const local = (sec: number, tz: string, opts: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat("en-GB", { timeZone: tz, ...opts }).format(new Date(sec * 1000));

/** Month key (YYYY-MM) in the user's time zone, by close time. */
export const monthKey = (t: ClosedTrade, tz: string) => {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: tz, year: "numeric", month: "2-digit" }).formatToParts(new Date(t.closeTime * 1000));
  return `${parts.find((p) => p.type === "year")!.value}-${parts.find((p) => p.type === "month")!.value}`;
};

export function byMonth(trades: readonly ClosedTrade[], tz: string): { month: string; label: string; net: number; trades: number; winRate: number | null }[] {
  return groupMetrics(trades, (t) => monthKey(t, tz))
    .sort((a, b) => a.key.localeCompare(b.key))
    .map((g) => ({ month: g.key, label: local(Date.UTC(+g.key.slice(0, 4), +g.key.slice(5) - 1, 15) / 1000, "UTC", { month: "short", year: "2-digit" }), net: g.metrics.netProfit, trades: g.metrics.tradeCount, winRate: g.metrics.winRate }));
}

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
export const byWeekday = (trades: readonly ClosedTrade[], tz: string) =>
  groupMetrics(trades, (t) => local(t.openTime, tz, { weekday: "short" })).sort((a, b) => DAYS.indexOf(a.key) - DAYS.indexOf(b.key));

export const bySymbol = (trades: readonly ClosedTrade[]) => groupMetrics(trades, (t) => t.symbol);
export const bySide = (trades: readonly ClosedTrade[]) => groupMetrics(trades, (t) => t.side, (k) => (k === "buy" ? "Long" : "Short"));
export const bySessionOpened = (trades: readonly ClosedTrade[]) =>
  groupMetrics(trades, (t) => sessionAt(new Date(t.openTime * 1000)) ?? "off", (k) => SESSIONS.find((s) => s.id === k)?.name ?? "Outside sessions");

/** Percent below the running peak at each point of an equity series (0 at a new high, negative below it). */
export function drawdownSeries(points: readonly { t: number; equity: number }[]): { t: number; dd: number }[] {
  let peak = -Infinity;
  return points.map((p) => { peak = Math.max(peak, p.equity); return { t: p.t, dd: peak > 0 ? ((p.equity - peak) / peak) * 100 : 0 }; });
}

/** Holding time in hours, split by winners and losers. */
export function holdingHours(trades: readonly ClosedTrade[]) {
  const avg = (xs: ClosedTrade[]) => (xs.length ? xs.reduce((a, t) => a + (t.closeTime - t.openTime), 0) / xs.length / 3600 : null);
  return { winners: avg(trades.filter((t) => netOf(t) > 0)), losers: avg(trades.filter((t) => netOf(t) < 0)) };
}
