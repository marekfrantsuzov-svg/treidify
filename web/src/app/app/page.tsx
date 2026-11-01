import { AccountOverview } from "@/components/app/dashboard/account-overview";
import { DashboardHero } from "@/components/app/dashboard/hero";
import { QuickTools } from "@/components/app/dashboard/quick-tools";
import { PositionsCard, RecentTradesCard } from "@/components/app/dashboard/cards";
import { MarketBoard } from "@/components/intel/market-board";
import { CalendarCardV2, NewsCardV2 } from "@/components/intel/news-list";
import { Reveal, RevealItem } from "@/components/motion/reveal";
import { marketIntelligence } from "@/server/market/intelligence";
import { economicCalendar, latestHeadlines, upcomingEvents } from "@/server/news/service";
import { AccountPicker } from "@/components/app/account-picker";
import { Alert } from "@/components/auth/auth-ui";
import { TRIAL_HOURS } from "@/config/plans";
import { greetingFor } from "@/lib/greeting";
import { readPeriod } from "@/lib/period-param";
import { accountOverview, listAccounts } from "@/server/account-data";
import { getPlanState } from "@/server/entitlements";
import { requireOnboarded } from "@/server/session";

export const metadata = { title: "Dashboard" };

/**
 * Dashboard. One 12-column grid (6 on tablets, 1 on phones): greeting, account health, market intelligence,
 * zones and structure, AI read, news, calendar, positions and trades. Every card uses the shared Card system.
 */
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
    <Reveal className="dash-grid">
      <RevealItem>
        <DashboardHero greeting={greetingFor(tz)} name={s.user.name.split(" ")[0] ?? ""} timezone={tz}>
          {accounts.length > 1 && overview && <AccountPicker accounts={accounts.map((a) => ({ id: a.id, label: a.label }))} selected={overview.account.id} />}
        </DashboardHero>
      </RevealItem>
      {sp.welcome && (
        <RevealItem>
          <Alert tone="accent">
            {sp.welcome === "trial" && plan.source === "trial"
              ? `Welcome to Treidify. Your ${TRIAL_HOURS}-hour Premium trial is active and ends on its own, with nothing to cancel.`
              : "Welcome to Treidify. Your account is ready."}
          </Alert>
        </RevealItem>
      )}
      <RevealItem className="lg:hidden"><QuickTools /></RevealItem>

      <AccountOverview
        state={!overview ? "none" : sample ? "sample" : overview.account.status === "connected" ? "connected" : "pending"}
        label={overview ? `${overview.account.label}${overview.account.broker ? ` · ${overview.account.broker}` : ""}` : "Not connected"}
        currency={overview?.account.currency ?? "USD"}
        balance={overview?.balance ?? null}
        equity={overview?.equity ?? null}
        floating={overview?.floating ?? null}
        snapshotAt={overview?.snapshotAt ?? null}
        startingEquity={overview?.startingEquity ?? 0}
        trades={overview?.trades ?? []}
        timezone={tz}
        period={period.id}
        custom={period.custom}
        nowIso={nowIso}
      />

      <MarketBoard initial={intel} news={<NewsCardV2 news={news} nowMs={now.getTime()} />} calendar={<CalendarCardV2 events={events} tz={tz} />} />

      <RevealItem className="span-7">
        <PositionsCard
          rows={(overview?.positions ?? []).map((p) => ({ id: p.id, symbol: p.symbol, side: p.side, volume: p.volume, openPrice: p.openPrice, currentPrice: p.currentPrice, floatingPnl: p.floatingPnl, stopLoss: p.stopLoss, takeProfit: p.takeProfit }))}
          currency={overview?.account.currency ?? "USD"}
          sample={sample}
          connected={!!overview}
        />
      </RevealItem>
      <RevealItem className="span-5">
        <RecentTradesCard
          rows={(overview?.trades ?? []).slice(-5).reverse().map((t) => ({ id: t.id, symbol: t.symbol, side: t.side, net: t.profit + t.commission + t.swap + t.fees, closeTime: new Date(t.closeTime * 1000).toISOString() }))}
          currency={overview?.account.currency ?? "USD"}
          sample={sample}
          nowIso={nowIso}
        />
      </RevealItem>
    </Reveal>
  );
}
