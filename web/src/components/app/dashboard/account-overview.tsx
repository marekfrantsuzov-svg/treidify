"use client";

import { Activity, HeartPulse, Link2, ShieldCheck, Target, Wallet } from "lucide-react";
import Link from "next/link";
import { useMemo } from "react";
import { HEALTH_ALGORITHM, equitySeries, healthScore, inRange, performanceMetrics, periodRange, type ClosedTrade, type PeriodId } from "@/lib/analytics";
import { cn } from "@/lib/cn";
import { fmtMoney, fmtNumber, fmtPct, fmtSignedMoney } from "@/lib/format";
import { PERIOD_NAMES } from "@/lib/period-param";
import { EquityChart } from "@/components/charts/equity-chart";
import { HealthRing } from "@/components/previews/account-health-preview";
import { CountUp } from "@/components/ui/count-up";
import { Card, CardHeader, Stat } from "@/components/ui/card";
import { SampleBadge } from "@/components/ui/pill";
import { RevealItem } from "@/components/motion/reveal";

/** Where the numbers come from. "none": no MetaTrader account yet, so every metric is drawn at zero and nothing is invented. */
export type AccountState = "none" | "sample" | "pending" | "connected";

export interface AccountOverviewProps {
  state: AccountState;
  label: string;
  currency: string;
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

const STATE: Record<AccountState, { text: string; dot: string; cls: string }> = {
  none: { text: "Not connected", dot: "bg-ink-3", cls: "bg-inset text-ink-2" },
  sample: { text: "Sample account", dot: "bg-warn", cls: "bg-warn-soft text-warn" },
  pending: { text: "Syncing", dot: "bg-accent motion-safe:animate-pulse", cls: "bg-accent-soft text-accent" },
  connected: { text: "Live · read-only", dot: "bg-up shadow-[0_0_8px_var(--up)]", cls: "bg-up-soft text-up" },
};

const GRADE_NOTE: Record<string, string> = {
  Strong: "Consistent profitability",
  Stable: "Sound, with room to tighten",
  "Needs attention": "Risk or consistency slipping",
  "At risk": "Drawdown or losses need action",
};

const QUICK_PERIODS: PeriodId[] = ["7D", "30D", "90D", "ALL"];

/**
 * YOUR ACCOUNT HEALTH, as dashboard grid items: headline metrics, equity curve, health and connection, statistics.
 * The layout never changes with the connection: before MT5 every figure reads zero, after a sync the same cards fill in.
 */
export function AccountOverview(p: AccountOverviewProps) {
  const none = p.state === "none";
  const now = useMemo(() => new Date(p.nowIso), [p.nowIso]);
  const range = useMemo(() => periodRange(p.period, now, p.timezone, p.custom), [p.period, now, p.timezone, p.custom]);
  const inPeriod = useMemo(() => p.trades.filter((t) => inRange(t, range)), [p.trades, range]);
  const m = useMemo(() => performanceMetrics(inPeriod), [inPeriod]);
  const all = useMemo(() => performanceMetrics(p.trades, p.startingEquity || null), [p.trades, p.startingEquity]);
  const health = useMemo(() => healthScore(p.trades, p.startingEquity, all), [p.trades, p.startingEquity, all]);
  const series = useMemo(() => equitySeries(p.trades, p.startingEquity, range), [p.trades, p.startingEquity, range]);
  const startEq = series[0]?.equity ?? p.startingEquity;
  const pnlPct = startEq > 0 ? (m.netProfit / startEq) * 100 : null;
  const money = (v: number, d = 2) => fmtMoney(v, p.currency, d);
  const chip = STATE[p.state];
  const zeroOr = (v: string | null, zero: string) => (v === null ? (none ? zero : "—") : v);
  const periodName = PERIOD_NAMES[p.period];

  const stats: [string, string][] = [
    ["Trades", String(m.tradeCount)],
    ["Win / loss", `${m.wins} / ${m.losses}`],
    ["Profit factor", zeroOr(m.profitFactor === null ? null : fmtNumber(m.profitFactor), "0.00")],
    ["Expectancy", zeroOr(m.expectancy === null ? null : fmtSignedMoney(m.expectancy, p.currency, 0), money(0, 0))],
    ["Reward : risk", zeroOr(m.rewardToRisk === null ? null : fmtNumber(m.rewardToRisk), "0.00")],
    ["Avg win", zeroOr(m.averageWinner === null ? null : money(m.averageWinner, 0), money(0, 0))],
    ["Avg loss", zeroOr(m.averageLoser === null ? null : fmtSignedMoney(m.averageLoser, p.currency, 0), money(0, 0))],
    ["Max drawdown", zeroOr(all.maxDrawdownPercent === null ? null : `${fmtNumber(all.maxDrawdownPercent, 1)}%`, "0.0%")],
    ["Best streak", `${m.maxConsecutiveWins} wins`],
    ["Costs", money(m.totalCosts, 0)],
  ];

  return (
    <>
      {/* Headline metrics */}
      <RevealItem className="span-12">
        <Card aria-labelledby="health-title" className="p-4 sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="min-w-0">
              <h2 id="health-title" className="text-[20px] font-semibold tracking-[-0.03em] text-ink sm:text-[22px]">Your Account Health</h2>
              <p className="mt-0.5 truncate text-[13px] text-ink-3">{none ? "MetaTrader 4 / 5 · read-only investor access" : p.label}</p>
            </div>
            <div className="flex items-center gap-2">
              <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[12px] font-semibold", chip.cls)}><span className={cn("h-1.5 w-1.5 rounded-full", chip.dot)} />{chip.text}</span>
              {none && <Link href="/app/accounts" className="press bg-brand inline-flex h-9 items-center gap-1.5 rounded-full px-4 text-[13px] font-semibold text-white shadow-[0_10px_22px_-10px_var(--accent-glow)]"><Link2 className="h-4 w-4" />Connect MT5</Link>}
            </div>
          </div>
          <div className="mt-5 grid grid-cols-2 gap-x-4 gap-y-5 lg:grid-cols-4 lg:divide-x lg:divide-[var(--border)]">
            <Stat className="lg:pr-4" icon={<Wallet className="h-[18px] w-[18px]" />} label="Total balance" tone={none ? "muted" : undefined}
              value={p.balance === null ? money(0) : <CountUp value={p.balance} format={(v) => money(v)} />}
              sub={none ? undefined : pnlPct === null ? undefined : fmtPct(pnlPct, 1, true)} />
            <Stat className="lg:px-6" icon={<Activity className="h-[18px] w-[18px]" />} label={`Net P&L · ${periodName.toLowerCase()}`} tone={none ? "muted" : m.netProfit < 0 ? "down" : undefined}
              value={<CountUp value={m.netProfit} format={(v) => fmtSignedMoney(v, p.currency)} />} />
            <Stat className="lg:px-6" icon={<Target className="h-[18px] w-[18px]" />} label={`Win rate · ${m.wins}W / ${m.losses}L`} tone={none ? "muted" : undefined}
              value={m.winRate === null ? "0.0%" : <CountUp value={m.winRate * 100} format={(v) => `${v.toFixed(1)}%`} />} />
            <Stat className="lg:pl-6" icon={<HeartPulse className="h-[18px] w-[18px]" />} label={health.grade ? `Health · ${health.grade}` : "Health score · after 20 trades"} tone={none || health.score === null ? "muted" : undefined}
              value={health.score === null ? "0" : <CountUp value={health.score} format={(v) => String(Math.round(v))} />} sub={p.state === "sample" ? <SampleBadge label="Sample" className="px-1.5 align-middle text-[9.5px]" /> : undefined} />
          </div>
        </Card>
      </RevealItem>

      {/* Equity curve */}
      <RevealItem className="span-8">
        <Card className="flex h-full flex-col">
          <CardHeader title="Equity curve" caption={none ? "Trading results only · deposits and withdrawals excluded" : `${money(startEq, 0)} → ${money(series.at(-1)?.equity ?? startEq, 0)}`}>
            <div className="inset hidden rounded-full p-0.5 sm:flex" role="group" aria-label="Period">
              {QUICK_PERIODS.map((id) => (
                <Link key={id} href={`/app?period=${id}`} scroll={false} aria-current={p.period === id ? "true" : undefined}
                  className={cn("rounded-full px-2.5 py-1 text-[11.5px] font-semibold transition-colors", p.period === id ? "bg-[var(--surface-strong)] text-ink shadow-[var(--shadow)]" : "text-ink-3 hover:text-ink")}>{id === "ALL" ? "All" : id}</Link>
              ))}
            </div>
          </CardHeader>
          <div className="mt-4 flex-1">
            {series.length >= 2 ? <EquityChart points={series} height={240} currency={p.currency} label={`Equity, ${periodName.toLowerCase()}`} /> : (
              <EmptyCurve height={240} text={none ? "Your equity curve draws itself here after the first sync." : "No closed trades in this period."} />
            )}
          </div>
          {p.equity !== null && p.floating !== null && <p className="mt-2 text-xs text-ink-3">Equity {money(p.equity)}, floating {fmtSignedMoney(p.floating, p.currency)}. Deposits and withdrawals never count as profit.</p>}
        </Card>
      </RevealItem>

      {/* Health and connection */}
      <RevealItem className="span-4">
        <Card className="flex h-full flex-col">
          <CardHeader title="Health score" caption={`Algorithm ${HEALTH_ALGORITHM} · all history`} href="/app/performance" hrefLabel="Open performance" />
          <div className="mt-4 flex items-center gap-4">
            <HealthRing score={none ? 0 : health.score} size={96} />
            <div className="min-w-0">
              <div className={cn("text-[18px] font-semibold tracking-[-0.02em]", health.grade === "Strong" ? "text-up" : health.grade === "At risk" ? "text-down" : none ? "text-ink-2" : "text-ink")}>{none ? "No data yet" : health.grade ?? "Building"}</div>
              <p className="mt-0.5 text-[12.5px] leading-snug text-ink-3">{none ? "Scored from drawdown, profit factor, expectancy, sizing and streaks after 20 closed trades." : health.grade ? GRADE_NOTE[health.grade] : health.reason}</p>
            </div>
          </div>
          <div className="mt-auto pt-5">
            {none ? (
              <div className="rounded-[20px] border border-dashed border-[color-mix(in_oklab,var(--accent)_35%,var(--border))] bg-[color-mix(in_oklab,var(--accent)_6%,transparent)] p-4">
                <div className="flex items-center gap-2 text-[13.5px] font-semibold text-ink"><ShieldCheck className="h-4 w-4 text-accent" />Connect MetaTrader 5</div>
                <p className="mt-1 text-[12.5px] leading-snug text-ink-2">Read-only investor password. Treidify can never place or change a trade.</p>
                <Link href="/app/accounts" className="press bg-brand mt-3 inline-flex h-9 items-center rounded-full px-4 text-[13px] font-semibold text-white shadow-[0_10px_22px_-10px_var(--accent-glow)]">Connect account</Link>
              </div>
            ) : (
              <div className="inset rounded-[20px] p-4 text-[12.5px] text-ink-2">
                <div className="flex items-center justify-between gap-2"><span className="font-semibold text-ink">{p.label}</span><span className={cn("rounded-full px-2 py-0.5 text-[11px] font-semibold", chip.cls)}>{chip.text}</span></div>
                <p className="mt-1">{p.snapshotAt ? `Last sync ${new Date(p.snapshotAt).toLocaleString([], { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}` : "Waiting for the first sync."}</p>
              </div>
            )}
          </div>
        </Card>
      </RevealItem>

      {/* Statistics */}
      <RevealItem className="span-12">
        <Card>
          <CardHeader title="Trading statistics" caption={periodName} href="/app/performance" hrefLabel="All statistics" />
          <dl className="mt-4 grid grid-cols-2 gap-2.5 sm:grid-cols-5">
            {stats.map(([k, v]) => (
              <div key={k} className="inset min-w-0 rounded-2xl px-3.5 py-3">
                <dt className="truncate text-[11.5px] text-ink-3">{k}</dt>
                <dd className={cn("display-num mt-1 truncate text-[17px]", none ? "text-ink-3" : "text-ink")}>{v}</dd>
              </div>
            ))}
          </dl>
          {none && <p className="mt-3 px-0.5 text-[12px] text-ink-3">Every value reads zero until MetaTrader is connected. After the first sync these cards fill in with your real account.</p>}
        </Card>
      </RevealItem>
    </>
  );
}

/** Flat baseline in place of the equity curve until there are closed trades. Nothing is plotted that did not happen. */
function EmptyCurve({ height, text }: { height: number; text: string }) {
  return (
    <div className="relative overflow-hidden rounded-2xl" style={{ height }}>
      <div aria-hidden className="absolute inset-0 bg-[linear-gradient(var(--chart-grid)_1px,transparent_1px)] bg-[size:100%_25%]" />
      <div aria-hidden className="absolute inset-x-0 top-[64%] border-t-2 border-dashed border-[color-mix(in_oklab,var(--accent)_40%,transparent)]" />
      <div aria-hidden className="absolute inset-x-0 bottom-0 top-[64%] bg-[linear-gradient(180deg,color-mix(in_oklab,var(--accent)_12%,transparent),transparent)]" />
      <p className="absolute inset-x-0 top-[30%] px-6 text-center text-[13px] text-ink-3">{text}</p>
    </div>
  );
}
