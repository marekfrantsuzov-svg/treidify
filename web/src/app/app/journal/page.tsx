import Link from "next/link";
import { ChevronDown } from "lucide-react";
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
import { accountOverview, listAccounts, pickerOptions } from "@/server/account-data";
import { db, schema } from "@/server/db";
import { requireOnboarded } from "@/server/session";

export const metadata = { title: "Trading Journal" };

const PAGE = 25;
type SP = { account?: string; period?: string; from?: string; to?: string; symbol?: string; side?: string; outcome?: string; session?: string; notes?: string; page?: string; q?: string };

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

  const q = (sp.q ?? "").trim().toLowerCase().slice(0, 80);
  const matches = (t: { id: string; symbol: string }) => {
    if (!q) return true;
    const e = byTrade.get(t.id);
    return [t.symbol, e?.notes, e?.lessons, ...(e?.setupTags ?? []), ...(e?.mistakeTags ?? [])].some((x) => x?.toLowerCase().includes(q));
  };
  const filtered = inPeriod
    .filter((t) => matches(t) && (!sp.symbol || t.symbol === sp.symbol)
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
  const pageIds = rows.map((r) => r.id);
  const shots = pageIds.length ? await db.select({ id: schema.journalScreenshot.id, tradeId: schema.journalScreenshot.closedTradeId }).from(schema.journalScreenshot)
    .where(and(eq(schema.journalScreenshot.userId, s.user.id), inArray(schema.journalScreenshot.closedTradeId, pageIds))).orderBy(schema.journalScreenshot.createdAt) : [];
  const fmtFull = new Intl.DateTimeFormat("en-GB", { timeZone: tz, dateStyle: "medium", timeStyle: "short" });
  const byId = new Map(filtered.map((t) => [t.id, t]));
  const px = (v: number | undefined) => (!v ? "—" : fmtNumber(v, v >= 100 ? 2 : v >= 10 ? 3 : 5));
  for (const r of rows) {
    const t = byId.get(r.id)!;
    r.screenshots = shots.filter((x) => x.tradeId === r.id).map((x) => x.id);
    r.detail = { opened: fmtFull.format(new Date(t.openTime * 1000)), open: px(t.openPrice), close: px(t.closePrice), gross: fmtSignedMoney(t.profit, c), commission: fmtSignedMoney(t.commission, c), swap: fmtSignedMoney(t.swap, c), fees: fmtSignedMoney(t.fees, c), net: fmtSignedMoney(netOf(t), c), position: o.account.source === "sample" ? "sample" : t.id.slice(0, 8) };
  }
  const sums = filtered.reduce((a, t) => ({ gross: a.gross + t.profit, commission: a.commission + t.commission, swap: a.swap + t.swap, fees: a.fees + t.fees }), { gross: 0, commission: 0, swap: 0, fees: 0 });
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
        <AccountPicker accounts={pickerOptions(accounts)} selected={o.account.id} />
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
        <details className="more detail-panel">
          <summary><span className="min-w-0 flex-1">How these numbers are calculated</span><ChevronDown className="more-chev" aria-hidden /></summary>
          <div className="more-body grid gap-2 text-[13px] leading-relaxed text-ink-2">
            <p className="num">For the {filtered.length} trades shown: gross P&amp;L {fmtSignedMoney(sums.gross, c)} + commission {fmtSignedMoney(sums.commission, c)} + swap {fmtSignedMoney(sums.swap, c)} + fees {fmtSignedMoney(sums.fees, c)} = net {fmtSignedMoney(m.netProfit, c)}.</p>
            <p>Each row is one closed position rebuilt from your broker&apos;s deals by position ID. A position appears only once its closing volume equals its opening volume, so partial closes are combined into one trade instead of being counted twice. Deals are stored once per broker deal ID, so repeated syncs never duplicate them.</p>
            <p>A win is a trade whose net result (after commission, swap and fees) is above zero; a loss is below zero. Win rate = wins ÷ (wins + losses). Profit factor = gross profit of winners ÷ gross loss of losers, both after costs. Deposits, withdrawals, credits and bonuses are cash flows, never profit, and are excluded from every figure here. Days in the calendar use your time zone ({tz}).</p>
          </div>
        </details>
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
