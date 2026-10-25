import { netProfit, type ClosedTrade } from "./types";

export type PeriodId = "7D" | "30D" | "90D" | "MTD" | "ALL" | "CUSTOM";
export const PERIOD_LABELS: Record<PeriodId, string> = { "7D": "7D", "30D": "30D", "90D": "90D", MTD: "This Month", ALL: "All", CUSTOM: "Custom" };

/** Unix seconds of local midnight on the 1st of the current month in `tz`. */
export function monthStart(now: Date, tz: string): number {
  const p = Object.fromEntries(new Intl.DateTimeFormat("en-US", { timeZone: tz, year: "numeric", month: "2-digit", hourCycle: "h23" }).formatToParts(now).map((x) => [x.type, x.value]));
  return zonedMidnight(Number(p.year), Number(p.month), 1, tz);
}

/** Unix seconds of 00:00 on y-m-d in `tz`, correct across DST. */
export function zonedMidnight(y: number, m: number, d: number, tz: string): number {
  const guess = Date.UTC(y, m - 1, d);
  const offset = (t: number) => {
    const p = Object.fromEntries(new Intl.DateTimeFormat("en-US", { timeZone: tz, year: "numeric", month: "numeric", day: "numeric", hour: "numeric", minute: "numeric", second: "numeric", hourCycle: "h23" }).formatToParts(new Date(t)).map((x) => [x.type, x.value]));
    return Date.UTC(Number(p.year), Number(p.month) - 1, Number(p.day), Number(p.hour), Number(p.minute), Number(p.second)) - t;
  };
  let t = guess - offset(guess);
  t = guess - offset(t);
  return Math.floor(t / 1000);
}

/** The [from, to) window in Unix seconds. `custom` dates are YYYY-MM-DD in the user's zone, inclusive. */
export function periodRange(id: PeriodId, now: Date, tz: string, custom?: { from: string; to: string }): { from: number | null; to: number } {
  const to = Math.floor(now.getTime() / 1000) + 1;
  switch (id) {
    case "7D": return { from: to - 7 * 86_400, to };
    case "30D": return { from: to - 30 * 86_400, to };
    case "90D": return { from: to - 90 * 86_400, to };
    case "MTD": return { from: monthStart(now, tz), to };
    case "ALL": return { from: null, to };
    case "CUSTOM": {
      if (!custom?.from || !custom?.to) return { from: null, to };
      const [lo, hi] = [custom.from, custom.to].sort() as [string, string];
      const [fy, fm, fd] = lo.split("-").map(Number), [ty, tm, td] = hi.split("-").map(Number);
      return { from: zonedMidnight(fy!, fm!, fd!, tz), to: zonedMidnight(ty!, tm!, td! + 1, tz) };
    }
  }
}

export const inRange = (t: ClosedTrade, r: { from: number | null; to: number }) => (r.from === null || t.closeTime >= r.from) && t.closeTime < r.to;

/**
 * Equity points for the window: starts from the trading equity before the window opens, so the
 * curve is continuous with the account's real history.
 */
export function equitySeries(trades: readonly ClosedTrade[], startingEquity: number, r: { from: number | null; to: number }) {
  const sorted = [...trades].sort((a, b) => a.closeTime - b.closeTime);
  let eq = startingEquity;
  for (const t of sorted) if (r.from !== null && t.closeTime < r.from) eq += netProfit(t);
  const inside = sorted.filter((t) => inRange(t, r));
  const start = r.from ?? (inside[0] ? inside[0].openTime : 0);
  return [{ t: start, equity: eq }, ...inside.map((t) => ({ t: t.closeTime, equity: (eq += netProfit(t)), delta: netProfit(t) }))];
}
