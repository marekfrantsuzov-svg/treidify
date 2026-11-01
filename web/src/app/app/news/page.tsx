import Link from "next/link";
import { PageHeader } from "@/components/app/status";
import { EventList, HeadlineList } from "@/components/intel/news-list";
import { Glass } from "@/components/ui/glass";
import { cn } from "@/lib/cn";
import { economicCalendar, latestHeadlines } from "@/server/news/service";
import { requireOnboarded } from "@/server/session";

export const metadata = { title: "News & Calendar" };

export default async function News({ searchParams }: { searchParams: Promise<{ tab?: string; all?: string }> }) {
  const s = await requireOnboarded("/app/news");
  const sp = await searchParams;
  const tab = sp.tab === "calendar" ? "calendar" : "news";
  const now = new Date();
  const tz = s.profile.timezone;
  const [news, cal] = await Promise.all([
    tab === "news" ? latestHeadlines(40) : Promise.resolve(null),
    economicCalendar(new Date(now.getTime() - 86_400_000), new Date(now.getTime() + 7 * 86_400_000)),
  ]);
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
          <Glass className="p-4 sm:p-5"><HeadlineList r={news} limit={40} nowMs={now.getTime()} />
            <p className="mt-3 px-2 text-[11px] text-ink-3">Headlines link to the original publisher. Instrument and importance tags are automatic keyword rules, not editorial judgement.</p></Glass>
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
