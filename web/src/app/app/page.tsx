import { and, count, desc, eq, isNull, ne, or } from "drizzle-orm";
import { AccountOverview } from "@/components/app/dashboard/account-overview";
import { HealthStrip } from "@/components/app/dashboard/health-strip";
import { GoldDesk } from "@/components/app/dashboard/gold-desk";
import { CalendarCard, CommunityCard, ImpactCard, MacroCard, NewsCard, OverviewCard, type CalItem, type Feed, type MacroTile, type NewsItem } from "@/components/app/dashboard/dash-cards";
import { MobileGreeting } from "@/components/app/dashboard/hero";
import { PositionsCard, RecentTradesCard } from "@/components/app/dashboard/cards";
import { Reveal, RevealItem } from "@/components/motion/reveal";
import { AccountPicker } from "@/components/app/account-picker";
import { Alert } from "@/components/auth/auth-ui";
import { TRIAL_HOURS } from "@/config/plans";
import { goldImpact } from "@/lib/intelligence";
import { ANALYSTS } from "@/lib/community/analysts";
import { greetingFor } from "@/lib/greeting";
import { readPeriod } from "@/lib/period-param";
import { accountOverview, listAccounts, pickerOptions } from "@/server/account-data";
import { db, schema } from "@/server/db";
import { getPlanState } from "@/server/entitlements";
import { loadIntel } from "@/server/market/load";
import { marketOverview } from "@/server/market/overview";
import { economicCalendar, latestHeadlines } from "@/server/news/service";
import { macroEvidence, macroIndicators } from "@/server/macro/service";
import { requireOnboarded } from "@/server/session";

export const metadata = { title: "Dashboard" };

const DAY = 86_400_000;

/** Latest official US value per macro tile (FRED: Federal Reserve, BLS, BEA). */
function macroTiles(m: Awaited<ReturnType<typeof macroIndicators>>): MacroTile[] {
  return [
    { id: "rates", label: "Rates", value: m.rates.value, note: m.rates.ok ? m.rates.measure : m.rates.message },
    { id: "inflation", label: "Inflation", value: m.inflation.value, note: m.inflation.ok ? `CPI y/y · ${m.inflation.period}` : m.inflation.message },
    { id: "gdp", label: "GDP", value: m.gdp.value, note: m.gdp.ok ? `Real GDP · ${m.gdp.period}` : m.gdp.message },
  ];
}

/** Members and the faces of recent posters (virtual analysts are drawn with their own clearly labelled colours). */
async function community() {
  const [[{ n } = { n: 0 }], recent] = await Promise.all([
    db.select({ n: count() }).from(schema.user).where(and(or(isNull(schema.user.role), ne(schema.user.role, "virtual_analyst")), or(isNull(schema.user.banned), eq(schema.user.banned, false)))),
    db.select({ id: schema.user.id, name: schema.user.name, image: schema.user.image, role: schema.user.role })
      .from(schema.post).innerJoin(schema.user, eq(schema.post.authorId, schema.user.id))
      .where(eq(schema.post.status, "visible"))
      .orderBy(desc(schema.post.createdAt)).limit(12),
  ]);
  const seen = new Set<string>();
  const faces = recent.filter((r) => (seen.has(r.id) ? false : (seen.add(r.id), true))).slice(0, 3).map((r) => {
    const a = r.role === "virtual_analyst" ? ANALYSTS.find((x) => x.name === r.name) : undefined;
    return { id: r.id, name: r.name, image: r.image, hue: a?.hue ?? null };
  });
  return { members: n, faces };
}

/**
 * Dashboard (reference 1, approved): Account Health and four metrics, the XAUUSD chart with AI analysis, news, the
 * qualitative gold read, Macro Desk, Market Overview, Economic Calendar and Community. Below: equity curve,
 * statistics, open positions and recent trades.
 */
export default async function Dashboard({ searchParams }: { searchParams: Promise<{ account?: string; welcome?: string; period?: string; from?: string; to?: string }> }) {
  const s = await requireOnboarded("/app");
  const sp = await searchParams;
  const accounts = await listAccounts(s.user.id);
  const [overview, plan] = await Promise.all([accountOverview(s.user.id, sp.account, accounts), getPlanState(s.user.id)]);
  const tz = s.profile.timezone;
  const period = readPeriod(sp);
  const now = new Date();
  const nowMs = now.getTime();
  const nowIso = now.toISOString();
  const sample = overview?.account.source === "sample";
  const [intel, news, cal, rows, comm, macro] = await Promise.all([
    loadIntel(),
    latestHeadlines(20),
    economicCalendar(new Date(nowMs - DAY), new Date(nowMs + 4 * DAY)),
    marketOverview(),
    community(),
    macroIndicators(),
  ]);

  const newsFeed: Feed<NewsItem> = news.ok ? { ok: true, vendor: news.vendor, data: news.data } : { ok: false, message: news.message, needs: news.needs };
  const upcoming = cal.ok ? cal.data.filter((e) => Date.parse(e.at) >= nowMs - 60 * 60_000 && e.importance !== "low").sort((a, b) => Date.parse(a.at) - Date.parse(b.at)) : [];
  const calFeed: Feed<CalItem> = cal.ok ? { ok: true, vendor: cal.vendor, data: upcoming.slice(0, 6) } : { ok: false, message: cal.message, needs: cal.needs };
  const recentCal = cal.ok ? cal.data.filter((e) => Date.parse(e.at) >= nowMs - 2 * DAY) : [];
  const impact = goldImpact(intel.gold, intel.dxy, news.ok ? news.data : [], recentCal, now, {
    market: { mode: intel.mode, freshness: intel.freshness, vendor: intel.vendor, asOf: intel.asOf },
    macro: macroEvidence(macro), macroOk: macro.rates.ok && macro.inflation.ok, newsOk: news.ok, calendarOk: cal.ok,
  });
  const state = !overview ? "none" : sample ? "sample" : overview.account.status === "connected" ? "connected" : "pending";
  const acct = {
    state, label: overview ? `${overview.account.label}${overview.account.broker ? ` · ${overview.account.broker}` : ""}` : "Not connected",
    currency: overview?.account.currency ?? "USD", balance: overview?.balance ?? null, equity: overview?.equity ?? null, floating: overview?.floating ?? null,
    snapshotAt: overview?.snapshotAt ?? null, startingEquity: overview?.startingEquity ?? 0, trades: overview?.trades ?? [], timezone: tz,
    period: period.id, custom: period.custom, nowIso,
  } as const;

  return (
    <>
      <MobileGreeting greeting={greetingFor(tz)} name={s.user.name.split(" ")[0] ?? ""} />
      {(sp.welcome || intel.message || (accounts.length > 1 && overview)) && (
        <div className="mb-3 grid gap-2">
          {sp.welcome && (
            <Alert tone="accent">
              {sp.welcome === "trial" && plan.source === "trial"
                ? `Welcome to Treidify. Your ${TRIAL_HOURS}-hour Premium trial is active and ends on its own, with nothing to cancel.`
                : "Welcome to Treidify. Your account is ready."}
            </Alert>
          )}
          {intel.message && <p className="rounded-xl bg-warn-soft px-3 py-1.5 text-[11.5px] leading-snug text-ink-2 sm:px-3.5 sm:text-[12px]">{intel.message}</p>}
          {accounts.length > 1 && overview && <div className="flex justify-end"><AccountPicker accounts={pickerOptions(accounts)} selected={overview.account.id} /></div>}
        </div>
      )}

      <div className="d-grid">
        <HealthStrip {...acct} />
        <GoldDesk initial={intel} />
        <NewsCard feed={newsFeed} nowMs={nowMs} />
        <ImpactCard impact={impact} nowMs={nowMs} />
        <MacroCard tiles={macroTiles(macro)} />
        <OverviewCard rows={rows} />
        <CalendarCard feed={calFeed} tz={tz} nowMs={nowMs} />
        <CommunityCard members={comm.members} faces={comm.faces} />
      </div>

      <Reveal className="dash-grid d-lower">
        <AccountOverview {...acct} aside={
          <RecentTradesCard
              rows={(overview?.trades ?? []).slice(-5).reverse().map((t) => ({ id: t.id, symbol: t.symbol, side: t.side, net: t.profit + t.commission + t.swap + t.fees, closeTime: new Date(t.closeTime * 1000).toISOString() }))}
              currency={overview?.account.currency ?? "USD"}
              sample={sample}
              nowIso={nowIso}
            />
        } />
        <RevealItem className="span-12">
          <PositionsCard
            rows={(overview?.positions ?? []).map((p) => ({ id: p.id, symbol: p.symbol, side: p.side, volume: p.volume, openPrice: p.openPrice, currentPrice: p.currentPrice, floatingPnl: p.floatingPnl, stopLoss: p.stopLoss, takeProfit: p.takeProfit }))}
            currency={overview?.account.currency ?? "USD"}
            sample={sample}
            connected={!!overview}
          />
        </RevealItem>
      </Reveal>
    </>
  );
}
