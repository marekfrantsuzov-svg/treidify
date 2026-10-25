import { performanceMetrics, type PerformanceMetrics } from "./performance";
import type { ClosedTrade } from "./types";

export const HEALTH_ALGORITHM = "health-v1";

export interface HealthComponent {
  key: "drawdown" | "profitFactor" | "expectancy" | "sizing" | "streak";
  label: string;
  points: number;
  max: number;
  detail: string;
}

export interface HealthScore {
  score: number | null;
  grade: "Strong" | "Stable" | "Needs attention" | "At risk" | null;
  components: HealthComponent[];
  reason: string | null;
  algorithm: typeof HEALTH_ALGORITHM;
}

const clamp = (v: number) => Math.max(0, Math.min(1, v));

/**
 * Account Health Score v1 (0–100): a transparent summary of risk and consistency, not a forecast.
 * Drawdown 30 pts (full at 0%, zero at 20%+ of peak trading equity), profit factor 25 (zero at 0.8,
 * full at 2.0), expectancy relative to average loss 20, sizing consistency 15 (CV 0.25 → full,
 * 1.0 → zero), longest losing streak 10 (3 → full, 10 → zero). Needs 20 closed trades.
 */
export function healthScore(trades: readonly ClosedTrade[], startingEquity: number, metrics?: PerformanceMetrics): HealthScore {
  const m = metrics ?? performanceMetrics(trades, startingEquity);
  if (m.tradeCount < 20) {
    return { score: null, grade: null, components: [], reason: `Needs at least 20 closed trades (have ${m.tradeCount}).`, algorithm: HEALTH_ALGORITHM };
  }
  const vols = trades.map((t) => t.volume);
  const mean = vols.reduce((a, b) => a + b, 0) / vols.length;
  const cv = mean > 0 ? Math.sqrt(vols.reduce((a, v) => a + (v - mean) ** 2, 0) / vols.length) / mean : 0;
  const dd = m.maxDrawdownPercent ?? 0;
  const pf = m.profitFactor ?? 3;
  const relExp = m.averageLoser ? (m.expectancy ?? 0) / Math.abs(m.averageLoser) : 1;
  const components: HealthComponent[] = [
    { key: "drawdown", label: "Drawdown control", max: 30, points: 30 * clamp(1 - dd / 20), detail: `Max drawdown ${dd.toFixed(1)}% of peak trading equity` },
    { key: "profitFactor", label: "Profit factor", max: 25, points: 25 * clamp((pf - 0.8) / 1.2), detail: m.profitFactor === null ? "No losing trades yet" : `Profit factor ${pf.toFixed(2)}` },
    { key: "expectancy", label: "Expectancy", max: 20, points: 20 * clamp(0.5 + relExp), detail: `Average result ${(m.expectancy ?? 0).toFixed(2)} per trade` },
    { key: "sizing", label: "Sizing consistency", max: 15, points: 15 * clamp(1 - (cv - 0.25) / 0.75), detail: `Lot-size variation ${cv.toFixed(2)}` },
    { key: "streak", label: "Loss streaks", max: 10, points: 10 * clamp(1 - (m.maxConsecutiveLosses - 3) / 7), detail: `Longest losing streak ${m.maxConsecutiveLosses}` },
  ].map((c) => ({ ...c, points: Math.round(c.points * 10) / 10 })) as HealthComponent[];
  const score = Math.round(components.reduce((a, c) => a + c.points, 0));
  const grade = score >= 80 ? "Strong" : score >= 60 ? "Stable" : score >= 40 ? "Needs attention" : "At risk";
  return { score, grade, components, reason: null, algorithm: HEALTH_ALGORITHM };
}
