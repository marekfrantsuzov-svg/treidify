import { netProfit, tradeCosts, type ClosedTrade } from "./types";

export interface PerformanceMetrics {
  tradeCount: number;
  wins: number;
  losses: number;
  breakevens: number;
  netProfit: number;
  grossProfit: number;
  grossLoss: number;
  totalCosts: number;
  winRate: number | null;
  profitFactor: number | null;
  expectancy: number | null;
  averageWinner: number | null;
  averageLoser: number | null;
  rewardToRisk: number | null;
  maxConsecutiveWins: number;
  maxConsecutiveLosses: number;
  maxDrawdown: number;
  maxDrawdownPercent: number | null;
}

/**
 * Deterministic performance metrics. Mirrors PerformanceCalculator.swift and the Python engine
 * (shared/test-vectors/performance.json). Drawdown is on trading-only equity: deposits and
 * withdrawals never enter it.
 */
export function performanceMetrics(trades: readonly ClosedTrade[], startingEquity: number | null = null): PerformanceMetrics {
  if (trades.length === 0) {
    return {
      tradeCount: 0, wins: 0, losses: 0, breakevens: 0, netProfit: 0, grossProfit: 0, grossLoss: 0, totalCosts: 0,
      winRate: null, profitFactor: null, expectancy: null, averageWinner: null, averageLoser: null, rewardToRisk: null,
      maxConsecutiveWins: 0, maxConsecutiveLosses: 0, maxDrawdown: 0, maxDrawdownPercent: null,
    };
  }
  const ordered = [...trades].sort((a, b) => a.closeTime - b.closeTime || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  const nets = ordered.map(netProfit);
  const winners = nets.filter((n) => n > 0);
  const losers = nets.filter((n) => n < 0);
  const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0);
  const grossProfit = sum(winners), grossLoss = sum(losers);
  const decided = winners.length + losers.length;

  let maxW = 0, maxL = 0, w = 0, l = 0;
  for (const n of nets) {
    if (n > 0) { w += 1; l = 0; } else if (n < 0) { l += 1; w = 0; } else { w = 0; l = 0; }
    maxW = Math.max(maxW, w);
    maxL = Math.max(maxL, l);
  }

  let equity = startingEquity ?? 0, peak = equity, maxDd = 0;
  let maxDdPct: number | null = null;
  for (const n of nets) {
    equity += n;
    peak = Math.max(peak, equity);
    const dd = peak - equity;
    if (dd > maxDd) {
      maxDd = dd;
      maxDdPct = peak > 0 ? (dd / peak) * 100 : null;
    }
  }

  const avgWin = winners.length ? grossProfit / winners.length : null;
  const avgLoss = losers.length ? grossLoss / losers.length : null;
  return {
    tradeCount: ordered.length,
    wins: winners.length,
    losses: losers.length,
    breakevens: ordered.length - decided,
    netProfit: sum(nets),
    grossProfit,
    grossLoss,
    totalCosts: sum(ordered.map(tradeCosts)),
    winRate: decided ? winners.length / decided : null,
    profitFactor: grossLoss ? grossProfit / Math.abs(grossLoss) : null,
    expectancy: sum(nets) / nets.length,
    averageWinner: avgWin,
    averageLoser: avgLoss,
    rewardToRisk: avgWin !== null && avgLoss ? avgWin / Math.abs(avgLoss) : null,
    maxConsecutiveWins: maxW,
    maxConsecutiveLosses: maxL,
    maxDrawdown: maxDd,
    maxDrawdownPercent: startingEquity === null ? null : maxDd === 0 ? 0 : maxDdPct,
  };
}
