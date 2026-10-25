import { AccountPicker } from "@/components/app/account-picker";
import { PageHeader, StatusCard } from "@/components/app/status";
import { DrawdownChart, GroupTable, MonthBars, Panel, Tile, money0 } from "@/components/app/performance/parts";
import { EquityChart } from "@/components/charts/equity-chart";
import { GlassIcon } from "@/components/icons/glass-icon";
import { SampleBadge } from "@/components/ui/pill";
import { byMonth, bySessionOpened, bySide, bySymbol, byWeekday, drawdownSeries, equitySeries, holdingHours, inRange, performanceMetrics, periodRange } from "@/lib/analytics";
import { fmtNumber, fmtPct, fmtSignedMoney } from "@/lib/format";
import { PERIOD_NAMES, readPeriod } from "@/lib/period-param";
import { accountOverview, listAccounts } from "@/server/account-data";
import { requireOnboarded } from "@/server/session";

export const metadata = { title: "Performance" };

export default async function Performance({ searchParams }: { searchParams: Promise<{ account?: string; period?: string; from?: string; to?: string }> }) {
  const s = await requireOnboarded("/app/performance");
  const sp = await searchParams;
  const accounts = await listAccounts(s.user.id);
  const o = await accountOverview(s.user.id, sp.account, accounts);
  const tz = s.profile.timezone;
  const period = readPeriod(sp);

  if (!o) {
    return (
      <>
        <PageHeader title="Performance" subtitle="Deep analytics from your closed trades." />
        <StatusCard title="No account yet" icon={<GlassIcon name="yield" size={32} />} status="Needs account" action={{ href: "/app/accounts", label: "Connect an account or load the demo" }}>
          Performance analytics are calculated on the server from your own closed trades: equity, drawdown, monthly results and breakdowns by instrument, session, weekday and direction. Deposits and withdrawals never count as profit.
        </StatusCard>
      </>
    );
  }

  const c = o.account.currency;
  const range = periodRange(period.id, new Date(), tz, period.custom);
  const trades = o.trades.filter((t) => inRange(t, range));
  const series = equitySeries(o.trades, o.startingEquity, range);
  const m = performanceMetrics(trades, series[0]?.equity ?? null);
  const hold = holdingHours(trades);
  const startEq = series[0]?.equity ?? 0;
  const months = byMonth(o.trades, tz).slice(-12);
  const tone = (v: number | null) => (v === null || v === 0 ? undefined : v > 0 ? "up" : "down");

  return (
    <>
      <PageHeader title="Performance" subtitle={<>{PERIOD_NAMES[period.id]} · {o.account.label}{o.account.source === "sample" && <SampleBadge label="Sample account" className="ml-2 align-middle" />}</>}>
        <AccountPicker accounts={accounts.map((a) => ({ id: a.id, label: a.label }))} selected={o.account.id} />
      </PageHeader>
      <div className="grid gap-4">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 xl:grid-cols-6">
          <Tile label="Net P&L" value={fmtSignedMoney(m.netProfit, c, 0)} tone={tone(m.netProfit)} sub={startEq > 0 ? fmtPct((m.netProfit / startEq) * 100, 1, true) : undefined} />
          <Tile label="Win rate" value={m.winRate === null ? "—" : `${(m.winRate * 100).toFixed(1)}%`} sub={`${m.wins}W · ${m.losses}L · ${m.breakevens}BE`} />
          <Tile label="Profit factor" value={m.profitFactor === null ? "—" : fmtNumber(m.profitFactor)} />
          <Tile label="Expectancy" value={m.expectancy === null ? "—" : fmtSignedMoney(m.expectancy, c, 2)} tone={tone(m.expectancy)} sub="per trade" />
          <Tile label="Max drawdown" value={m.maxDrawdownPercent === null ? "—" : `${fmtNumber(m.maxDrawdownPercent, 1)}%`} sub={money0(m.maxDrawdown, c)} />
          <Tile label="Trades" value={String(m.tradeCount)} sub={`Costs ${money0(m.totalCosts, c)}`} />
          <Tile label="Avg win" value={money0(m.averageWinner, c)} />
          <Tile label="Avg loss" value={m.averageLoser === null ? "—" : fmtSignedMoney(m.averageLoser, c, 0)} />
          <Tile label="Reward : risk" value={m.rewardToRisk === null ? "—" : fmtNumber(m.rewardToRisk)} />
          <Tile label="Streaks" value={`${m.maxConsecutiveWins}W / ${m.maxConsecutiveLosses}L`} sub="longest" />
          <Tile label="Hold, winners" value={hold.winners === null ? "—" : `${fmtNumber(hold.winners, 1)} h`} />
          <Tile label="Hold, losers" value={hold.losers === null ? "—" : `${fmtNumber(hold.losers, 1)} h`} />
        </div>

        <div className="grid gap-4 xl:grid-cols-[1.6fr_1fr]">
          <Panel title="Equity curve" note="Trading results only. Deposits and withdrawals are excluded.">
            {series.length > 1 ? <EquityChart points={series} currency={c} height={240} /> : <p className="text-sm text-ink-3">No closed trades in this period.</p>}
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
      </div>
    </>
  );
}
