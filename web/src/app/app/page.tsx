import { HealthRow } from "@/components/app/dashboard/health-row";
import { PositionsCard, RecentTradesCard } from "@/components/app/dashboard/cards";
import { MarketIntel } from "@/components/intel/market-intel";
import { NewsPanel } from "@/components/intel/news-list";
import { marketIntelligence } from "@/server/market/intelligence";
import { economicCalendar, latestHeadlines, upcomingEvents } from "@/server/news/service";
import { AccountPicker } from "@/components/app/account-picker";
import { Alert } from "@/components/auth/auth-ui";
import { GlassIcon } from "@/components/icons/glass-icon";
import { Glass } from "@/components/ui/glass";
import { ButtonLink } from "@/components/ui/button";
import { TRIAL_HOURS } from "@/config/plans";
import { readPeriod } from "@/lib/period-param";
import { accountOverview, listAccounts } from "@/server/account-data";
import { getPlanState } from "@/server/entitlements";
import { requireOnboarded } from "@/server/session";

export const metadata = { title: "Dashboard" };

export default async function Dashboard({ searchParams }: { searchParams: Promise<{ account?: string; welcome?: string; period?: string; from?: string; to?: string }> }) {
  const s = await requireOnboarded("/app");
  const sp = await searchParams;
  const accounts = await listAccounts(s.user.id);
  const [overview, plan] = await Promise.all([accountOverview(s.user.id, sp.account, accounts), getPlanState(s.user.id)]);
  const tz = s.profile.timezone;
  const period = readPeriod(sp);
  const now = new Date();
  const nowIso = now.toISOString();
  const sample = overview?.account.source === "sample";
  const [intel, news, events] = await Promise.all([
    upcomingEvents(now).then((ev) => marketIntelligence(ev, now)),
    latestHeadlines(8),
    economicCalendar(now, new Date(now.getTime() + 3 * 86_400_000)),
  ]);

  return (
    <div className="grid gap-4">
      <h1 className="sr-only">Dashboard</h1>
      {sp.welcome && (
        <div className="rise">
          <Alert tone="accent">
            {sp.welcome === "trial" && plan.source === "trial"
              ? `Welcome to Treidify. Your ${TRIAL_HOURS}-hour Premium trial is active and ends on its own, with nothing to cancel.`
              : "Welcome to Treidify. Your account is ready."}
          </Alert>
        </div>
      )}
      {accounts.length > 1 && overview && <div className="flex justify-end"><AccountPicker accounts={accounts.map((a) => ({ id: a.id, label: a.label }))} selected={overview.account.id} /></div>}

      <MarketIntel initial={intel} />

      {overview ? (
        <HealthRow
          label={`${overview.account.label}${overview.account.broker ? ` · ${overview.account.broker}` : ""}`}
          currency={overview.account.currency}
          sample={sample}
          balance={overview.balance}
          equity={overview.equity}
          floating={overview.floating}
          snapshotAt={overview.snapshotAt}
          startingEquity={overview.startingEquity}
          trades={overview.trades}
          timezone={tz}
          period={period.id}
          custom={period.custom}
          nowIso={nowIso}
        />
      ) : (
        <section aria-labelledby="health-title" className="grid gap-3">
          <h2 id="health-title" className="px-1 text-xs font-semibold uppercase tracking-[0.16em] text-ink-2">Your Account Health</h2>
          <Glass className="relative overflow-hidden p-5 sm:p-7">
            <div className="pointer-events-none absolute -right-20 -top-24 h-72 w-72 rounded-full bg-[radial-gradient(circle,var(--accent-soft),transparent_70%)]" />
            <div className="flex flex-col items-start gap-4 sm:flex-row sm:flex-wrap sm:items-center sm:gap-5">
              <GlassIcon name="link" size={64} />
              <div className="min-w-0 flex-1">
                <p className="text-xl font-semibold tracking-[-0.02em] text-ink sm:text-2xl">Connect MetaTrader to see your real Account Health.</p>
                <p className="mt-1 max-w-2xl text-sm text-ink-2">Health score, balance, net P&amp;L and win rate are calculated from your own synced deals with a read-only investor password. Nothing here is estimated.</p>
              </div>
              <ButtonLink href="/app/accounts" size="lg">Connect account</ButtonLink>
            </div>
          </Glass>
        </section>
      )}


      <NewsPanel news={news} events={events} tz={tz} nowMs={now.getTime()} />

      <div className="grid gap-4 xl:grid-cols-[1.65fr_1fr]">
        <PositionsCard
          rows={(overview?.positions ?? []).map((p) => ({ id: p.id, symbol: p.symbol, side: p.side, volume: p.volume, openPrice: p.openPrice, currentPrice: p.currentPrice, floatingPnl: p.floatingPnl, stopLoss: p.stopLoss, takeProfit: p.takeProfit }))}
          currency={overview?.account.currency ?? "USD"}
          sample={sample}
          connected={!!overview}
        />
        <RecentTradesCard
          rows={(overview?.trades ?? []).slice(-4).reverse().map((t) => ({ id: t.id, symbol: t.symbol, side: t.side, net: t.profit + t.commission + t.swap + t.fees, closeTime: new Date(t.closeTime * 1000).toISOString() }))}
          currency={overview?.account.currency ?? "USD"}
          sample={sample}
          nowIso={nowIso}
        />
      </div>

    </div>
  );
}
