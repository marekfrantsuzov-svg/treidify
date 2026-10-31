"use client";

import { ChevronDown, ScanLine } from "lucide-react";
import { useMemo, useState } from "react";
import { HEALTH_ALGORITHM, equitySeries, healthScore, inRange, performanceMetrics, periodRange, type ClosedTrade, type PeriodId } from "@/lib/analytics";
import { cn } from "@/lib/cn";
import { fmtMoney, fmtNumber, fmtPct, fmtSignedMoney } from "@/lib/format";
import { PERIOD_NAMES } from "@/lib/period-param";
import { EquityChart } from "@/components/charts/equity-chart";
import { Sparkline } from "@/components/charts/sparkline";
import { HealthRing } from "@/components/previews/account-health-preview";
import { Glass } from "@/components/ui/glass";
import { SampleBadge } from "@/components/ui/pill";
import { CountUp } from "@/components/ui/count-up";

export interface HealthRowProps {
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
  period: PeriodId;
  custom?: { from: string; to: string };
  nowIso: string;
}

const GRADE_NOTE: Record<string, string> = {
  Strong: "Consistent profitability",
  Stable: "Sound, with room to tighten",
  "Needs attention": "Risk or consistency slipping",
  "At risk": "Drawdown or losses need action",
};

function WinRing({ rate }: { rate: number | null }) {
  const size = 64, r = 25, c = 2 * Math.PI * r, v = rate ?? 0;
  return (
    <svg viewBox="0 0 64 64" aria-hidden className="h-14 w-14 shrink-0 @[230px]:h-[72px] @[230px]:w-[72px]">
      <circle cx="32" cy="32" r={r} fill="none" stroke="var(--border-strong)" strokeWidth="8" />
      <circle cx="32" cy="32" r={r} fill="none" stroke="var(--up)" strokeWidth="8" strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - v)} transform="rotate(-90 32 32)" style={{ transition: "stroke-dashoffset .8s var(--ease-spring)", filter: "drop-shadow(0 0 6px color-mix(in oklab, var(--up) 45%, transparent))" }} />
    </svg>
  );
}

function Card({ title, children, className, button }: { title: React.ReactNode; children: React.ReactNode; className?: string; button?: Omit<React.HTMLAttributes<HTMLElement>, "title"> & { title?: string } }) {
  return (
    <Glass as={button ? "button" : "div"} {...(button ? { type: "button" as const, ...button } : {})} className={cn("@container min-w-0 p-4 text-left sm:px-5 sm:py-4", className)}>
      <div className="flex items-center justify-between gap-2 text-[14px] font-medium text-ink">{title}</div>
      {children}
    </Glass>
  );
}

/** YOUR ACCOUNT HEALTH: four cards computed from the selected account's synchronised deals, plus an expandable equity curve. */
export function HealthRow(p: HealthRowProps) {
  const [open, setOpen] = useState(false);
  const now = useMemo(() => new Date(p.nowIso), [p.nowIso]);
  const range = useMemo(() => periodRange(p.period, now, p.timezone, p.custom), [p.period, now, p.timezone, p.custom]);
  const inPeriod = useMemo(() => p.trades.filter((t) => inRange(t, range)), [p.trades, range]);
  const m = useMemo(() => performanceMetrics(inPeriod), [inPeriod]);
  const all = useMemo(() => performanceMetrics(p.trades, p.startingEquity || null), [p.trades, p.startingEquity]);
  const health = useMemo(() => healthScore(p.trades, p.startingEquity, all), [p.trades, p.startingEquity, all]);
  const series = useMemo(() => equitySeries(p.trades, p.startingEquity, range), [p.trades, p.startingEquity, range]);
  const startEq = series[0]?.equity ?? p.startingEquity;
  const pnlPct = startEq > 0 ? (m.netProfit / startEq) * 100 : null;
  const cumulative = useMemo(() => { let a = 0; return [0, ...inPeriod.map((t) => (a += t.profit + t.commission + t.swap + t.fees))]; }, [inPeriod]);
  const money = (v: number) => fmtMoney(v, p.currency);
  const up = m.netProfit >= 0;
  const period = PERIOD_NAMES[p.period].toLowerCase();

  return (
    <section aria-labelledby="health-title" className="grid gap-3">
      <h2 id="health-title" className="sr-only">Your Account Health. {p.label}</h2>

      <div className="grid grid-cols-2 gap-3 xl:grid-cols-[1fr_1.12fr_1.12fr_1fr]">
        <Card title={<><span className="truncate">Your Account Health</span><span title={`Health ${HEALTH_ALGORITHM}: drawdown 30 pts, profit factor 25, expectancy 20, sizing consistency 15, losing streaks 10, across all history. Needs 20 closed trades.`} className="inset grid h-7 w-7 shrink-0 place-items-center rounded-full max-sm:hidden @max-[250px]:hidden"><ScanLine className="h-3.5 w-3.5 text-ink-2" /></span></>}>
          <div className="mt-2 flex items-center gap-3 @[230px]:gap-4">
            <HealthRing score={health.score} size={62} />
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                <span className={cn("text-lg font-semibold tracking-[-0.02em] @[230px]:text-xl", health.grade === "Strong" ? "text-up" : health.grade === "At risk" ? "text-down" : "text-ink")}>{health.grade ?? "Not enough data"}</span>
                {p.sample && <SampleBadge label="Sample" className="px-1.5 text-[9.5px]" />}
              </div>
              <div className="hidden text-xs text-ink-3 @[200px]:block">{health.grade ? GRADE_NOTE[health.grade] : health.reason}</div>
            </div>
          </div>
        </Card>

        <Card button={{ onClick: () => setOpen(!open), "aria-expanded": open, "aria-controls": "health-detail", title: "Show equity curve and risk detail" }} title={<>Total Balance <ChevronDown className={cn("h-4 w-4 text-ink-3 transition-transform max-sm:hidden", open && "rotate-180")} /></>} className="block w-full">
            <div className="mt-1.5 flex items-end justify-between gap-2">
              <div className="min-w-0">
                <div className="num truncate text-[clamp(1.1rem,10cqw,1.75rem)] font-semibold tracking-[-0.025em] text-ink">{p.balance === null ? "—" : <CountUp value={p.balance} format={money} />}</div>
                <div className={cn("num truncate text-[13px] font-medium", up ? "text-up" : "text-down")}>{p.balance === null ? "Waiting for first sync" : `${pnlPct === null ? "" : fmtPct(pnlPct, 1, true)} (${fmtSignedMoney(m.netProfit, p.currency, 0)})`}</div>
              </div>
              <Sparkline values={series.map((s) => s.equity)} up={up} width={110} height={44} className="hidden h-11 w-[34%] max-w-[110px] shrink-0 @[230px]:block" />
            </div>
        </Card>

        <Card title="Net P&L">
          <div className="mt-1.5 flex items-end justify-between gap-2">
            <div className="min-w-0">
              <div className={cn("num truncate text-[clamp(1.1rem,10cqw,1.75rem)] font-semibold tracking-[-0.025em]", m.netProfit > 0 ? "text-ink" : m.netProfit < 0 ? "text-down" : "text-ink")}>{<CountUp value={m.netProfit} format={(v) => fmtSignedMoney(v, p.currency)} />}</div>
              <div className={cn("num truncate text-[13px] font-medium", up ? "text-up" : "text-down")}>{pnlPct === null ? `${m.tradeCount} trades` : fmtPct(pnlPct, 1, true)}<span className="font-normal text-ink-3"> · {period}</span></div>
            </div>
            <Sparkline values={cumulative} up={up} width={110} height={44} className="hidden h-11 w-[34%] max-w-[110px] shrink-0 @[230px]:block" />
          </div>
        </Card>

        <Card title="Win Rate">
          <div className="mt-1 flex items-center justify-between gap-2">
            <div className="min-w-0">
              <div className="num text-[clamp(1.1rem,10cqw,1.75rem)] font-semibold tracking-[-0.025em] text-ink">{m.winRate === null ? "—" : <CountUp value={m.winRate * 100} format={(v) => `${v.toFixed(1)}%`} />}</div>
              <div className="num text-[13px] text-ink-3">{m.wins}W / {m.losses}L</div>
            </div>
            <WinRing rate={m.winRate} />
          </div>
        </Card>
      </div>

      {open && (
        <Glass id="health-detail" className="rise @container p-4 sm:p-5">
          <div className="grid grid-cols-3 gap-3 @2xl:grid-cols-6">
            {[
              ["Profit factor", m.profitFactor === null ? "—" : fmtNumber(m.profitFactor)],
              ["Max drawdown", all.maxDrawdownPercent === null ? "—" : `${fmtNumber(all.maxDrawdownPercent, 1)}%`],
              ["Avg win", m.averageWinner === null ? "—" : fmtMoney(m.averageWinner, p.currency, 0)],
              ["Avg loss", m.averageLoser === null ? "—" : fmtSignedMoney(m.averageLoser, p.currency, 0)],
              ["Reward : risk", m.rewardToRisk === null ? "—" : fmtNumber(m.rewardToRisk)],
              ["Costs", fmtMoney(m.totalCosts, p.currency, 0)],
            ].map(([k, v]) => (
              <div key={k} className="min-w-0">
                <div className="truncate text-[11px] text-ink-3">{k}</div>
                <div className="num truncate text-sm font-semibold text-ink">{v}</div>
              </div>
            ))}
          </div>
          <div className="mt-4">
            {series.length >= 2 ? <EquityChart points={series} height={220} currency={p.currency} label={`Equity, ${period}`} /> : <div className="inset grid h-[220px] place-items-center rounded-2xl text-sm text-ink-3">No closed trades in this period.</div>}
          </div>
          {p.equity !== null && p.floating !== null && <p className="mt-2 text-xs text-ink-3">Equity {money(p.equity)}, floating {fmtSignedMoney(p.floating, p.currency)}. Deposits and withdrawals never count as profit.</p>}
        </Glass>
      )}
    </section>
  );
}
