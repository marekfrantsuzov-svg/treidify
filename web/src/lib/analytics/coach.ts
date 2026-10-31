import { performanceMetrics, type PerformanceMetrics } from "./performance";
import { sessionAt, SESSIONS, type TradingSession } from "./sessions";
import { netProfit, type ClosedTrade } from "./types";

/**
 * Evidence-backed coaching observations. Ported from CoachObservations.swift, plus holding-time
 * and strength detectors. Observations state measurable facts and never name emotions or
 * diagnose conditions. Each one needs a minimum sample.
 */
export type ObservationKind =
  | "ruleViolation" | "riskAfterLosses" | "inconsistentSizing" | "sessionWeakness" | "negativeExpectancy"
  | "tradingCosts" | "tradeFrequency" | "holdingLosers" | "strengthSession" | "strengthConsistency" | "strengthExpectancy";

export type Severity = "strength" | "info" | "watch" | "important";

export interface Observation {
  kind: ObservationKind;
  severity: Severity;
  title: string;
  finding: string;
  evidence: string[];
  suggestion: string;
  sampleSize: number;
  /** How the number was derived, shown on demand. */
  methodology: string;
}

export interface Rulebook {
  maxTradesPerDay?: number;
  maxVolumePerTrade?: number;
  allowedSymbols?: string[];
}

const pct = (v: number) => `${Math.round(v * 100)}%`;
const money = (v: number) => v.toFixed(2);
const dayKey = (t: number) => new Date(t * 1000).toISOString().slice(0, 10);
const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;

export function bySession(trades: readonly ClosedTrade[]): { session: TradingSession | "off"; metrics: PerformanceMetrics }[] {
  const groups = new Map<TradingSession | "off", ClosedTrade[]>();
  for (const t of trades) {
    const s = sessionAt(new Date(t.openTime * 1000)) ?? "off";
    groups.set(s, [...(groups.get(s) ?? []), t]);
  }
  return [...groups.entries()].map(([session, ts]) => ({ session, metrics: performanceMetrics(ts) }));
}

export const sessionName = (s: TradingSession | "off") => SESSIONS.find((x) => x.id === s)?.name ?? "Outside main sessions";
const sessionPhrase = (s: TradingSession | "off") => (s === "off" ? "outside the main sessions" : `during the ${sessionName(s)} session`);

const order: Severity[] = ["important", "watch", "info", "strength"];

export function coachObservations(trades: readonly ClosedTrade[], rulebook: Rulebook = {}, minimumSample = 20): Observation[] {
  const sorted = [...trades].sort((a, b) => a.closeTime - b.closeTime);
  const out: Observation[] = [];

  const violations: string[] = [];
  if (rulebook.maxTradesPerDay !== undefined) {
    const perDay = new Map<string, number>();
    for (const t of sorted) perDay.set(dayKey(t.openTime), (perDay.get(dayKey(t.openTime)) ?? 0) + 1);
    const over = [...perDay.values()].filter((n) => n > rulebook.maxTradesPerDay!).length;
    if (over) violations.push(`${over} day(s) exceeded your limit of ${rulebook.maxTradesPerDay} trades per day.`);
  }
  if (rulebook.maxVolumePerTrade !== undefined) {
    const over = sorted.filter((t) => t.volume > rulebook.maxVolumePerTrade!).length;
    if (over) violations.push(`${over} trade(s) exceeded your maximum volume of ${rulebook.maxVolumePerTrade} lots.`);
  }
  if (rulebook.allowedSymbols) {
    const outside = sorted.filter((t) => !rulebook.allowedSymbols!.includes(t.symbol)).length;
    if (outside) violations.push(`${outside} trade(s) were on symbols outside your allowed list.`);
  }
  if (violations.length) {
    out.push({
      kind: "ruleViolation", severity: "important", title: "Rulebook exceptions",
      finding: "Some trades broke rules you set for yourself.", evidence: violations,
      suggestion: "Review the flagged trades and decide whether the rule or the behaviour should change.",
      sampleSize: sorted.length, methodology: "Each synced trade is checked against the rules saved in your rulebook.",
    });
  }
  if (sorted.length < minimumSample) return out;

  // Size after losses vs after wins.
  const afterLoss: number[] = [], afterWin: number[] = [];
  for (let i = 1; i < sorted.length; i++) {
    const prev = netProfit(sorted[i - 1]!);
    if (prev < 0) afterLoss.push(sorted[i]!.volume);
    else if (prev > 0) afterWin.push(sorted[i]!.volume);
  }
  if (afterLoss.length >= 5 && afterWin.length >= 5) {
    const l = mean(afterLoss), w = mean(afterWin);
    if (w > 0 && l / w >= 1.25) {
      out.push({
        kind: "riskAfterLosses", severity: "important", title: "Size increases after losses",
        finding: `Your average position after a losing trade is ${pct(l / w - 1)} larger than after a winning trade.`,
        evidence: [`Average volume after a loss: ${money(l)} lots (${afterLoss.length} trades).`, `Average volume after a win: ${money(w)} lots (${afterWin.length} trades).`],
        suggestion: "Consider a fixed-risk sizing rule so the previous result does not change the next trade's size.",
        sampleSize: afterLoss.length + afterWin.length,
        methodology: "Each trade is grouped by the result of the trade closed immediately before it; average volumes of the two groups are compared. Flagged at 25% or more.",
      });
    }
  }

  // Holding losers longer than winners.
  const dur = (t: ClosedTrade) => (t.closeTime - t.openTime) / 3600;
  const winners = sorted.filter((t) => netProfit(t) > 0), losers = sorted.filter((t) => netProfit(t) < 0);
  if (winners.length >= 10 && losers.length >= 10) {
    const hw = mean(winners.map(dur)), hl = mean(losers.map(dur));
    if (hw > 0 && hl / hw >= 1.3) {
      out.push({
        kind: "holdingLosers", severity: "watch", title: "Losing trades are held longer",
        finding: `On average you hold losing trades ${(hl / hw).toFixed(1)}× as long as winning trades.`,
        evidence: [`Average losing trade: ${hl.toFixed(1)} h (${losers.length} trades).`, `Average winning trade: ${hw.toFixed(1)} h (${winners.length} trades).`],
        suggestion: "Check whether your stop loss is moved or removed on losing trades, and whether exits follow your plan.",
        sampleSize: winners.length + losers.length,
        methodology: "Mean open-to-close duration of trades with negative net P&L versus positive net P&L. No avoidable-loss figure is claimed, because that needs a defined counterfactual exit rule.",
      });
    }
  }

  const vols = sorted.map((t) => t.volume);
  const m = mean(vols);
  const cv = m > 0 ? Math.sqrt(mean(vols.map((v) => (v - m) ** 2))) / m : 0;
  if (cv > 0.5) {
    out.push({
      kind: "inconsistentSizing", severity: "watch", title: "Inconsistent position sizing",
      finding: `Position sizes vary widely (coefficient of variation ${money(cv)}).`,
      evidence: [`Smallest ${money(Math.min(...vols))} lots, largest ${money(Math.max(...vols))} lots, average ${money(m)} lots.`],
      suggestion: "Define a sizing rule in your rulebook and compare results before and after.",
      sampleSize: vols.length, methodology: "Standard deviation of lot size divided by its mean. Flagged above 0.5.",
    });
  } else if (cv <= 0.25) {
    out.push({
      kind: "strengthConsistency", severity: "strength", title: "Consistent position sizing",
      finding: `Your position sizes are steady (coefficient of variation ${money(cv)}).`,
      evidence: [`Average ${money(m)} lots across ${vols.length} trades.`],
      suggestion: "Keep sizing rules explicit in your rulebook so this stays deliberate.",
      sampleSize: vols.length, methodology: "Standard deviation of lot size divided by its mean. Noted as a strength at 0.25 or below.",
    });
  }

  const sessions = bySession(sorted).filter((g) => g.metrics.tradeCount >= 10);
  const weak = sessions.filter((g) => (g.metrics.expectancy ?? 0) < 0).sort((a, b) => a.metrics.expectancy! - b.metrics.expectancy!)[0];
  if (weak) {
    const name = sessionName(weak.session);
    out.push({
      kind: "sessionWeakness", severity: "watch", title: weak.session === "off" ? "Off-session trades underperform" : `${name} session underperforms`,
      finding: `Trades opened ${sessionPhrase(weak.session)} have a negative average result.`,
      evidence: [`${weak.metrics.tradeCount} trades, expectancy ${money(weak.metrics.expectancy!)} per trade, net ${money(weak.metrics.netProfit)}.`],
      suggestion: `Review whether your setups suit conditions ${sessionPhrase(weak.session)}, or trade them with reduced size while you investigate.`,
      sampleSize: weak.metrics.tradeCount, methodology: "Trades are attributed to the session active at open time (overlaps go to the later-opening session). Needs 10 trades per session.",
    });
  }
  const best = sessions.filter((g) => (g.metrics.expectancy ?? 0) > 0).sort((a, b) => b.metrics.netProfit - a.metrics.netProfit)[0];
  if (best) {
    out.push({
      kind: "strengthSession", severity: "strength", title: best.session === "off" ? "Off-session trades are your strongest" : `${sessionName(best.session)} is your strongest session`,
      finding: `Trades opened ${sessionPhrase(best.session)} produced your highest net result.`,
      evidence: [`${best.metrics.tradeCount} trades, net ${money(best.metrics.netProfit)}, win rate ${best.metrics.winRate !== null ? pct(best.metrics.winRate) : "n/a"}.`],
      suggestion: "Note which setups you take at these times; they are candidates for your core playbook.",
      sampleSize: best.metrics.tradeCount, methodology: "Net P&L by session at open time; sessions with at least 10 trades.",
    });
  }

  const overall = performanceMetrics(sorted);
  if (overall.expectancy !== null && overall.expectancy < 0) {
    out.push({
      kind: "negativeExpectancy", severity: "important", title: "Negative historical expectancy",
      finding: `Across ${overall.tradeCount} trades, the average result is ${money(overall.expectancy)} per trade.`,
      evidence: [`Win rate ${overall.winRate !== null ? pct(overall.winRate) : "n/a"}, profit factor ${overall.profitFactor !== null ? money(overall.profitFactor) : "n/a"}.`],
      suggestion: "Focus on the setups and sessions with positive expectancy before increasing frequency.",
      sampleSize: overall.tradeCount, methodology: "Mean net P&L per closed trade, costs included.",
    });
  } else if (overall.profitFactor !== null && overall.profitFactor >= 1.3) {
    out.push({
      kind: "strengthExpectancy", severity: "strength", title: "Positive expectancy",
      finding: `Your trades average ${money(overall.expectancy!)} each after costs, with a profit factor of ${money(overall.profitFactor)}.`,
      evidence: [`${overall.tradeCount} trades, ${overall.wins} wins, ${overall.losses} losses.`],
      suggestion: "Protect this edge: keep risk per trade constant while you scale.",
      sampleSize: overall.tradeCount, methodology: "Mean net P&L per closed trade and gross profit divided by gross loss.",
    });
  }

  const grossAbs = overall.grossProfit + Math.abs(overall.grossLoss);
  if (grossAbs > 0 && overall.totalCosts / grossAbs > 0.15) {
    out.push({
      kind: "tradingCosts", severity: "watch", title: "Costs are a large share of results",
      finding: `Commission, swap and fees equal ${pct(overall.totalCosts / grossAbs)} of your gross traded P&L.`,
      evidence: [`Total costs ${money(overall.totalCosts)} over ${overall.tradeCount} trades.`],
      suggestion: "Fewer, higher-quality trades or fewer overnight positions would reduce costs.",
      sampleSize: overall.tradeCount, methodology: "Total commission, swap and fees divided by gross profit plus absolute gross loss.",
    });
  }

  const perDay = new Map<string, number>();
  for (const t of sorted) perDay.set(dayKey(t.openTime), (perDay.get(dayKey(t.openTime)) ?? 0) + 1);
  const counts = [...perDay.values()].sort((a, b) => a - b);
  if (counts.length >= 5) {
    const median = counts[Math.floor(counts.length / 2)]!;
    const busy = counts.filter((c) => c >= Math.max(median * 2, median + 4)).length;
    if (busy >= 2) {
      out.push({
        kind: "tradeFrequency", severity: "info", title: "Unusually busy days",
        finding: `On ${busy} day(s) you traded at least twice your median daily count.`,
        evidence: [`Median trades per active day: ${median}. Busiest day: ${counts.at(-1)} trades.`],
        suggestion: "Compare results on busy days with normal days to see whether extra trades add value.",
        sampleSize: sorted.length, methodology: "Trades per calendar day (UTC) of open time, compared with the median active day.",
      });
    }
  }

  return out.sort((a, b) => order.indexOf(a.severity) - order.indexOf(b.severity));
}
