import Link from "next/link";
import { HealthRow } from "@/components/app/dashboard/health-row";
import { OutlookCard } from "@/components/app/dashboard/outlook-card";
import { AiAnalysisCard, CommunityCard, MacroCard, NewsCard, PositionsCard, RecentTradesCard } from "@/components/app/dashboard/cards";
import { AccountPicker } from "@/components/app/account-picker";
import { Alert } from "@/components/auth/auth-ui";
import { GlassIcon } from "@/components/icons/glass-icon";
import { InstrumentCard } from "@/components/previews/zone-explorer";
import { Glass } from "@/components/ui/glass";
import { ButtonLink } from "@/components/ui/button";
import { TRIAL_HOURS } from "@/config/plans";
import { dailyOutlook } from "@/lib/analytics";
import { sampleAnalysis } from "@/lib/demo/markets";
import { readPeriod } from "@/lib/period-param";
import { eq } from "drizzle-orm";
import { db, schema } from "@/server/db";
import { accountOverview, listAccounts } from "@/server/account-data";
import { getPlanState } from "@/server/entitlements";
import { providerStatus } from "@/server/providers";
import { requireOnboarded } from "@/server/session";

export const metadata = { title: "Dashboard" };

const TFS = ["1M", "5M", "15M", "1H", "4H"] as const;

export default async function Dashboard({ searchParams }: { searchParams: Promise<{ account?: string; welcome?: string; period?: string; from?: string; to?: string }> }) {
  const s = await requireOnboarded("/app");
  const sp = await searchParams;
  const accounts = await listAccounts(s.user.id);
  const [overview, plan] = await Promise.all([accountOverview(s.user.id, sp.account, accounts), getPlanState(s.user.id)]);
  const providers = providerStatus();
  const tz = s.profile.timezone;
  const period = readPeriod(sp);
  const nowIso = new Date().toISOString();
  const sample = overview?.account.source === "sample";
  const tf = s.profile.dashboardPrefs.defaultTimeframe;
  const [rules] = await db.select({ max: schema.rulebook.maxTradesPerDay }).from(schema.rulebook).where(eq(schema.rulebook.userId, s.user.id));
  // Structure lines use the zone engine on sample candles until market data is connected, and say so.
  const outlook = dailyOutlook({
    now: new Date(), tz, trades: overview?.trades ?? [], currency: overview?.account.currency, maxTradesPerDay: rules?.max ?? undefined,
    ...(providers.marketData ? {} : { gold: sampleAnalysis("XAUUSD", "4H").bias.bias, dollar: sampleAnalysis("DXY", "4H").bias.bias }),
  });
  const today = new Date().toLocaleDateString("en-GB", { timeZone: tz, weekday: "long", day: "numeric", month: "long" });

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
            <div className="flex flex-wrap items-center gap-5">
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

      <OutlookCard lines={outlook} date={today} sample={!providers.marketData && sample ? "Sample candles and account" : !providers.marketData ? "Structure from sample candles" : sample ? "Sample account" : null} />

      <nav aria-label="Quick links" className="grid grid-cols-4 gap-2 lg:hidden">
        {([["/app/markets", "markets", "Markets"], ["/app/news", "news", "News"], ["/app/ai-analysis", "ai", "AI"], ["/app/journal", "journal", "Journal"]] as const).map(([href, icon, label]) => (
          <Link key={href} href={href} className="glass grid justify-items-center gap-1.5 rounded-3xl py-3 text-[11.5px] font-medium text-ink-2">
            <GlassIcon name={icon} size={44} />{label}
          </Link>
        ))}
      </nav>

      <div className="grid gap-4 xl:grid-cols-[1fr_1fr_0.86fr]">
        <InstrumentCard symbol="XAUUSD" defaultTf={tf} tfs={[...TFS]} height={230} showMtf={false} compact />
        <InstrumentCard symbol="DXY" defaultTf={tf} tfs={[...TFS]} height={230} showMtf={false} compact />
        <NewsCard connected={providers.news} />
      </div>
      {!providers.marketData && <p className="-mt-2 px-1 text-xs text-ink-3">Market charts run the real zone engine on sample candles until the market-data provider is connected. Tap any zone for its full explanation.</p>}

      <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
        <MacroCard />
        <AiAnalysisCard aiConnected={providers.ai} recent={[]} />
        <CommunityCard />
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.45fr_1fr]">
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
