import { netProfit, type ClosedTrade } from "./types";

/**
 * Realized P&L calendar. Trades are bucketed by the CLOSE date in the trader's time zone (realized P&L is booked when
 * a position closes). Net = profit + commission + swap + fees, as MT5 reports them. Pure, so it is unit tested.
 */
export interface CalDay { key: string; day: number; net: number; trades: number; wins: number; losses: number; ids: string[] }
export interface CalMonth {
  year: number; month: number; // month 1–12
  days: CalDay[]; // every day of the month
  /** Leading empty cells so the first day lands on its weekday (weeks start Monday). */
  lead: number;
  net: number; trades: number; wins: number; losses: number; winRate: number | null; tradingDays: number;
  best: CalDay | null; worst: CalDay | null;
}

export function dayKey(unixSeconds: number, tz: string): string {
  const p = new Intl.DateTimeFormat("en-CA", { timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(new Date(unixSeconds * 1000));
  const g = (t: string) => p.find((x) => x.type === t)!.value;
  return `${g("year")}-${g("month")}-${g("day")}`;
}

export function pnlCalendar(trades: readonly ClosedTrade[], year: number, month: number, tz: string): CalMonth {
  const n = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const prefix = `${year}-${String(month).padStart(2, "0")}-`;
  const days: CalDay[] = Array.from({ length: n }, (_, i) => ({ key: `${prefix}${String(i + 1).padStart(2, "0")}`, day: i + 1, net: 0, trades: 0, wins: 0, losses: 0, ids: [] }));
  for (const t of trades) {
    const k = dayKey(t.closeTime, tz);
    if (!k.startsWith(prefix)) continue;
    const d = days[Number(k.slice(8)) - 1]!;
    const v = netProfit(t);
    d.net += v; d.trades++; d.ids.push(t.id);
    if (v > 0) d.wins++; else if (v < 0) d.losses++;
  }
  for (const d of days) d.net = Math.round(d.net * 100) / 100;
  const active = days.filter((d) => d.trades > 0);
  const wins = active.reduce((a, d) => a + d.wins, 0), losses = active.reduce((a, d) => a + d.losses, 0), count = active.reduce((a, d) => a + d.trades, 0);
  const sorted = [...active].sort((a, b) => b.net - a.net);
  const best = sorted[0] && sorted[0].net > 0 ? sorted[0] : null;
  const worst = sorted.at(-1) && sorted.at(-1)!.net < 0 ? sorted.at(-1)! : null;
  const lead = (new Date(Date.UTC(year, month - 1, 1)).getUTCDay() + 6) % 7;
  return {
    year, month, days, lead, net: Math.round(active.reduce((a, d) => a + d.net, 0) * 100) / 100, trades: count, wins, losses,
    winRate: count ? wins / count : null, tradingDays: active.length, best, worst,
  };
}

/** Months that contain at least one closed trade, newest first, as [year, month]. */
export function tradedMonths(trades: readonly ClosedTrade[], tz: string): [number, number][] {
  const set = new Set(trades.map((t) => dayKey(t.closeTime, tz).slice(0, 7)));
  return [...set].sort().reverse().map((k) => [Number(k.slice(0, 4)), Number(k.slice(5, 7))]);
}
