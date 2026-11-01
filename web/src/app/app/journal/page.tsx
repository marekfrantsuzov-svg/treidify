import Link from "next/link";
import { and, eq, inArray } from "drizzle-orm";
import { AccountPicker } from "@/components/app/account-picker";
import { JournalFilters } from "@/components/app/journal/journal-filters";
import { JournalTable, type JournalRow } from "@/components/app/journal/journal-table";
import { PnlCalendar, type CalNote } from "@/components/app/journal/pnl-calendar";
import { Tile } from "@/components/app/performance/parts";
import { PageHeader, StatusCard } from "@/components/app/status";
import { GlassIcon } from "@/components/icons/glass-icon";
import { Glass } from "@/components/ui/glass";
import { SampleBadge } from "@/components/ui/pill";
import { inRange, netOf, performanceMetrics, periodRange, sessionAt, SESSIONS } from "@/lib/analytics";
import { cn } from "@/lib/cn";
import { fmtNumber, fmtSignedMoney } from "@/lib/format";
import { PERIOD_NAMES, readPeriod } from "@/lib/period-param";
import { accountOverview, listAccounts } from "@/server/account-data";
import { db, schema } from "@/server/db";
import { requireOnboarded } from "@/server/session";

export const metadata = { title: "Trading Journal" };

const PAGE = 25;
type SP = { account?: string; period?: string; from?: string; to?: string; symbol?: string; side?: string; outcome?: string; session?: string; notes?: string; page?: string };

const holdLabel = (sec: number) => (sec < 3600 ? `${Math.max(1, Math.round(sec / 60))}m` : sec < 86_400 ? `${fmtNumber(sec / 3600, 1)}h` : `${fmtNumber(sec / 86_400, 1)}d`);

export default async function Journal({ searchParams }: { searchParams: Promise<SP> }) {
  const s = await requireOnboarded("/app/journal");
  const sp = await searchParams;
  const accounts = await listAccounts(s.user.id);
  const o = await accountOverview(s.user.id, sp.account, accounts);
  const tz = s.profile.timezone;

  if (!o) {
    return (
      <>
        <PageHeader title="Trading Journal" subtitle="Every closed trade, recorded automatically from your account." />
        <div className="grid gap-4">
          <PnlCalendar trades={[]} tz={tz} connected={false} nowIso={new Date().toISOString()} />
          <StatusCard title="Your journal" icon={<GlassIcon name="journal" size={32} />} status="Needs account" action={{ href: "/app/accounts", label: "Connect an account or load the demo" }}>
            Once your MetaTrader account is connected, each closed trade appears here with its session, holding time, costs and result. You add notes, setup and mistake tags and lessons; the coach reads them alongside the numbers.
          </StatusCard>
        </div>
      </>
    );
  }

  const period = readPeriod(sp);
  const range = periodRange(period.id, new Date(), tz, period.custom);
  const sessionOf = (t: { openTime: number }) => sessionAt(new Date(t.openTime * 1000)) ?? "off";
  const inPeriod = o.trades.filter((t) => inRange(t, range));

  // Notes for every trade in the period, so the "with notes" filter works across pages. Owner-scoped.
  const ids = inPeriod.map((t) => t.id);
  const entries = ids.length
    ? await db.select().from(schema.journalEntry).where(and(eq(schema.journalEntry.userId, s.user.id), inArray(schema.journalEntry.closedTradeId, ids)))
    : [];
  const byTrade = new Map(entries.map((e) => [e.closedTradeId!, e]));
  const reviewed = (id: string) => { const e = byTrade.get(id); return !!e && (!!e.notes || !!e.lessons || e.setupTags.length > 0 || e.mistakeTags.length > 0); };

  const filtered = inPeriod
    .filter((t) => (!sp.symbol || t.symbol === sp.symbol)
      && (!sp.side || t.side === sp.side)
      && (!sp.outcome || (sp.outcome === "win" ? netOf(t) > 0 : netOf(t) < 0))
      && (!sp.session || sessionOf(t) === sp.session)
      && (!sp.notes || (sp.notes === "with" ? reviewed(t.id) : !reviewed(t.id))))
    .sort((a, b) => b.closeTime - a.closeTime);

  const m = performanceMetrics(filtered);
  const pages = Math.max(1, Math.ceil(filtered.length / PAGE));
  const page = Math.min(pages, Math.max(1, Number(sp.page) || 1));
  const c = o.account.currency;
  const fmt = new Intl.DateTimeFormat("en-GB", { timeZone: tz, day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
  const rows: JournalRow[] = filtered.slice((page - 1) * PAGE, page * PAGE).map((t) => {
    const e = byTrade.get(t.id);
    const ses = sessionOf(t);
    return {
      id: t.id, symbol: t.symbol, side: t.side, volume: t.volume,
      closed: fmt.format(new Date(t.closeTime * 1000)),
      hold: holdLabel(t.closeTime - t.openTime),
      session: SESSIONS.find((x) => x.id === ses)?.name ?? "Off-session",
      net: fmtSignedMoney(netOf(t), c), up: netOf(t) >= 0,
      entry: e ? { notes: e.notes ?? "", lessons: e.lessons ?? "", setupTags: e.setupTags, mistakeTags: e.mistakeTags } : null,
    };
  });
  const symbols = [...new Set(o.trades.map((t) => t.symbol))].sort();
  // Notes for the calendar's day view: every closed trade of this account, owner-scoped.
  const allIds = o.trades.map((t) => t.id);
  const allEntries = allIds.length ? await db.select().from(schema.journalEntry).where(and(eq(schema.journalEntry.userId, s.user.id), inArray(schema.journalEntry.closedTradeId, allIds))) : [];
  const calNotes: Record<string, CalNote> = Object.fromEntries(allEntries.map((e) => [e.closedTradeId!, { notes: e.notes ?? "", lessons: e.lessons ?? "", setupTags: e.setupTags, mistakeTags: e.mistakeTags }]));
  const reviewedCount = filtered.filter((t) => reviewed(t.id)).length;
  const href = (p: number) => { const q = new URLSearchParams(Object.entries(sp).filter(([, v]) => typeof v === "string") as [string, string][]); q.set("page", String(p)); return `?${q}`; };

  return (
    <>
      <PageHeader title="Trading Journal" subtitle={<>{PERIOD_NAMES[period.id]} · {o.account.label}{o.account.source === "sample" && <SampleBadge label="Sample account" className="ml-2 align-middle" />}</>}>
        <AccountPicker accounts={accounts.map((a) => ({ id: a.id, label: a.label }))} selected={o.account.id} />
      </PageHeader>
      <div className="grid gap-4">
        <PnlCalendar trades={o.trades} notes={calNotes} currency={c} tz={tz} connected sampleAccount={o.account.source === "sample"} nowIso={new Date().toISOString()} />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
          <Tile label="Trades" value={String(m.tradeCount)} sub={`${m.wins}W · ${m.losses}L`} />
          <Tile label="Win rate" value={m.winRate === null ? "—" : `${(m.winRate * 100).toFixed(1)}%`} />
          <Tile label="Net" value={fmtSignedMoney(m.netProfit, c, 0)} tone={m.netProfit > 0 ? "up" : m.netProfit < 0 ? "down" : undefined} />
          <Tile label="Profit factor" value={m.profitFactor === null ? "—" : fmtNumber(m.profitFactor)} />
          <Tile label="Reviewed" value={`${reviewedCount} / ${filtered.length}`} sub="trades with notes or tags" />
        </div>
        <JournalFilters symbols={symbols} />
        <Glass className="overflow-hidden p-0">
          <JournalTable rows={rows} />
        </Glass>
        {pages > 1 && (
          <nav aria-label="Journal pages" className="flex items-center justify-center gap-2 text-sm">
            <Link aria-disabled={page === 1} href={href(page - 1)} className={cn("rounded-full px-3 py-1.5 font-medium text-accent hover:bg-accent-soft", page === 1 && "pointer-events-none opacity-40")}>Previous</Link>
            <span className="num text-ink-3">Page {page} of {pages}</span>
            <Link aria-disabled={page === pages} href={href(page + 1)} className={cn("rounded-full px-3 py-1.5 font-medium text-accent hover:bg-accent-soft", page === pages && "pointer-events-none opacity-40")}>Next</Link>
          </nav>
        )}
      </div>
    </>
  );
}
