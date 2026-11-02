import { ArrowLeft, ExternalLink, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { NewsBrief } from "@/components/news/news-brief";
import { NewsThumb } from "@/components/news/news-thumb";
import { NEWS_CATEGORIES } from "@/server/news/classify";
import { aiStatus } from "@/server/ai/claude";
import { paragraphs } from "@/lib/news/sanitize";
import { headlineById, latestHeadlines } from "@/server/news/service";
import { requireOnboarded } from "@/server/session";
import { cn } from "@/lib/cn";

export const metadata = { title: "Article" };

const host = (u: string) => { try { return new URL(u).hostname.replace(/^www\./, ""); } catch { return null; } };
/** Words that mark a claim as extraordinary or unconfirmed; such headlines get an explicit "reported, unverified" note. */
const STRONG = /\b(crash|collapse|plunge|soar|skyrocket|record|unprecedented|historic|panic|default|war|emergency|shock|bombshell|exclusive|breaking|rumou?r|reportedly|sources say)\b/i;

/**
 * Article view: headline, publisher, time, image and the publisher's own summary as plain text (sanitized; no
 * markup from the feed is rendered). The full article is not republished: the summary is what the feed licenses for
 * display, and the original is one tap away.
 */
export default async function Article({ params }: { params: Promise<{ id: string }> }) {
  const s = await requireOnboarded("/app/news");
  const { id } = await params;
  const tz = s.profile.timezone;
  const r = await headlineById(decodeURIComponent(id));
  const n = r.ok ? r.item : null;
  const back = <Link href="/app/news" className="mb-4 inline-flex items-center gap-1.5 text-[13px] font-medium text-accent hover:underline"><ArrowLeft className="h-4 w-4" />All news</Link>;
  if (!n) {
    return (
      <div className="mx-auto max-w-[720px]">
        {back}
        <div className="dcard dcard-pad text-[14px] leading-relaxed text-ink-2">
          {r.ok ? "This story is no longer in the latest feed (only the last 72 hours are kept), so it can't be shown. Nothing is shown from memory." : r.message}
        </div>
      </div>
    );
  }
  const related = (await latestHeadlines(40));
  const more = related.ok ? related.data.filter((h) => h.id !== n.id && h.instruments.some((i) => n.instruments.includes(i))).slice(0, 4) : [];
  const published = new Date(n.publishedAt);
  const cat = NEWS_CATEGORIES.filter((c) => (n.categories as string[]).includes(c.id));
  const domain = host(n.url);
  const paras = paragraphs(n.summary);
  return (
    <article className="mx-auto max-w-[720px]">
      {back}
      <header>
        <div className="flex flex-wrap items-center gap-1.5 text-[12px]">
          {n.breaking && <span className="rounded-full bg-down px-2 py-0.5 font-semibold text-white">Breaking</span>}
          {cat.map((c) => <span key={c.id} className="rounded-full bg-[var(--surface-inset)] px-2 py-0.5 font-medium text-ink-2">{c.label}</span>)}
          {n.instruments.slice(0, 4).map((i) => <span key={i} className="rounded-full bg-accent-soft px-2 py-0.5 font-semibold text-accent">{i}</span>)}
          {n.instruments.length > 4 && <span className="rounded-full bg-accent-soft px-2 py-0.5 font-semibold text-accent" title={n.instruments.slice(4).join(", ")}>+{n.instruments.length - 4}</span>}
        </div>
        <h1 className="mt-3 text-balance text-[24px] font-semibold leading-[1.2] tracking-[-0.025em] text-ink sm:text-[32px]">{n.title}</h1>
        <p className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 text-[13px] text-ink-3">
          <span className="font-semibold text-ink-2">{n.source}</span>
          <span aria-hidden>·</span>
          <time dateTime={n.publishedAt}>{published.toLocaleString("en-GB", { timeZone: tz, weekday: "short", day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}</time>
          <span className="text-ink-3">({tz})</span>
        </p>
      </header>
      <NewsThumb src={n.image} category={n.categories[0]} priority className="mt-5 aspect-[16/9] w-full rounded-2xl" />
      <div className="mt-5 grid gap-3 text-[16px] leading-[1.7] text-ink-2">
        {paras.length ? paras.map((p, k) => <p key={k}>{p}</p>) : <p className="text-ink-3">The publisher did not include a summary. Read the full story at the source.</p>}
      </div>
      <a href={n.url} target="_blank" rel="noopener noreferrer nofollow" className="press bg-brand mt-6 inline-flex h-11 items-center gap-2 rounded-full px-5 text-[14px] font-semibold text-white">
        Read the original article{domain ? ` on ${domain}` : ""}<ExternalLink className="h-4 w-4" />
      </a>
      <div className={cn("mt-6 flex gap-2.5 rounded-2xl border border-line px-4 py-3 text-[12.5px] leading-relaxed text-ink-3")}>
        <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-ink-2" />
        <p>
          Headline and summary as published by <b className="font-semibold text-ink-2">{n.source}</b>, delivered by {r.ok ? r.vendor : "the news feed"} with the publisher&rsquo;s own timestamp. Treidify shows the summary only; the full article belongs to the publisher.
          {STRONG.test(n.title) ? " This is a report from one outlet; Treidify has not independently confirmed it, so treat strong claims as reported, not established." : " Treidify has not independently verified the report."} Topic and impact tags are automatic keyword rules.
        </p>
      </div>
      {aiStatus().configured && n.importance !== "low" && <div className="mt-4 -ml-5"><NewsBrief id={n.id} enabled /></div>}
      {more.length > 0 && (
        <section className="mt-8" aria-labelledby="more-title">
          <h2 id="more-title" className="text-[15px] font-semibold text-ink">Related headlines</h2>
          <ul className="mt-2 grid gap-1">
            {more.map((h) => (
              <li key={h.id}><Link href={`/app/news/${encodeURIComponent(h.id)}`} className="flex gap-3 rounded-2xl px-2 py-2 hover:bg-inset">
                <NewsThumb src={h.image} category={h.categories[0]} className="h-12 w-12" />
                <span className="min-w-0"><span className="line-clamp-2 text-[13.5px] font-semibold leading-snug text-ink">{h.title}</span><span className="text-[11.5px] text-ink-3">{h.source}</span></span>
              </Link></li>
            ))}
          </ul>
        </section>
      )}
    </article>
  );
}
