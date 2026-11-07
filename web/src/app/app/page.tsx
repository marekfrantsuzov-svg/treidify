import { and, count, desc, eq, isNull, ne, or } from "drizzle-orm";
import { Suspense, cache } from "react";
import { AccountOverview } from "@/components/app/dashboard/account-overview";
import { HealthStrip } from "@/components/app/dashboard/health-strip";
import { GoldDesk } from "@/components/app/dashboard/gold-desk";
import { CalendarCard, CommunityCard, ImpactCard, MacroCard, NewsCard, OverviewCard, type CalItem, type Feed, type MacroTile, type NewsItem } from "@/components/app/dashboard/dash-cards";
import { MobileGreeting } from "@/components/app/dashboard/hero";
import { PositionsCard, RecentTradesCard } from "@/components/app/dashboard/cards";
import { Reveal, RevealItem } from "@/components/motion/reveal";
import { AccountPicker } from "@/components/app/account-picker";
import { Alert } from "@/components/auth/auth-ui";
import { goldImpact } from "@/lib/intelligence";
import { ANALYSTS } from "@/lib/community/analysts";
import { greetingFor } from "@/lib/greeting";
import { readPeriod } from "@/lib/period-param";
import { ALL_ACCOUNTS, accountOverview, listAccounts, pickerOptions } from "@/server/account-data";
import { liveRefresh } from "@/server/sync/service";
import { LiveAccountProvider } from "@/components/app/live/live-account";
import { ConnectionBar } from "@/components/app/live/connection-bar";
import { db, schema } from "@/server/db";
import { getPlanState, planHas } from "@/server/entitlements";
import Link from "next/link";
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

// Shared per request: every streamed section asks for what it needs and identical calls run once.
const getIntel = cache(() => loadIntel());
const getNews = cache(() => latestHeadlines(20));
const getCal = cache((fromMs: number, toMs: number) => economicCalendar(new Date(fromMs), new Date(toMs)));
const getMacro = cache(() => macroIndicators());
const getOverview = cache(() => marketOverview());

/** Premium-only card on a plan without it: the card keeps its place and says how to get it. */
function Locked({ area, title }: { area: string; title: string }) {
  return (
    <section className={`dcard dcard-pad ${area} flex flex-col`} aria-label={`${title} (Premium)`}>
      <h2 className="dcard-title">{title}</h2>
      <p className="mt-3 text-[13px] leading-snug text-ink-2">Part of Premium.</p>
      <Link href="/app/settings/plan" className="mt-auto pt-3 text-[13px] font-semibold text-accent">See plans</Link>
    </section>
  );
}

/** A placeholder with the section's own grid area and height, so nothing shifts when it streams in. */
function Slot({ area, h }: { area: string; h: number }) {
  return <div className={`dcard ${area} skeleton`} style={{ minHeight: h }} aria-busy="true" aria-label="Loading" />;
}

async function ChartSection() {
  return <GoldDesk initial={await getIntel()} />;
}

async function NewsSection({ nowMs }: { nowMs: number }) {
  const news = await getNews();
  const feed: Feed<NewsItem> = news.ok ? { ok: true, vendor: news.vendor, data: news.data } : { ok: false, message: news.message, needs: news.needs };
  return <NewsCard feed={feed} nowMs={nowMs} />;
}

async function ImpactSection({ nowMs, dayMs }: { nowMs: number; dayMs: number }) {
  const [intel, news, cal, macro] = await Promise.all([getIntel(), getNews(), getCal(dayMs - DAY, dayMs + 4 * DAY), getMacro()]);
  const now = new Date(nowMs);
  const recentCal = cal.ok ? cal.data.filter((e) => Date.parse(e.at) >= nowMs - 2 * DAY) : [];
  const impact = goldImpact(intel.gold, intel.dxy, news.ok ? news.data : [], recentCal, now, {
    market: { mode: intel.mode, freshness: intel.freshness, vendor: intel.vendor, asOf: intel.asOf },
    macro: macroEvidence(macro), macroOk: macro.rates.ok && macro.inflation.ok, newsOk: news.ok, calendarOk: cal.ok,
  });
  return <ImpactCard impact={impact} nowMs={nowMs} />;
}

async function MacroSection() {
  return <MacroCard tiles={macroTiles(await getMacro())} />;
}

async function OverviewSection() {
  return <OverviewCard rows={await getOverview()} />;
}

async function CalendarSection({ nowMs, dayMs, tz }: { nowMs: number; dayMs: number; tz: string }) {
  const cal = await getCal(dayMs - DAY, dayMs + 4 * DAY);
  const upcoming = cal.ok ? cal.data.filter((e) => Date.parse(e.at) >= nowMs - 60 * 60_000 && e.importance !== "low").sort((a, b) => Date.parse(a.at) - Date.parse(b.at)) : [];
  const feed: Feed<CalItem> = cal.ok ? { ok: true, vendor: cal.vendor, data: upcoming.slice(0, 6) } : { ok: false, message: cal.message, needs: cal.needs };
  return <CalendarCard feed={feed} tz={tz} nowMs={nowMs} />;
}

async function CommunitySection() {
  const comm = await community();
  return <CommunityCard members={comm.members} faces={comm.faces} />;
}

async function IntelNotice() {
  const intel = await getIntel();
  return intel.message ? <p className="mb-3 rounded-xl bg-warn-soft px-3 py-1.5 text-[11.5px] leading-snug text-ink-2 sm:px-3.5 sm:text-[12px]">{intel.message}</p> : null;
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
  // The calendar window is keyed to the hour so the per-request cache and the provider cache line up.
  const dayMs = Math.floor(nowMs / 3_600_000) * 3_600_000;
  const liveId = overview && overview.account.source === "provider" && overview.account.id !== ALL_ACCOUNTS ? overview.account.id : null;
  const initialLive = liveId ? await liveRefresh(s.user.id, liveId, now, false) : null;
  const state = !overview ? "none" : sample ? "sample" : overview.account.status === "connected" ? "connected" : "pending";
  const acct = {
    state, label: overview ? `${overview.account.label}${overview.account.broker ? ` · ${overview.account.broker}` : ""}` : "Not connected",
    currency: overview?.account.currency ?? "USD", balance: overview?.balance ?? null, equity: overview?.equity ?? null, floating: overview?.floating ?? null,
    snapshotAt: overview?.snapshotAt ?? null, startingEquity: overview?.startingEquity ?? 0, trades: overview?.trades ?? [], timezone: tz,
    period: period.id, custom: period.custom, nowIso,
  } as const;

  return (
    <LiveAccountProvider accountId={liveId} initial={initialLive}>
      <MobileGreeting greeting={greetingFor(tz)} name={s.user.name.split(" ")[0] ?? ""} />
      {liveId && <div className="mb-3"><ConnectionBar label={overview!.account.label} platform={overview!.account.platform} /></div>}
      <Suspense fallback={null}><IntelNotice /></Suspense>
      {(sp.welcome || (accounts.length > 1 && overview)) && (
        <div className="mb-3 grid gap-2">
          {sp.welcome && (
            <Alert tone="accent">
              {plan.trialEndsAt
                ? `Welcome to Treidify. Your ${plan.plan === "premium" ? "Premium" : "Essential"} trial is active until ${plan.trialEndsAt.toLocaleDateString("en-GB", { day: "numeric", month: "short" })}.`
                : "Welcome to Treidify. Your account is ready."}
            </Alert>
          )}
          {accounts.length > 1 && overview && <div className="flex justify-end"><AccountPicker accounts={pickerOptions(accounts)} selected={overview.account.id} /></div>}
        </div>
      )}

      <div className="d-grid">
        <HealthStrip {...acct} />
        <Suspense fallback={<><Slot area="d-chart" h={420} /><Slot area="d-ai" h={260} /></>}><ChartSection /></Suspense>
        {planHas(plan.plan, "news.global") ? <Suspense fallback={<Slot area="d-news" h={260} />}><NewsSection nowMs={nowMs} /></Suspense> : <Locked area="d-news" title="Market News" />}
        {planHas(plan.plan, "news.global") ? <Suspense fallback={<Slot area="d-impact" h={200} />}><ImpactSection nowMs={nowMs} dayMs={dayMs} /></Suspense> : <Locked area="d-impact" title="News Impact on Gold" />}
        {planHas(plan.plan, "macro.advanced") ? <Suspense fallback={<Slot area="d-macro" h={200} />}><MacroSection /></Suspense> : <Locked area="d-macro" title="Macro Desk" />}
        <Suspense fallback={<Slot area="d-overview" h={220} />}><OverviewSection /></Suspense>
        <Suspense fallback={<Slot area="d-calendar" h={180} />}><CalendarSection nowMs={nowMs} dayMs={dayMs} tz={tz} /></Suspense>
        <Suspense fallback={<Slot area="d-community" h={160} />}><CommunitySection /></Suspense>
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
    </LiveAccountProvider>
  );
}
