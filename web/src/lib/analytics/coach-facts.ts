import { bySessionOpened, bySide, bySymbol, byWeekday, netOf } from "./breakdown";
import { coachObservations } from "./coach";
import { performanceMetrics } from "./performance";
import type { ClosedTrade } from "./types";

/**
 * The facts block the AI coach sees for one period: computed numbers only, from the user's real closed trades.
 * Pure and deterministic so it can be tested and shown to the user exactly as the model received it.
 */
export type CoachPeriod = "daily" | "weekly" | "monthly";
export const COACH_PERIOD_DAYS: Record<CoachPeriod, number> = { daily: 1, weekly: 7, monthly: 30 };
export const COACH_PERIOD_LABEL: Record<CoachPeriod, string> = { daily: "last 24 hours", weekly: "last 7 days", monthly: "last 30 days" };

const f = (v: number | null | undefined, d = 2) => (v === null || v === undefined || !Number.isFinite(v) ? "n/a" : v.toFixed(d));
const pct = (v: number | null) => (v === null ? "n/a" : `${(v * 100).toFixed(1)}%`);
const dayKey = (t: number, tz: string) => new Intl.DateTimeFormat("en-CA", { timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(t * 1000));

/** Volume of the next trade after a loss vs after a win: the classic "size up after losses" check. */
export function sizeAfterOutcome(trades: readonly ClosedTrade[]) {
  const s = [...trades].sort((a, b) => a.openTime - b.openTime);
  const afterLoss: number[] = [], afterWin: number[] = [];
  for (let i = 1; i < s.length; i++) (netOf(s[i - 1]!) < 0 ? afterLoss : afterWin).push(s[i]!.volume);
  const avg = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);
  return { afterLoss: avg(afterLoss), afterWin: avg(afterWin), nLoss: afterLoss.length, nWin: afterWin.length };
}

export function coachFacts(input: { trades: readonly ClosedTrade[]; allTrades: readonly ClosedTrade[]; period: CoachPeriod; now: Date; tz: string; currency: string }): { facts: string; tradeCount: number } {
  const { period, now, tz, currency } = input;
  const from = now.getTime() / 1000 - COACH_PERIOD_DAYS[period] * 86_400;
  const ts = input.trades.filter((t) => t.closeTime >= from && t.closeTime <= now.getTime() / 1000);
  const m = performanceMetrics(ts);
  const lines: string[] = [
    `Period: ${COACH_PERIOD_LABEL[period]} ending ${now.toISOString()}. Account currency: ${currency}. Time zone: ${tz}.`,
    `Closed trades: ${m.tradeCount} (${m.wins} wins, ${m.losses} losses, ${m.breakevens} breakeven). Net after costs: ${f(m.netProfit)} ${currency}. Gross profit ${f(m.grossProfit)}, gross loss ${f(m.grossLoss)}, costs (commission, swap, fees) ${f(m.totalCosts)}.`,
    `Win rate ${pct(m.winRate)}. Profit factor ${f(m.profitFactor)}. Expectancy per trade ${f(m.expectancy)}. Average winner ${f(m.averageWinner)}, average loser ${f(m.averageLoser)}, reward-to-risk ${f(m.rewardToRisk)}. Longest losing streak ${m.maxConsecutiveLosses}. Max drawdown in period ${f(m.maxDrawdown)}.`,
  ];
  if (ts.length) {
    const perDay = new Map<string, number>();
    for (const t of ts) perDay.set(dayKey(t.openTime, tz), (perDay.get(dayKey(t.openTime, tz)) ?? 0) + 1);
    const counts = [...perDay.values()];
    lines.push(`Trading days ${counts.length}; trades per day average ${f(counts.reduce((a, b) => a + b, 0) / counts.length, 1)}, max ${Math.max(...counts)}.`);
    const vols = ts.map((t) => t.volume);
    lines.push(`Position size (lots): min ${f(Math.min(...vols))}, average ${f(vols.reduce((a, b) => a + b, 0) / vols.length)}, max ${f(Math.max(...vols))}.`);
    const so = sizeAfterOutcome(ts);
    if (so.nLoss >= 3 && so.nWin >= 3) lines.push(`Average size of the next trade after a loss ${f(so.afterLoss)} lots (${so.nLoss} cases) vs after a win ${f(so.afterWin)} lots (${so.nWin} cases).`);
    const hold = (xs: ClosedTrade[]) => (xs.length ? xs.reduce((a, t) => a + (t.closeTime - t.openTime), 0) / xs.length / 60 : null);
    lines.push(`Average holding time: winners ${f(hold(ts.filter((t) => netOf(t) > 0)), 0)} min, losers ${f(hold(ts.filter((t) => netOf(t) < 0)), 0)} min.`);
    const grp = (name: string, g: ReturnType<typeof bySymbol>) => `${name}: ${g.map((x) => `${x.label} ${x.metrics.tradeCount} trades, net ${f(x.metrics.netProfit)}, win rate ${pct(x.metrics.winRate)}`).join("; ")}.`;
    lines.push(grp("By instrument", bySymbol(ts)), grp("By session opened", bySessionOpened(ts)), grp("By direction", bySide(ts)), grp("By weekday", byWeekday(ts, tz)));
  }
  // Pattern detectors run on the whole synced history (they need a minimum sample), labelled as such.
  const obs = coachObservations(input.allTrades);
  if (obs.length) lines.push("Patterns across all synced trades (deterministic detectors):", ...obs.map((o) => `- ${o.title}: ${o.finding} Evidence: ${o.evidence.join(" ")}`));
  if (!ts.length) lines.push("No trades closed in this period.");
  return { facts: lines.join("\n"), tradeCount: ts.length };
}
