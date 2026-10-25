import { CalendarClock, Brain, Link2, ShieldCheck, Sparkles } from "lucide-react";
import { AccountHealth } from "@/components/app/account-health";
import { AccountPicker } from "@/components/app/account-picker";
import { PageHeader, StatusCard } from "@/components/app/status";
import { InstrumentIcon } from "@/components/previews/parts";
import { Alert } from "@/components/auth/auth-ui";
import { Glass } from "@/components/ui/glass";
import { TRIAL_HOURS } from "@/config/plans";
import { accountOverview, listAccounts } from "@/server/account-data";
import { getPlanState } from "@/server/entitlements";
import { providerStatus } from "@/server/providers";
import { requireOnboarded } from "@/server/session";

export const metadata = { title: "Dashboard" };

export default async function Dashboard({ searchParams }: { searchParams: Promise<{ account?: string; welcome?: string }> }) {
  const s = await requireOnboarded("/app");
  const { account: accountId, welcome } = await searchParams;
  const accounts = await listAccounts(s.user.id);
  const [overview, plan] = await Promise.all([accountOverview(s.user.id, accountId, accounts), getPlanState(s.user.id)]);
  const providers = providerStatus();
  const tz = s.profile.timezone;

  return (
    <>
      <PageHeader title="Dashboard" subtitle={new Intl.DateTimeFormat("en-GB", { timeZone: tz, weekday: "long", day: "numeric", month: "long" }).format(new Date())}>
        {overview && <AccountPicker accounts={accounts.map((a) => ({ id: a.id, label: a.label }))} selected={overview.account.id} />}
      </PageHeader>

      {welcome && (
        <div className="rise mb-4">
          <Alert tone="accent">
            {welcome === "trial" && plan.source === "trial"
              ? `Welcome to Treidify. Your ${TRIAL_HOURS}-hour Premium trial is active and ends on its own, with nothing to cancel.`
              : "Welcome to Treidify. Your account is ready."}
          </Alert>
        </div>
      )}

      <div className="grid gap-4">
        {overview ? (
          <AccountHealth
            label={`${overview.account.label}${overview.account.broker ? ` · ${overview.account.broker}` : ""}`}
            currency={overview.account.currency}
            sample={overview.account.source === "sample"}
            balance={overview.balance}
            equity={overview.equity}
            floating={overview.floating}
            snapshotAt={overview.snapshotAt}
            startingEquity={overview.startingEquity}
            trades={overview.trades}
            timezone={tz}
            nowIso={new Date().toISOString()}
          />
        ) : (
          <Glass as="section" aria-labelledby="health-title" className="relative overflow-hidden p-6 sm:p-8">
            <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-[radial-gradient(circle,var(--accent-soft),transparent_70%)]" />
            <h2 id="health-title" className="text-xs font-semibold uppercase tracking-[0.16em] text-ink-2">Your Account Health</h2>
            <div className="mt-4 grid gap-6 md:grid-cols-[1.3fr_1fr] md:items-center">
              <div>
                <p className="text-2xl font-semibold tracking-[-0.03em] text-ink sm:text-[28px]">Connect your MetaTrader account to see your real numbers.</p>
                <p className="mt-2 max-w-xl text-[15px] text-ink-2">Balance, equity, P&amp;L by period, win rate, drawdown and your Health score are calculated from your own synced deals. Nothing here is estimated or invented.</p>
                {!providers.sync && (
                  <p className="mt-4 inline-flex items-center gap-2 rounded-full bg-warn-soft px-3 py-1.5 text-sm text-warn"><Link2 className="h-4 w-4" />Account sync is being switched on. You’ll be able to connect here as soon as it’s live.</p>
                )}
              </div>
              <ul className="grid gap-2.5 text-sm text-ink-2">
                <li className="inset flex gap-3 rounded-2xl p-3"><ShieldCheck className="h-4 w-4 shrink-0 text-up" />Read-only investor password. Treidify can never trade or withdraw.</li>
                <li className="inset flex gap-3 rounded-2xl p-3"><Sparkles className="h-4 w-4 shrink-0 text-accent" />Full history imported, then kept in sync.</li>
                <li className="inset flex gap-3 rounded-2xl p-3"><Brain className="h-4 w-4 shrink-0 text-accent" />Powers the journal, the coach and community verification.</li>
              </ul>
            </div>
          </Glass>
        )}

        <div className="grid gap-4 md:grid-cols-2">
          {(["XAUUSD", "DXY"] as const).map((sym) => (
            <StatusCard
              key={sym}
              title={sym === "XAUUSD" ? "XAUUSD · Gold" : "DXY · US Dollar Index"}
              icon={<InstrumentIcon symbol={sym} />}
              status={providers.marketData ? "Live" : "Data not connected"}
              action={{ href: "/app/markets", label: "Open Markets" }}
            >
              {providers.marketData
                ? "Live analysis is available on the Markets page."
                : "The multi-timeframe engine and clickable zones are built and tested. Live prices appear here once the market-data provider is connected; until then no price is shown."}
            </StatusCard>
          ))}
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <StatusCard title="Today’s key events" icon={<CalendarClock className="h-4 w-4 text-accent" />} status={providers.news ? "Live" : "Feed not connected"}>
            The economic calendar and global news engine show here, with forecast, previous and actual figures and their likely effect on gold and the dollar, once the news provider is connected.
          </StatusCard>
          <StatusCard title="AI Coach" icon={<Brain className="h-4 w-4 text-accent" />} status={!overview ? "Needs account" : overview.trades.length < 20 ? "Needs 20 trades" : !providers.ai ? "AI not connected" : "Coming soon"}>
            The coach reviews your real trades for patterns such as overtrading, revenge entries, session drift and oversized risk. It needs a synced account and at least 20 closed trades so its observations are grounded in evidence.
          </StatusCard>
        </div>
      </div>
    </>
  );
}
