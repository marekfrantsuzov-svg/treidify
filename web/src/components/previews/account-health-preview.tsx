"use client";

import { useMemo, useState } from "react";
import { healthScore, netProfit, performanceMetrics } from "@/lib/analytics";
import { sampleTrades } from "@/lib/demo/sample";
import { fmtMoney, fmtNumber, fmtSignedMoney } from "@/lib/format";
import { cn } from "@/lib/cn";
import { SlidingPill } from "@/components/ui/sliding-pill";
import { EquityChart } from "@/components/charts/equity-chart";
import { Glass } from "@/components/ui/glass";
import { SampleBadge } from "@/components/ui/pill";
import { Stat } from "./parts";

const PERIODS = [
  { id: "7D", days: 7 },
  { id: "30D", days: 30 },
  { id: "90D", days: 90 },
  { id: "All", days: null },
] as const;
const START = 25_000;
const FLOATING = 184.2;

export function HealthRing({ score, size = 96 }: { score: number | null; size?: number }) {
  const r = size / 2 - 7, c = 2 * Math.PI * r;
  const v = score ?? 0;
  const color = v >= 80 ? "var(--up)" : v >= 60 ? "var(--accent)" : v >= 40 ? "var(--warn)" : "var(--down)";
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label={score === null ? "Health score unavailable" : `Health score ${score} out of 100`}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--border-strong)" strokeWidth="7" />
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth="7" strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - v / 100)} transform={`rotate(-90 ${size / 2} ${size / 2})`} style={{ transition: "stroke-dashoffset 0.8s var(--ease-spring)" }} />
      <text x="50%" y="50%" dominantBaseline="central" textAnchor="middle" fontSize={size * 0.28} fontWeight="700" fill="var(--text)" className="num">
        {score ?? "—"}
      </text>
    </svg>
  );
}

/** Account Health with a working period selector, computed by the real engine on a sample history. */
export function AccountHealthPreview({ compact = false, className }: { compact?: boolean; className?: string }) {
  const trades = useMemo(() => sampleTrades(), []);
  const [period, setPeriod] = useState<(typeof PERIODS)[number]["id"]>("30D");
  const lastClose = trades.at(-1)!.closeTime;
  const days = PERIODS.find((p) => p.id === period)!.days;
  const inPeriod = useMemo(() => (days === null ? trades : trades.filter((t) => t.closeTime > lastClose - days * 86_400)), [trades, days, lastClose]);
  const m = useMemo(() => performanceMetrics(inPeriod), [inPeriod]);
  const all = useMemo(() => performanceMetrics(trades, START), [trades]);
  const health = useMemo(() => healthScore(trades, START, all), [trades, all]);
  const balance = START + all.netProfit;
  const points = useMemo(() => {
    let eq = START + trades.filter((t) => !inPeriod.includes(t)).reduce((a, t) => a + netProfit(t), 0);
    return [{ t: (inPeriod[0]?.openTime ?? lastClose) - 3600, equity: eq }, ...inPeriod.map((t) => ({ t: t.closeTime, equity: (eq += netProfit(t)), delta: netProfit(t) }))];
  }, [trades, inPeriod, lastClose]);

  return (
    <Glass className={cn("@container p-4 sm:p-5", className)}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <h3 className="text-[15px] font-semibold tracking-[-0.01em] text-ink">Your Account Health</h3>
          <SampleBadge label="Sample account" />
        </div>
        <div role="tablist" aria-label="Performance period" className="inset relative flex rounded-full p-0.5">
          <SlidingPill watch={period} className="rounded-full bg-[var(--surface-strong)] shadow-[var(--shadow)]" />
          {PERIODS.map((p) => (
            <button
              key={p.id}
              role="tab"
              aria-selected={period === p.id}
              onClick={() => setPeriod(p.id)}
              data-active={period === p.id}
              className={cn("relative z-[1] rounded-full px-3 py-1 text-xs font-medium text-ink-3 transition-colors duration-200 hover:text-ink", period === p.id && "text-accent")}
            >
              {p.id}
            </button>
          ))}
        </div>
      </div>
      <div className={cn("mt-4 grid gap-2.5", compact ? "grid-cols-2" : "grid-cols-2 @3xl:grid-cols-[repeat(4,minmax(0,1fr))_auto]")}>
        <Stat label="Total balance" value={fmtMoney(balance)} sub="Current snapshot" />
        <Stat label="Equity" value={fmtMoney(balance + FLOATING)} sub={`Floating ${fmtSignedMoney(FLOATING)}`} />
        <Stat label={`Net P&L · ${period}`} value={fmtSignedMoney(m.netProfit)} tone={m.netProfit >= 0 ? "up" : "down"} sub={`${m.tradeCount} trades`} />
        <Stat label={`Win rate · ${period}`} value={m.winRate === null ? "—" : `${(m.winRate * 100).toFixed(1)}%`} sub={`${m.wins}W · ${m.losses}L`} />
        {!compact && (
          <div className="inset col-span-2 flex items-center gap-3 rounded-2xl p-2.5 pr-4 @3xl:col-span-1">
            <HealthRing score={health.score} size={64} />
            <div>
              <div className="text-[11px] font-medium uppercase tracking-[0.08em] text-ink-3">Health score</div>
              <div className="text-sm font-semibold text-ink">{health.grade}</div>
            </div>
          </div>
        )}
      </div>
      {!compact && (
        <div className="mt-3 grid grid-cols-3 gap-2.5 @2xl:grid-cols-6">
          {[
            ["Profit factor", m.profitFactor === null ? "—" : fmtNumber(m.profitFactor)],
            ["Max drawdown", `${fmtNumber(all.maxDrawdownPercent ?? 0, 1)}%`],
            ["Avg win", m.averageWinner === null ? "—" : fmtMoney(m.averageWinner, "USD", 0)],
            ["Avg loss", m.averageLoser === null ? "—" : fmtMoney(m.averageLoser, "USD", 0)],
            ["Reward : risk", m.rewardToRisk === null ? "—" : fmtNumber(m.rewardToRisk)],
            ["Total trades", String(m.tradeCount)],
          ].map(([k, v]) => (
            <div key={k} className="min-w-0 px-1">
              <div className="truncate text-[11px] text-ink-3">{k}</div>
              <div className="num truncate text-sm font-semibold text-ink">{v}</div>
            </div>
          ))}
        </div>
      )}
      <div className="mt-4">
        <EquityChart points={points} height={compact ? 120 : 170} label={`Equity, ${period}`} />
      </div>
    </Glass>
  );
}
