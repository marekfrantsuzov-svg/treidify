import Link from "next/link";
import { PageHeader } from "@/components/app/status";
import { EventList, HeadlineList } from "@/components/intel/news-list";
import { CalendarView, type Range, type Reaction } from "@/components/intel/calendar-view";
import { measuredReaction } from "@/lib/intelligence/reaction";
import { getSeries } from "@/server/market/service";
import { Glass } from "@/components/ui/glass";
import { cn } from "@/lib/cn";
import { economicCalendar, latestHeadlines } from "@/server/news/service";
import { NEWS_CATEGORIES } from "@/server/news/classify";
import { aiStatus } from "@/server/ai/claude";
import { inputClass } from "@/components/auth/auth-ui";
import { requireOnboarded } from "@/server/session";

export const metadata = { title: "News & Calendar" };

export default async function News({ searchParams }: { searchParams: Promise<{ tab?: string; all?: string; q?: string; symbol?: string; cat?: string; imp?: string; range?: string; cur?: string }> }) {
  const s = await requireOnboarded("/app/news");
  const sp = await searchParams;
  const tab = sp.tab === "calendar" ? "calendar" : "news";
  const now = new Date();
  const tz = s.profile.timezone;
  const [news, cal] = await Promise.all([
    tab === "news" ? latestHeadlines(80) : Promise.resolve(null),
    economicCalendar(new Date(now.getTime() - 8 * 86_400_000), new Date(now.getTime() + 9 * 86_400_000)),
  ]);
  const range: Range = (["today", "tomorrow", "week", "recent"] as const).find((x) => x === sp.range) ?? "week";
  // Measured gold reaction after recent high-impact releases, from the same saved 15-minute bars the dashboard uses.
  const reactions: Record<string, Reaction> = {};
  if (tab === "calendar" && cal.ok && cal.data.some((e) => e.status === "released" && e.importance === "high")) {
    const bars = await getSeries("XAUUSD", "15M", 400, now);
    if (bars.ok) for (const e of cal.data) {
      if (e.status !== "released" || e.importance !== "high") continue;
      const m = measuredReaction(bars.candles, 900, Date.parse(e.at));
      if (m) reactions[e.id] = { change: m.change, pips: m.pips, endAt: m.endAt };
    }
  }
  const q = (sp.q ?? "").trim().toLowerCase().slice(0, 80);
  const filtering = !!(q || sp.symbol || sp.cat || sp.imp);
  const shown = news && news.ok ? { ...news, data: news.data.filter((n) => (!q || `${n.title} ${n.summary} ${n.source}`.toLowerCase().includes(q))
    && (!sp.symbol || n.instruments.includes(sp.symbol)) && (!sp.cat || (n.categories as string[]).includes(sp.cat)) && (!sp.imp || n.importance === sp.imp)) } : news;
  const symbols = news && news.ok ? [...new Set(news.data.flatMap((n) => n.instruments))].sort() : [];
  const tabCls = (on: boolean) => cn("rounded-full px-4 py-1.5 text-[13px] font-semibold transition-colors", on ? "bg-[var(--surface-strong)] text-ink shadow-[var(--shadow)]" : "text-ink-3 hover:text-ink");
  return (
    <>
      <PageHeader title="News & Calendar" subtitle="Real headlines with source, time and link; official release schedule with actual and previous values.">
        <nav aria-label="Section" className="inset flex rounded-full p-1">
          <Link href="/app/news" className={tabCls(tab === "news")} aria-current={tab === "news" ? "page" : undefined}>Headlines</Link>
          <Link href="/app/news?tab=calendar" className={tabCls(tab === "calendar")} aria-current={tab === "calendar" ? "page" : undefined}>Economic calendar</Link>
        </nav>
      </PageHeader>
      {tab === "news" && news ? (
        <div className="grid gap-4 xl:grid-cols-[1.5fr_1fr]">
          <Glass className="p-4 sm:p-5">
            {news.ok && (
              <form method="get" className="mb-3 grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto_auto_auto_auto]" role="search" aria-label="Filter headlines">
                <input type="search" name="q" defaultValue={sp.q ?? ""} placeholder="Search headlines" aria-label="Search headlines" className={inputClass} />
                <select name="symbol" defaultValue={sp.symbol ?? ""} aria-label="Instrument" className={inputClass}><option value="">All instruments</option>{symbols.map((x) => <option key={x} value={x}>{x}</option>)}</select>
                <select name="cat" defaultValue={sp.cat ?? ""} aria-label="Category" className={inputClass}><option value="">All topics</option>{NEWS_CATEGORIES.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}</select>
                <select name="imp" defaultValue={sp.imp ?? ""} aria-label="Importance" className={inputClass}><option value="">Any importance</option><option value="high">High</option><option value="medium">Medium</option><option value="low">Low</option></select>
                <div className="flex items-center gap-2"><button type="submit" className="press rounded-full bg-[var(--accent)] px-4 py-2 text-[13px] font-semibold text-white">Filter</button>{filtering && <Link href="/app/news" className="text-xs font-medium text-accent hover:underline">Clear</Link>}</div>
              </form>
            )}
            {shown && <HeadlineList r={shown} limit={60} nowMs={now.getTime()} explain={aiStatus().configured} emptyText={filtering ? "No headlines match these filters in the last 72 hours." : "No headlines right now."} />}
            <p className="mt-3 px-2 text-[11px] text-ink-3">Headlines link to the original publisher; only stories from the last 72 hours are shown, and "Breaking" marks high-importance stories in their first hour. Instrument, topic and importance tags are automatic keyword rules, not editorial judgement. AI explanations are interpretation and are labelled as such.</p></Glass>
          <Glass className="p-4 sm:p-5"><h2 className="mb-2 text-[15px] font-semibold text-ink">Next important events</h2><EventList r={cal.ok ? { ...cal, data: cal.data.filter((e) => Date.parse(e.at) >= now.getTime() - 3600_000) } : cal} tz={tz} limit={8} /></Glass>
        </div>
      ) : (
        <Glass className="p-3 sm:p-5">
          <CalendarView r={cal} tz={tz} now={now.getTime()} range={range} cur={(sp.cur ?? "").slice(0, 3).toUpperCase()} imp={["high", "medium", "all"].includes(sp.imp ?? "") ? sp.imp! : "medium"} reactions={reactions} />
        </Glass>
      )}
    </>
  );
}
