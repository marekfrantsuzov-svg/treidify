"use client";

import { ChevronRight, ScanLine } from "lucide-react";
import Link from "next/link";
import { useMemo } from "react";
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

function Card({ title, children, className, delay = 0 }: { title: React.ReactNode; children: React.ReactNode; className?: string; delay?: number }) {
  return (
    <Glass className={cn("rise @container min-w-0 p-4 text-left sm:px-5 sm:py-4", className)} style={{ "--d": `${delay}ms` } as React.CSSProperties}>
      <div className="flex items-center justify-between gap-2 text-[13px] font-medium text-ink-2">{title}</div>
      {children}
    </Glass>
  );
}

/** Where the numbers come from. "none" means no MetaTrader account yet: every metric is drawn at zero, never invented. */
export type AccountState = "none" | "sample" | "pending" | "connected";

const STATE_CHIP: Record<AccountState, { text: string; dot: string; cls: string }> = {
  none: { text: "Not connected", dot: "bg-ink-3", cls: "bg-inset text-ink-2" },
  sample: { text: "Sample account", dot: "bg-warn", cls: "bg-warn-soft text-warn" },
  pending: { text: "Syncing", dot: "bg-accent motion-safe:animate-pulse", cls: "bg-accent-soft text-accent" },
  connected: { text: "Live · read-only", dot: "bg-up shadow-[0_0_8px_var(--up)]", cls: "bg-up-soft text-up" },
};

/** Flat baseline in place of the equity curve until there are closed trades. Nothing is plotted that did not happen. */
function EmptyCurve({ height, text }: { height: number; text: string }) {
  return (
    <div className="relative overflow-hidden rounded-2xl" style={{ height }}>
      <div aria-hidden className="absolute inset-0 bg-[linear-gradient(var(--chart-grid)_1px,transparent_1px)] bg-[size:100%_25%]" />
      <div aria-hidden className="absolute inset-x-0 top-[62%] border-t-2 border-dashed border-[color-mix(in_oklab,var(--accent)_35%,transparent)]" />
      <div aria-hidden className="absolute inset-x-0 bottom-0 top-[62%] bg-[linear-gradient(180deg,color-mix(in_oklab,var(--accent)_10%,transparent),transparent)]" />
      <p className="absolute inset-x-0 top-[30%] px-6 text-center text-[13px] text-ink-3">{text}</p>
    </div>
  );
}

/** YOUR ACCOUNT HEALTH: always laid out in full. Before MetaTrader is connected every metric reads zero; after a sync the same cards fill in. */
export function HealthRow(p: HealthRowProps & { state?: AccountState }) {
  const state: AccountState = p.state ?? (p.sample ? "sample" : "connected");
  const none = state === "none";
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
  const chip = STATE_CHIP[state];
  const dash = (v: string | null, zero: string) => (v === null ? (none ? zero : "—") : v);

  return (
    <section aria-labelledby="health-title" className="grid gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2 px-0.5">
        <div className="min-w-0">
          <h2 id="health-title" className="text-[19px] font-semibold tracking-[-0.025em] text-ink">Your Account Health</h2>
          <p className="truncate text-[12.5px] text-ink-3">{none ? "MetaTrader 4 / 5 · read-only" : p.label}</p>
        </div>
        <div className="flex items-center gap-1.5">
          <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11.5px] font-semibold", chip.cls)}><span className={cn("h-1.5 w-1.5 rounded-full", chip.dot)} />{chip.text}</span>
          {none && <Link href="/app/accounts" className="press bg-brand inline-flex h-8 items-center gap-1 rounded-full pl-3 pr-2.5 text-[12.5px] font-semibold text-white shadow-[0_8px_18px_-8px_var(--accent-glow)]">Connect MT5<ChevronRight className="h-3.5 w-3.5" /></Link>}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 xl:grid-cols-[1fr_1.12fr_1.12fr_1fr]">
        <Card title={<><span className="truncate">Health score</span><span title={`Health ${HEALTH_ALGORITHM}: drawdown 30 pts, profit factor 25, expectancy 20, sizing consistency 15, losing streaks 10, across all history. Needs 20 closed trades.`} className="inset grid h-6 w-6 shrink-0 place-items-center rounded-full @max-[180px]:hidden"><ScanLine className="h-3 w-3 text-ink-2" /></span></>}>
          <div className="mt-2 flex items-center gap-3 @[230px]:gap-4">
            <HealthRing score={none ? 0 : health.score} size={58} />
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                <span className={cn("text-[15px] font-semibold leading-tight tracking-[-0.02em] @[230px]:text-xl", health.grade === "Strong" ? "text-up" : health.grade === "At risk" ? "text-down" : none ? "text-ink-2" : "text-ink")}>{none ? "No data yet" : health.grade ?? "Building"}</span>
                {p.sample && <SampleBadge label="Sample" className="px-1.5 text-[9.5px]" />}
              </div>
              <div className="mt-0.5 line-clamp-2 text-[11.5px] leading-snug text-ink-3">{none ? "Scored after 20 trades" : health.grade ? GRADE_NOTE[health.grade] : health.reason}</div>
            </div>
          </div>
        </Card>

        <Card delay={40} title="Total balance">
          <div className="mt-1.5 flex items-end justify-between gap-2">
            <div className="min-w-0">
              <div className={cn("num truncate text-[clamp(1.1rem,11cqw,1.75rem)] font-semibold tracking-[-0.025em]", none ? "metric-empty" : "text-ink")}>{p.balance === null ? money(0) : <CountUp value={p.balance} format={money} />}</div>
              <div className={cn("num truncate text-[12.5px] font-medium", none || p.balance === null ? "text-ink-3" : up ? "text-up" : "text-down")}>{none ? "Syncs on connect" : p.balance === null ? "Waiting for first sync" : `${pnlPct === null ? "" : fmtPct(pnlPct, 1, true)} (${fmtSignedMoney(m.netProfit, p.currency, 0)})`}</div>
            </div>
            <Sparkline values={series.length ? series.map((s) => s.equity) : [0, 0]} up={up} width={110} height={44} className="hidden h-11 w-[34%] max-w-[110px] shrink-0 @[230px]:block" />
          </div>
        </Card>

        <Card delay={80} title="Net P&L">
          <div className="mt-1.5 flex items-end justify-between gap-2">
            <div className="min-w-0">
              <div className={cn("num truncate text-[clamp(1.1rem,11cqw,1.75rem)] font-semibold tracking-[-0.025em]", none ? "metric-empty" : m.netProfit < 0 ? "text-down" : "text-ink")}><CountUp value={m.netProfit} format={(v) => fmtSignedMoney(v, p.currency)} /></div>
              <div className={cn("num truncate text-[12.5px] font-medium", none ? "text-ink-3" : up ? "text-up" : "text-down")}>{pnlPct === null ? `${m.tradeCount} trades` : fmtPct(pnlPct, 1, true)}<span className="font-normal text-ink-3"> · {period}</span></div>
            </div>
            <Sparkline values={cumulative.length > 1 ? cumulative : [0, 0]} up={up} width={110} height={44} className="hidden h-11 w-[34%] max-w-[110px] shrink-0 @[230px]:block" />
          </div>
        </Card>

        <Card delay={120} title="Win rate">
          <div className="mt-1 flex items-center justify-between gap-2">
            <div className="min-w-0">
              <div className={cn("num text-[clamp(1.1rem,11cqw,1.75rem)] font-semibold tracking-[-0.025em]", none ? "metric-empty" : "text-ink")}>{m.winRate === null ? (none ? "0.0%" : "—") : <CountUp value={m.winRate * 100} format={(v) => `${v.toFixed(1)}%`} />}</div>
              <div className="num text-[12.5px] text-ink-3">{m.wins}W / {m.losses}L</div>
            </div>
            <WinRing rate={m.winRate} />
          </div>
        </Card>
      </div>

      <div className="grid gap-3 xl:grid-cols-[1.6fr_1fr]">
        <Glass className="rise @container min-w-0 p-4 sm:p-5" style={{ "--d": "160ms" } as React.CSSProperties}>
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-[15px] font-semibold tracking-[-0.01em] text-ink">Equity curve</h3>
            <span className="text-[12px] text-ink-3">{PERIOD_NAMES[p.period]}</span>
          </div>
          <div className="mt-3">
            {series.length >= 2 ? <EquityChart points={series} height={200} currency={p.currency} label={`Equity, ${period}`} /> : <EmptyCurve height={200} text={none ? "Your equity curve draws itself here after the first sync." : "No closed trades in this period."} />}
          </div>
          {p.equity !== null && p.floating !== null && <p className="mt-2 text-xs text-ink-3">Equity {money(p.equity)}, floating {fmtSignedMoney(p.floating, p.currency)}. Deposits and withdrawals never count as profit.</p>}
        </Glass>

        <Glass className="rise @container min-w-0 p-4 sm:p-5" style={{ "--d": "200ms" } as React.CSSProperties}>
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-[15px] font-semibold tracking-[-0.01em] text-ink">Trading statistics</h3>
            <span className="text-[12px] text-ink-3">{PERIOD_NAMES[p.period]}</span>
          </div>
          <dl className="mt-3 grid grid-cols-3 gap-2">
            {([
              ["Trades", String(m.tradeCount)],
              ["Profit factor", dash(m.profitFactor === null ? null : fmtNumber(m.profitFactor), "0.00")],
              ["Drawdown", dash(all.maxDrawdownPercent === null ? null : `${fmtNumber(all.maxDrawdownPercent, 1)}%`, "0.0%")],
              ["Avg win", dash(m.averageWinner === null ? null : fmtMoney(m.averageWinner, p.currency, 0), fmtMoney(0, p.currency, 0))],
              ["Avg loss", dash(m.averageLoser === null ? null : fmtSignedMoney(m.averageLoser, p.currency, 0), fmtMoney(0, p.currency, 0))],
              ["Reward : risk", dash(m.rewardToRisk === null ? null : fmtNumber(m.rewardToRisk), "0.00")],
              ["Expectancy", dash(m.expectancy === null ? null : fmtSignedMoney(m.expectancy, p.currency, 0), fmtMoney(0, p.currency, 0))],
              ["Best streak", `${m.maxConsecutiveWins}W`],
              ["Costs", fmtMoney(m.totalCosts, p.currency, 0)],
            ] as const).map(([k, v]) => (
              <div key={k} className="inset min-w-0 rounded-2xl px-3 py-2.5">
                <dt className="truncate text-[11px] text-ink-3">{k}</dt>
                <dd className={cn("num mt-0.5 truncate text-[15px] font-semibold tracking-[-0.01em]", none ? "metric-empty" : "text-ink")}>{v}</dd>
              </div>
            ))}
          </dl>
        </Glass>
      </div>
      {none && <p className="px-1 text-[12px] leading-relaxed text-ink-3">Every value reads zero until you connect MetaTrader with a read-only investor password. After the first sync these same cards fill in with your real account.</p>}
    </section>
  );
}
