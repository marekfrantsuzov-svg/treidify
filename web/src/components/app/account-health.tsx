"use client";

import { Info } from "lucide-react";
import { useMemo, useState } from "react";
import { HEALTH_ALGORITHM, PERIOD_LABELS, equitySeries, healthScore, inRange, performanceMetrics, periodRange, type ClosedTrade, type PeriodId } from "@/lib/analytics";
import { cn } from "@/lib/cn";
import { fmtMoney, fmtNumber, fmtSignedMoney } from "@/lib/format";
import { EquityChart } from "@/components/charts/equity-chart";
import { HealthRing } from "@/components/previews/account-health-preview";
import { Stat } from "@/components/previews/parts";
import { Glass } from "@/components/ui/glass";
import { SampleBadge } from "@/components/ui/pill";

const PERIODS: PeriodId[] = ["7D", "30D", "90D", "MTD", "CUSTOM", "ALL"];

export interface AccountHealthProps {
  label: string;
  currency: string;
  sample: boolean;
  balance: number | null;
  equity: number | null;
  floating: number | null;
  snapshotAt: string | null;
  startingEquity: number;
  trades: ClosedTrade[];
  timezone: string;
  /** Server render time, so the first client render matches. */
  nowIso: string;
}

/** YOUR ACCOUNT HEALTH: every number is computed from the synchronised deals of the selected account. */
export function AccountHealth(p: AccountHealthProps) {
  const [period, setPeriod] = useState<PeriodId>("30D");
  const today = p.nowIso.slice(0, 10);
  const [custom, setCustom] = useState({ from: today.slice(0, 8) + "01", to: today });
  const now = useMemo(() => new Date(p.nowIso), [p.nowIso]);
  const range = useMemo(() => periodRange(period, now, p.timezone, custom), [period, now, p.timezone, custom]);
  const inPeriod = useMemo(() => p.trades.filter((t) => inRange(t, range)), [p.trades, range]);
  const m = useMemo(() => performanceMetrics(inPeriod), [inPeriod]);
  const all = useMemo(() => performanceMetrics(p.trades, p.startingEquity || null), [p.trades, p.startingEquity]);
  const health = useMemo(() => healthScore(p.trades, p.startingEquity, all), [p.trades, p.startingEquity, all]);
  const points = useMemo(() => equitySeries(p.trades, p.startingEquity, range), [p.trades, p.startingEquity, range]);
  const label = PERIOD_LABELS[period];
  const money = (v: number) => fmtMoney(v, p.currency);
  const signed = (v: number) => fmtSignedMoney(v, p.currency);

  return (
    <Glass as="section" aria-labelledby="health-title" className="@container p-4 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h2 id="health-title" className="text-xs font-semibold uppercase tracking-[0.16em] text-ink-2">Your Account Health</h2>
            {p.sample && <SampleBadge label="Sample account" />}
          </div>
          <p className="mt-1 truncate text-sm text-ink-3">
            {p.label}
            {p.snapshotAt && <> · updated {new Date(p.snapshotAt).toLocaleString("en-GB", { timeZone: p.timezone, day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</>}
          </p>
        </div>
        <div role="tablist" aria-label="Performance period" className="inset flex max-w-full overflow-x-auto rounded-full p-0.5 [scrollbar-width:none]">
          {PERIODS.map((id) => (
            <button key={id} role="tab" aria-selected={period === id} onClick={() => setPeriod(id)} className={cn("shrink-0 rounded-full px-3 py-1 text-xs font-medium text-ink-3 transition-all hover:text-ink", period === id && "bg-surface-strong text-ink shadow-sm")}>
              {PERIOD_LABELS[id]}
            </button>
          ))}
        </div>
      </div>

      {period === "CUSTOM" && (
        <div className="mt-3 flex flex-wrap items-center gap-2 text-sm text-ink-2">
          <label className="inset flex items-center gap-2 rounded-full px-3 py-1.5">From <input type="date" value={custom.from} max={today} onChange={(e) => setCustom({ ...custom, from: e.target.value })} className="bg-transparent text-ink outline-none" /></label>
          <label className="inset flex items-center gap-2 rounded-full px-3 py-1.5">To <input type="date" value={custom.to} max={today} onChange={(e) => setCustom({ ...custom, to: e.target.value })} className="bg-transparent text-ink outline-none" /></label>
        </div>
      )}

      <div className="mt-4 grid grid-cols-2 gap-2.5 @3xl:grid-cols-[repeat(4,minmax(0,1fr))_auto]">
        <Stat label="Total balance" value={p.balance === null ? "—" : money(p.balance)} sub={p.balance === null ? "Waiting for first sync" : "Latest snapshot"} />
        <Stat label="Equity" value={p.equity === null ? "—" : money(p.equity)} sub={p.floating === null ? "—" : `Floating ${signed(p.floating)}`} />
        <Stat label={`Net P&L · ${label}`} value={signed(m.netProfit)} tone={m.netProfit > 0 ? "up" : m.netProfit < 0 ? "down" : undefined} sub={`${m.tradeCount} closed trades`} />
        <Stat label={`Win rate · ${label}`} value={m.winRate === null ? "—" : `${(m.winRate * 100).toFixed(1)}%`} sub={`${m.wins}W · ${m.losses}L`} />
        <div className="inset col-span-2 flex items-center gap-3 rounded-2xl p-2.5 pr-4 @3xl:col-span-1">
          <HealthRing score={health.score} size={64} />
          <div className="min-w-0">
            <div className="flex items-center gap-1 text-[11px] font-medium uppercase tracking-[0.08em] text-ink-3">
              Health score
              <span title={`Algorithm ${HEALTH_ALGORITHM}: drawdown, profit factor, expectancy, sizing consistency and losing streaks, across all history.`}><Info className="h-3 w-3" /></span>
            </div>
            <div className="text-sm font-semibold text-ink">{health.grade ?? <span className="font-normal text-ink-3">{health.reason}</span>}</div>
          </div>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-3 gap-2.5 @2xl:grid-cols-6">
        {[
          ["Profit factor", m.profitFactor === null ? "—" : fmtNumber(m.profitFactor)],
          ["Max drawdown", all.maxDrawdownPercent === null ? "—" : `${fmtNumber(all.maxDrawdownPercent, 1)}%`],
          ["Avg win", m.averageWinner === null ? "—" : fmtMoney(m.averageWinner, p.currency, 0)],
          ["Avg loss", m.averageLoser === null ? "—" : fmtSignedMoney(m.averageLoser, p.currency, 0)],
          ["Reward : risk", m.rewardToRisk === null ? "—" : fmtNumber(m.rewardToRisk)],
          ["Costs", fmtMoney(m.totalCosts, p.currency, 0)],
        ].map(([k, v]) => (
          <div key={k} className="min-w-0 px-1">
            <div className="truncate text-[11px] text-ink-3">{k}</div>
            <div className="num truncate text-sm font-semibold text-ink">{v}</div>
          </div>
        ))}
      </div>

      <div className="mt-4">
        {points.length >= 2 ? (
          <EquityChart points={points} height={190} currency={p.currency} label={`Equity, ${label}`} />
        ) : (
          <div className="inset grid h-[190px] place-items-center rounded-2xl text-sm text-ink-3">No closed trades in this period.</div>
        )}
      </div>
    </Glass>
  );
}
