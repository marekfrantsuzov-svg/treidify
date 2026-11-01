"use client";

import Link from "next/link";
import { useMemo } from "react";
import { equitySeries, inRange, performanceMetrics, periodRange, type ClosedTrade, type PeriodId } from "@/lib/analytics";
import { cn } from "@/lib/cn";
import { fmtMoney, fmtNumber, fmtSignedMoney } from "@/lib/format";
import { PERIOD_NAMES } from "@/lib/period-param";
import { EquityChart } from "@/components/charts/equity-chart";
import { Card, CardHeader } from "@/components/ui/card";
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

const QUICK_PERIODS: PeriodId[] = ["7D", "30D", "90D", "ALL"];

/**
 * YOUR ACCOUNT HEALTH, as dashboard grid items: headline metrics, equity curve, health and connection, statistics.
 * The layout never changes with the connection: before MT5 every figure reads zero, after a sync the same cards fill in.
 */
export function AccountOverview(p: AccountOverviewProps & { aside?: React.ReactNode }) {
  const none = p.state === "none";
  const now = useMemo(() => new Date(p.nowIso), [p.nowIso]);
  const range = useMemo(() => periodRange(p.period, now, p.timezone, p.custom), [p.period, now, p.timezone, p.custom]);
  const inPeriod = useMemo(() => p.trades.filter((t) => inRange(t, range)), [p.trades, range]);
  const m = useMemo(() => performanceMetrics(inPeriod), [inPeriod]);
  const all = useMemo(() => performanceMetrics(p.trades, p.startingEquity || null), [p.trades, p.startingEquity]);
  const series = useMemo(() => equitySeries(p.trades, p.startingEquity, range), [p.trades, p.startingEquity, range]);
  const startEq = series[0]?.equity ?? p.startingEquity;
  const money = (v: number, d = 2) => fmtMoney(v, p.currency, d);
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

      {p.aside && <RevealItem className="span-4">{p.aside}</RevealItem>}

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
