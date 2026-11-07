import { AccountPicker } from "@/components/app/account-picker";
import { PageHeader } from "@/components/app/status";
import { DrawdownChart, GroupTable, MonthBars, Panel, Tile, money0 } from "@/components/app/performance/parts";
import { EquityChart } from "@/components/charts/equity-chart";
import { ConnectStrip } from "@/components/app/status";
import { SampleBadge } from "@/components/ui/pill";
import { healthScore, healthStatus } from "@/lib/analytics/health";
import { byMonth, bySessionOpened, bySide, bySymbol, byWeekday, drawdownSeries, equitySeries, holdingHours, inRange, performanceMetrics, periodRange } from "@/lib/analytics";
import { fmtNumber, fmtPct, fmtSignedMoney } from "@/lib/format";
import { PERIOD_NAMES, readPeriod } from "@/lib/period-param";
import { accountOverview, listAccounts, pickerOptions } from "@/server/account-data";
import { requireOnboarded } from "@/server/session";

export const metadata = { title: "Performance" };

export default async function Performance({ searchParams }: { searchParams: Promise<{ account?: string; period?: string; from?: string; to?: string }> }) {
  const s = await requireOnboarded("/app/performance");
  const sp = await searchParams;
  const accounts = await listAccounts(s.user.id);
  const o = await accountOverview(s.user.id, sp.account, accounts);
  const tz = s.profile.timezone;
  const period = readPeriod(sp);

  // Without an account the full page still renders, with every figure at zero, so nothing jumps once MetaTrader syncs.
  const c = o?.account.currency ?? "USD";
  const allTrades = o?.trades ?? [];
  const range = periodRange(period.id, new Date(), tz, period.custom);
  const trades = allTrades.filter((t) => inRange(t, range));
  const series = equitySeries(allTrades, o?.startingEquity ?? 0, range);
  const m = performanceMetrics(trades, series[0]?.equity ?? null);
  const hold = holdingHours(trades);
  const startEq = series[0]?.equity ?? 0;
  const months = byMonth(allTrades, tz).slice(-12);
  const nz = (v: string, zero: string) => (!o && v === "—" ? zero : v);
  const health = healthScore(allTrades, o?.startingEquity ?? 0);
  const status = healthStatus(health.score);
  const tone = (v: number | null) => (v === null || v === 0 ? undefined : v > 0 ? "up" : "down");

  return (
    <>
      <PageHeader title="Performance" subtitle={o ? <>{PERIOD_NAMES[period.id]} · {o.account.label}{o.account.source === "sample" && <SampleBadge label="Sample account" className="ml-2 align-middle" />}</> : <>{PERIOD_NAMES[period.id]} · Deep analytics from your closed trades.</>}>
        {o && <AccountPicker accounts={pickerOptions(accounts)} selected={o.account.id} />}
      </PageHeader>
      {!o && <ConnectStrip />}
      <div className="grid gap-4">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 xl:grid-cols-6">
          <Tile label="Net P&L" value={fmtSignedMoney(m.netProfit, c, 0)} tone={tone(m.netProfit)} sub={startEq > 0 ? fmtPct((m.netProfit / startEq) * 100, 1, true) : undefined} />
          <Tile label="Win rate" value={nz(m.winRate === null ? "—" : `${(m.winRate * 100).toFixed(1)}%`, "0.0%")} sub={`${m.wins}W · ${m.losses}L · ${m.breakevens}BE`} />
          <Tile label="Profit factor" value={nz(m.profitFactor === null ? "—" : fmtNumber(m.profitFactor), "0.00")} />
          <Tile label="Expectancy" value={nz(m.expectancy === null ? "—" : fmtSignedMoney(m.expectancy, c, 2), fmtSignedMoney(0, c, 2))} tone={tone(m.expectancy)} sub="per trade" />
          <Tile label="Max drawdown" value={nz(m.maxDrawdownPercent === null ? "—" : `${fmtNumber(m.maxDrawdownPercent, 1)}%`, "0.0%")} sub={money0(m.maxDrawdown, c)} />
          <Tile label="Trades" value={String(m.tradeCount)} sub={`Costs ${money0(m.totalCosts, c)}`} />
          <Tile label="Avg win" value={nz(money0(m.averageWinner, c), fmtSignedMoney(0, c, 0))} />
          <Tile label="Avg loss" value={nz(m.averageLoser === null ? "—" : fmtSignedMoney(m.averageLoser, c, 0), fmtSignedMoney(0, c, 0))} />
          <Tile label="Reward : risk" value={nz(m.rewardToRisk === null ? "—" : fmtNumber(m.rewardToRisk), "0.00")} />
          <Tile label="Streaks" value={`${m.maxConsecutiveWins}W / ${m.maxConsecutiveLosses}L`} sub="longest" />
          <Tile label="Hold, winners" value={nz(hold.winners === null ? "—" : `${fmtNumber(hold.winners, 1)} h`, "0.0 h")} />
          <Tile label="Hold, losers" value={nz(hold.losers === null ? "—" : `${fmtNumber(hold.losers, 1)} h`, "0.0 h")} />
        </div>

        <div className="grid gap-4 xl:grid-cols-[1.6fr_1fr]">
          <Panel title="Equity curve" note="Trading results only. Deposits and withdrawals are excluded.">
            {series.length > 1 ? <EquityChart points={series} currency={c} height={240} /> : <p className="text-sm text-ink-3">{o ? "No closed trades in this period." : "Your equity curve appears here after the first sync."}</p>}
          </Panel>
          <Panel title="Drawdown from peak">
            <DrawdownChart points={drawdownSeries(series)} height={240} />
          </Panel>
        </div>

        <Panel title="Net profit by month" note="Last 12 months with trades, in your time zone">
          <MonthBars months={months} currency={c} />
        </Panel>

        <div className="grid gap-4 lg:grid-cols-2">
          <Panel title="By instrument"><GroupTable groups={bySymbol(trades)} currency={c} first="Instrument" /></Panel>
          <Panel title="By session" note="Session the trade was opened in"><GroupTable groups={bySessionOpened(trades)} currency={c} first="Session" /></Panel>
          <Panel title="By weekday" note={`Opened, ${tz}`}><GroupTable groups={byWeekday(trades, tz)} currency={c} first="Day" /></Panel>
          <Panel title="Long vs short"><GroupTable groups={bySide(trades)} currency={c} first="Direction" /></Panel>
        </div>

        <section id="health-method" className="scroll-mt-24">
          <Panel title="How Account Health is scored" note="Computed from all closed trades of this account. Needs at least 20 closed trades.">
            <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
              <div className="text-[13.5px] leading-relaxed text-ink-2">
                <p>The score is the sum of five parts, 100 points in total. Each part is scaled between a weak and a strong value and capped, so one great number cannot hide a weak one.</p>
                <p className="mt-2"><b className="text-ink">Strong</b> is 80 or more, <b className="text-ink">Moderate</b> 50 to 79, <b className="text-ink">At risk</b> under 50.</p>
                <p className="mt-2">{health.score === null ? health.reason : <>This account: <b className="text-ink">{health.score}/100</b>{status ? `, ${status}` : ""}.</>}</p>
              </div>
              <table className="w-full text-left text-[13px]">
                <thead className="text-ink-3"><tr><th className="py-1.5 font-medium">Part</th><th className="py-1.5 font-medium">How it is measured</th><th className="py-1.5 text-right font-medium">Points</th></tr></thead>
                <tbody className="num">
                  {[
                    ["drawdown", "Drawdown control", "Max drawdown from peak trading equity; full points at 0%, none at 20% or worse", 30],
                    ["profitFactor", "Profit factor", "Gross profit ÷ gross loss; none at 0.8, full at 2.0", 25],
                    ["expectancy", "Expectancy", "Average result per trade relative to the average loser", 20],
                    ["sizing", "Sizing consistency", "Variation of lot sizes; full points up to 0.25, none at 1.0", 15],
                    ["streak", "Loss streaks", "Longest losing streak; full points up to 3, none at 10", 10],
                  ].map(([key, label, how, max]) => {
                    const part = health.components.find((x) => x.key === key);
                    return (
                      <tr key={key as string} className="border-t border-line align-top">
                        <td className="py-2 pr-3 font-medium text-ink">{label}</td>
                        <td className="py-2 pr-3 text-ink-2">{how}{part ? <span className="block text-[12px] text-ink-3">{part.detail}</span> : null}</td>
                        <td className="py-2 text-right text-ink">{part ? `${part.points} / ${max}` : `– / ${max}`}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Panel>
        </section>
      </div>
    </>
  );
}
