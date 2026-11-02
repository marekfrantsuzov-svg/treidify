import Link from "next/link";
import { PageHeader } from "@/components/app/status";
import { EventList, HeadlineList } from "@/components/intel/news-list";
import { Glass } from "@/components/ui/glass";
import { cn } from "@/lib/cn";
import { economicCalendar, latestHeadlines } from "@/server/news/service";
import { NEWS_CATEGORIES } from "@/server/news/classify";
import { aiStatus } from "@/server/ai/claude";
import { inputClass } from "@/components/auth/auth-ui";
import { requireOnboarded } from "@/server/session";

export const metadata = { title: "News & Calendar" };

export default async function News({ searchParams }: { searchParams: Promise<{ tab?: string; all?: string; q?: string; symbol?: string; cat?: string; imp?: string }> }) {
  const s = await requireOnboarded("/app/news");
  const sp = await searchParams;
  const tab = sp.tab === "calendar" ? "calendar" : "news";
  const now = new Date();
  const tz = s.profile.timezone;
  const [news, cal] = await Promise.all([
    tab === "news" ? latestHeadlines(80) : Promise.resolve(null),
    economicCalendar(new Date(now.getTime() - 86_400_000), new Date(now.getTime() + 7 * 86_400_000)),
  ]);
  const q = (sp.q ?? "").trim().toLowerCase().slice(0, 80);
  const filtering = !!(q || sp.symbol || sp.cat || sp.imp);
  const shown = news && news.ok ? { ...news, data: news.data.filter((n) => (!q || `${n.title} ${n.summary} ${n.source}`.toLowerCase().includes(q))
    && (!sp.symbol || n.instruments.includes(sp.symbol)) && (!sp.cat || (n.categories as string[]).includes(sp.cat)) && (!sp.imp || n.importance === sp.imp)) } : news;
  const symbols = news && news.ok ? [...new Set(news.data.flatMap((n) => n.instruments))].sort() : [];
  const tabCls = (on: boolean) => cn("rounded-full px-4 py-1.5 text-[13px] font-semibold transition-colors", on ? "bg-[var(--surface-strong)] text-ink shadow-[var(--shadow)]" : "text-ink-3 hover:text-ink");
  return (
    <>
      <PageHeader title="News & Calendar" subtitle="Real headlines with source, time and link; scheduled releases with forecast and previous.">
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
          <Glass className="p-4 sm:p-5"><h2 className="mb-2 text-[15px] font-semibold text-ink">Next important events</h2><EventList r={cal} tz={tz} limit={8} /></Glass>
        </div>
      ) : (
        <Glass className="p-4 sm:p-5">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2"><h2 className="text-[15px] font-semibold text-ink">Yesterday to the next 7 days</h2>
            <Link href={sp.all ? "/app/news?tab=calendar" : "/app/news?tab=calendar&all=1"} className="text-xs font-medium text-accent hover:underline">{sp.all ? "High and medium impact only" : "Show low impact too"}</Link></div>
          <EventList r={cal} tz={tz} limit={200} onlyImportant={!sp.all} />
          <p className="mt-3 px-1 text-[11px] text-ink-3">Times in {tz}. Tracked releases include CPI, PPI, NFP, FOMC, rate decisions, PCE, GDP and central-bank speeches. Change your time zone in Settings.</p>
        </Glass>
      )}
    </>
  );
}
