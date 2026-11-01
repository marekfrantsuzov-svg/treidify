import { ArrowUpRight, CalendarClock, Newspaper } from "lucide-react";
import Link from "next/link";
import type { EconEvent, Headline, Result } from "@/server/news/service";
import { cn } from "@/lib/cn";
import { Glass } from "@/components/ui/glass";
import { Card, CardHeader } from "@/components/ui/card";

const imp = { high: "bg-down-soft text-down", medium: "bg-warn-soft text-warn", low: "bg-inset text-ink-3" } as const;
const ago = (iso: string, now: number) => { const m = Math.max(0, Math.round((now - Date.parse(iso)) / 60000)); return m < 60 ? `${m}m ago` : m < 1440 ? `${Math.round(m / 60)}h ago` : `${Math.round(m / 1440)}d ago`; };

function NotConnected({ what, needs }: { what: string; needs?: string[] }) {
  return <p className="rounded-2xl bg-inset px-4 py-4 text-sm text-ink-2">{what} is not connected, so nothing is shown here. No example headlines are used.{needs?.length ? <span className="mt-1 block text-xs text-ink-3">Needs: {needs.join(", ")}</span> : null}</p>;
}

export function HeadlineList({ r, limit = 6, nowMs, compact }: { r: Result<Headline[]>; limit?: number; nowMs: number; compact?: boolean }) {
  if (!r.ok) return r.reason === "not-configured" ? <NotConnected what="The news feed" needs={r.needs} /> : <p className="rounded-2xl bg-warn-soft px-4 py-3 text-sm text-ink">{r.message}</p>;
  if (!r.data.length) return <p className="text-sm text-ink-3">No headlines right now.</p>;
  return (
    <ul className="grid gap-1">
      {r.data.slice(0, limit).map((n) => (
        <li key={n.id}>
          <a href={n.url} target="_blank" rel="noopener noreferrer nofollow" className="group flex gap-3 rounded-2xl px-2 py-2.5 transition-colors hover:bg-inset">
            <span className={cn("mt-1 h-2 w-2 shrink-0 rounded-full", n.importance === "high" ? "bg-down" : n.importance === "medium" ? "bg-warn" : "bg-[var(--border-strong)]")} aria-hidden />
            <span className="min-w-0 flex-1">
              <span className="flex items-start gap-1 text-[13.5px] font-semibold leading-snug text-ink group-hover:text-accent">{n.title}<ArrowUpRight className="mt-0.5 h-3.5 w-3.5 shrink-0 opacity-0 transition-opacity group-hover:opacity-100" /></span>
              {!compact && n.summary && <span className="mt-0.5 line-clamp-2 block text-[12.5px] text-ink-3">{n.summary}</span>}
              <span className="mt-1 flex flex-wrap items-center gap-1.5 text-[11px] text-ink-3">
                <span className="font-medium text-ink-2">{n.source}</span><span>· {ago(n.publishedAt, nowMs)}</span>
                {n.instruments.map((i) => <span key={i} className="rounded-full bg-accent-soft px-1.5 py-px font-semibold text-accent">{i}</span>)}
                <span className={cn("rounded-full px-1.5 py-px font-semibold capitalize", imp[n.importance])}>{n.importance}</span>
              </span>
            </span>
          </a>
        </li>
      ))}
    </ul>
  );
}

export function EventList({ r, limit = 6, tz, onlyImportant = true }: { r: Result<EconEvent[]>; limit?: number; tz: string; onlyImportant?: boolean }) {
  if (!r.ok) return r.reason === "not-configured" ? <NotConnected what="The economic calendar" needs={r.needs} /> : <p className="rounded-2xl bg-warn-soft px-4 py-3 text-sm text-ink">{r.message}</p>;
  const rows = r.data.filter((e) => !onlyImportant || e.importance !== "low").slice(0, limit);
  if (!rows.length) return <p className="text-sm text-ink-3">No important events in this window.</p>;
  return (
    <ul className="grid gap-1.5">
      {rows.map((e) => (
        <li key={e.id} className="inset flex items-center gap-3 rounded-2xl px-3 py-2.5">
          <div className="num w-[68px] shrink-0 text-center leading-tight"><div className="text-[13px] font-semibold text-ink">{new Date(e.at).toLocaleTimeString("en-GB", { timeZone: tz, hour: "2-digit", minute: "2-digit" })}</div><div className="text-[10.5px] text-ink-3">{new Date(e.at).toLocaleDateString("en-GB", { timeZone: tz, weekday: "short", day: "numeric" })}</div></div>
          <div className="min-w-0 flex-1"><div className="truncate text-[13px] font-medium text-ink">{e.country} · {e.title}</div>
            <div className="num text-[11px] text-ink-3">{[e.actual && `Actual ${e.actual}`, e.forecast && `Forecast ${e.forecast}`, e.previous && `Previous ${e.previous}`].filter(Boolean).join(" · ") || (e.kind ?? "")}</div></div>
          <span className={cn("rounded-full px-2 py-0.5 text-[10.5px] font-semibold capitalize", imp[e.importance])}>{e.importance}</span>
        </li>
      ))}
    </ul>
  );
}

export function NewsPanel({ news, events, tz, nowMs }: { news: Result<Headline[]>; events: Result<EconEvent[]>; tz: string; nowMs: number }) {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Glass className="p-4 sm:p-5">
        <div className="mb-2 flex items-center justify-between"><h2 className="flex items-center gap-2 text-[15px] font-semibold text-ink"><Newspaper className="h-4 w-4 text-accent" />Latest market news</h2><Link href="/app/news" className="text-xs font-medium text-accent hover:underline">All news</Link></div>
        <HeadlineList r={news} nowMs={nowMs} compact />
      </Glass>
      <Glass className="p-4 sm:p-5">
        <div className="mb-2 flex items-center justify-between"><h2 className="flex items-center gap-2 text-[15px] font-semibold text-ink"><CalendarClock className="h-4 w-4 text-accent" />Events that could change the outlook</h2><Link href="/app/news?tab=calendar" className="text-xs font-medium text-accent hover:underline">Calendar</Link></div>
        <EventList r={events} tz={tz} />
        <p className="mt-2 px-1 text-[11px] text-ink-3">Times in your time zone ({tz}).</p>
      </Glass>
    </div>
  );
}

/** Dashboard cards in the shared card language. */
export function NewsCardV2({ news, nowMs }: { news: Result<Headline[]>; nowMs: number }) {
  return (
    <Card aria-labelledby="news-title" className="flex h-full flex-col">
      <CardHeader id="news-title" title="Latest market news" caption="Gold, DXY and macro headlines" icon={<span className="stat-icon h-8 w-8"><Newspaper className="h-4 w-4" /></span>} href="/app/news" hrefLabel="All news" />
      <div className="mt-3"><HeadlineList r={news} nowMs={nowMs} limit={5} compact /></div>
    </Card>
  );
}

export function CalendarCardV2({ events, tz }: { events: Result<EconEvent[]>; tz: string }) {
  return (
    <Card aria-labelledby="cal-title" className="flex h-full flex-col">
      <CardHeader id="cal-title" title="Economic calendar" caption={`Events that could change the outlook · ${tz}`} icon={<span className="stat-icon h-8 w-8"><CalendarClock className="h-4 w-4" /></span>} href="/app/news?tab=calendar" hrefLabel="Open calendar" />
      <div className="mt-3"><EventList r={events} tz={tz} limit={5} /></div>
    </Card>
  );
}
