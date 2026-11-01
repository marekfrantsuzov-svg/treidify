import { HealthRow } from "@/components/app/dashboard/health-row";
import { QuickTools } from "@/components/app/dashboard/quick-tools";
import { PositionsCard, RecentTradesCard } from "@/components/app/dashboard/cards";
import { MarketIntel } from "@/components/intel/market-intel";
import { NewsPanel } from "@/components/intel/news-list";
import { marketIntelligence } from "@/server/market/intelligence";
import { economicCalendar, latestHeadlines, upcomingEvents } from "@/server/news/service";
import { AccountPicker } from "@/components/app/account-picker";
import { Alert } from "@/components/auth/auth-ui";
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
    <div className="grid grid-cols-[minmax(0,1fr)] gap-4">
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

      <QuickTools />

      <MarketIntel initial={intel} />

      <HealthRow
        state={!overview ? "none" : sample ? "sample" : overview.account.status === "connected" ? "connected" : "pending"}
        label={overview ? `${overview.account.label}${overview.account.broker ? ` · ${overview.account.broker}` : ""}` : "Not connected"}
        currency={overview?.account.currency ?? "USD"}
        sample={sample}
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
