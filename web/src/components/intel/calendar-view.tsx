import { ChevronDown, ExternalLink, Info } from "lucide-react";
import Link from "next/link";
import { Flag, CURRENCY } from "@/components/ui/flags";
import { cn } from "@/lib/cn";
import { dayIn, zonedToUtc, addDays } from "@/lib/time/zoned";
import type { EconEvent, Result } from "@/server/news/service";
import { AutoRefresh } from "./auto-refresh";

export type Range = "today" | "tomorrow" | "week" | "recent";
export interface Reaction { change: number; pips: number; endAt: string }
const IMP = { high: "impact impact-high", medium: "impact impact-medium", low: "impact impact-low" } as const;

/** Scenario text per release type. Describes typical channels, never what the market did. */
function scenario(e: EconEvent): { hot: string; cold: string } | null {
  const t = e.title.toLowerCase();
  if (/cpi|pce|ppi|price/.test(t)) return { hot: "Higher than the previous reading or than markets expect: Treasury yields and the dollar (DXY) tend to rise on bets of a tighter Fed, which usually pressures gold.", cold: "Lower: yields and the dollar tend to ease, which has usually supported gold." };
  if (/payroll|unemployment|earnings|claims|jolts|job/.test(t)) {
    const inv = /unemployment|claims/.test(t);
    return { hot: `${inv ? "A lower figure (stronger labour market)" : "A stronger figure"}: the dollar tends to firm as rate cuts look less likely, usually a headwind for gold.`, cold: `${inv ? "A higher figure (weaker labour market)" : "A weaker figure"}: the dollar tends to soften and gold has tended to benefit.` };
  }
  if (/fomc|rate decision/.test(t)) return { hot: "More hawkish than priced (a hike, fewer cuts signalled): dollar up, gold usually down.", cold: "More dovish than priced (a cut or more cuts signalled): dollar down, gold usually up. The statement and press conference often matter more than the decision." };
  if (/gdp|retail/.test(t)) return { hot: "Stronger: supports the dollar and yields, a mild headwind for gold.", cold: "Weaker: growth worries and rate-cut bets have tended to support gold and weigh on the dollar." };
  return null;
}

function Status({ e }: { e: EconEvent }) {
  if (e.revisedFrom) return <span className="rounded-full bg-warn-soft px-2 py-0.5 text-[10.5px] font-semibold text-warn">Revised</span>;
  if (e.status === "released") return <span className="rounded-full bg-up-soft px-2 py-0.5 text-[10.5px] font-semibold text-up-ink">Released</span>;
  if (e.status === "awaiting") return <span className="rounded-full bg-inset px-2 py-0.5 text-[10.5px] font-semibold text-ink-2">Data pending</span>;
  return <span className="rounded-full bg-accent-soft px-2 py-0.5 text-[10.5px] font-semibold text-accent">Upcoming</span>;
}

function Val({ label, v, strong, title }: { label: string; v: string | null | undefined; strong?: boolean; title?: string }) {
  return (
    <div className="min-w-0" title={title}>
      <div className="text-[10.5px] font-medium uppercase tracking-wide text-ink-3">{label}</div>
      <div className={cn("num break-words text-[13px] leading-snug", v ? (strong ? "font-semibold text-ink" : "text-ink-2") : "text-ink-3")}>{v ?? "—"}</div>
    </div>
  );
}

/** Day bounds in the viewer's time zone (DST-correct). */
export function rangeBounds(range: Range, tz: string, now: number): [number, number] {
  const today = dayIn(now, tz);
  const start = (d: string) => zonedToUtc(d, "00:00", tz).getTime();
  if (range === "today") return [start(today), start(addDays(today, 1))];
  if (range === "tomorrow") return [start(addDays(today, 1)), start(addDays(today, 2))];
  if (range === "recent") return [now - 7 * 86_400_000, now];
  const dow = (new Date(`${today}T12:00:00Z`).getUTCDay() + 6) % 7; // Monday = 0
  const mon = addDays(today, -dow);
  return [start(mon), start(addDays(mon, 7))];
}

export function CalendarView({ r, tz, now, range, cur, imp, reactions }: { r: Result<EconEvent[]>; tz: string; now: number; range: Range; cur: string; imp: string; reactions: Record<string, Reaction> }) {
  const href = (p: Partial<{ range: Range; cur: string; imp: string }>) => {
    const q = new URLSearchParams({ tab: "calendar", range: p.range ?? range, ...(p.cur ?? cur ? { cur: p.cur ?? cur } : {}), ...(p.imp ?? imp ? { imp: p.imp ?? imp } : {}) });
    for (const [k, v] of [...q.entries()]) if (!v) q.delete(k);
    return `/app/news?${q.toString()}`;
  };
  const chip = (on: boolean) => cn("press shrink-0 rounded-full px-3.5 py-1.5 text-[12.5px] font-semibold transition-colors", on ? "bg-accent text-white" : "bg-[var(--surface-inset)] text-ink-2 hover:text-ink");
  const RANGES: [Range, string][] = [["today", "Today"], ["tomorrow", "Tomorrow"], ["week", "This week"], ["recent", "Recently released"]];
  if (!r.ok) {
    return (
      <div className="rounded-2xl border border-dashed border-line px-4 py-4 text-[13px] leading-relaxed text-ink-2">
        The economic calendar is not available right now.
        <span className="mt-1 block text-ink-3">No events are shown rather than invented ones.</span>
      </div>
    );
  }
  const [a, b] = rangeBounds(range, tz, now);
  const currencies = [...new Set(r.data.map((e) => e.currency ?? CURRENCY[e.country] ?? e.country))].sort();
  const rows = r.data.filter((e) => { const t = Date.parse(e.at); return t >= a && t < b; })
    .filter((e) => !cur || (e.currency ?? CURRENCY[e.country]) === cur)
    .filter((e) => (imp === "all" ? true : imp === "medium" ? e.importance !== "low" : imp === "high" ? e.importance === "high" : e.importance !== "low"))
    .filter((e) => range !== "recent" || e.status !== "upcoming");
  if (range === "recent") rows.reverse();
  const days = new Map<string, EconEvent[]>();
  for (const e of rows) { const d = dayIn(Date.parse(e.at), tz); days.set(d, [...(days.get(d) ?? []), e]); }
  const next = r.data.find((e) => Date.parse(e.at) > now);
  const waiting = r.data.some((e) => e.status === "awaiting" && Date.parse(e.at) > now - 6 * 3600_000);
  const official = r.vendor.startsWith("Official");
  return (
    <div>
      <AutoRefresh nextAt={next?.at ?? null} waiting={waiting} />
      <div className="mb-3 grid gap-2">
        <nav aria-label="Date range" className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-0.5 [scrollbar-width:none]">
          {RANGES.map(([id, l]) => <Link key={id} href={href({ range: id })} scroll={false} aria-current={range === id ? "true" : undefined} className={chip(range === id)}>{l}</Link>)}
        </nav>
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="mr-1 text-[11.5px] font-medium text-ink-3">Currency</span>
          <Link href={href({ cur: "" })} scroll={false} className={chip(!cur)}>All</Link>
          {currencies.map((c) => <Link key={c} href={href({ cur: c })} scroll={false} className={chip(cur === c)}>{c}</Link>)}
          <span className="ml-2 mr-1 text-[11.5px] font-medium text-ink-3">Impact</span>
          {([["high", "High"], ["medium", "High + medium"], ["all", "All"]] as const).map(([id, l]) => <Link key={id} href={href({ imp: id })} scroll={false} className={chip((imp || "medium") === id)}>{l}</Link>)}
        </div>
      </div>
      {rows.length === 0 ? <p className="rounded-2xl bg-[var(--surface-inset)] px-4 py-6 text-center text-[13px] text-ink-3">No {imp === "high" ? "high-impact " : ""}events in this range{cur ? ` for ${cur}` : ""}.</p> : (
        <div className="grid gap-4">
          {[...days.entries()].map(([d, evs]) => (
            <section key={d} aria-label={d}>
              <h3 className="mb-1.5 px-1 text-[12.5px] font-semibold text-ink-2">{new Date(`${d}T12:00:00Z`).toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" })}{d === dayIn(now, tz) ? " · Today" : ""}</h3>
              <ul className="grid gap-1.5">
                {evs.map((e) => {
                  const sc = scenario(e), re = reactions[e.id];
                  const when = new Date(e.at).toLocaleTimeString("en-GB", { timeZone: tz, hour: "2-digit", minute: "2-digit" });
                  return (
                    <li key={e.id}>
                      <details className="group rounded-2xl border border-line bg-[var(--surface-top)] [&_summary::-webkit-details-marker]:hidden">
                        <summary className="flex cursor-pointer list-none flex-col gap-2 px-3 py-2.5 sm:grid sm:grid-cols-[56px_minmax(0,1fr)_minmax(0,300px)_20px] sm:items-center sm:gap-3">
                          <div className="flex items-center gap-2 sm:block">
                            <span className="num text-[14px] font-semibold text-ink">{when}</span>
                            <span className="flex items-center gap-1.5 sm:hidden"><Flag code={e.country} size={16} /><span className="text-[12px] font-medium text-ink-2">{e.currency ?? CURRENCY[e.country]}</span><span className={IMP[e.importance]}>{e.importance[0]!.toUpperCase() + e.importance.slice(1)}</span><Status e={e} /></span>
                          </div>
                          <div className="min-w-0">
                            <div className="flex min-w-0 items-center gap-2">
                              <span className="hidden sm:inline-flex"><Flag code={e.country} size={18} /></span>
                              <span className="min-w-0 text-[13.5px] font-semibold leading-snug text-ink">{e.title}</span>
                            </div>
                            <div className="mt-0.5 hidden flex-wrap items-center gap-1.5 text-[11.5px] text-ink-3 sm:flex">
                              <span className="font-medium text-ink-2">{e.currency ?? CURRENCY[e.country]}</span>{e.period && <span>· {e.period}</span>}<span className={IMP[e.importance]}>{e.importance[0]!.toUpperCase() + e.importance.slice(1)}</span><Status e={e} />
                            </div>
                            {e.period && <div className="mt-0.5 text-[11.5px] text-ink-3 sm:hidden">{e.period}</div>}
                          </div>
                          <div className="grid grid-cols-3 gap-2">
                            <Val label="Actual" v={e.actual} strong />
                            <Val label="Forecast" v={e.forecast} title={official ? "Consensus forecasts are not published by official sources" : undefined} />
                            <Val label="Previous" v={e.previous} title={e.revisedFrom ? `Revised from ${e.revisedFrom}` : undefined} />
                          </div>
                          <ChevronDown className="hidden h-4 w-4 text-ink-3 transition-transform group-open:rotate-180 sm:block" aria-hidden />
                        </summary>
                        <div className="grid gap-3 border-t border-line px-3 py-3 text-[12.5px] leading-relaxed text-ink-2 md:grid-cols-2">
                          <div className="grid gap-1.5">
                            <p className="text-[10.5px] font-semibold uppercase tracking-wide text-ink-3">Verified</p>
                            <p>{new Date(e.at).toLocaleString("en-GB", { timeZone: tz, weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })} ({tz}){e.agency ? ` · ${e.agency}` : ""}{e.period ? ` · refers to ${e.period}` : ""}.</p>
                            {e.revisedFrom && <p>The previous reading was revised from <b className="num text-ink">{e.revisedFrom}</b> to <b className="num text-ink">{e.previous}</b> in this release.</p>}
                            {e.status === "awaiting" && <p>The release time has passed; the value appears here once the source publishes it. This page re-checks automatically.</p>}
                            {re ? <p><b className="text-ink">Measured reaction:</b> XAUUSD moved <b className={cn("num", re.change >= 0 ? "text-up-ink" : "text-down-ink")}>{re.change >= 0 ? "+" : "−"}${Math.abs(re.change).toFixed(2)} ({re.change >= 0 ? "+" : "−"}{Math.abs(Math.round(re.pips))} pips)</b> in the hour after the release, from 15-minute bars. Other news in that hour may have contributed.</p>
                              : e.status === "released" ? <p className="text-ink-3">No measured gold reaction: the saved 15-minute bars don&rsquo;t cover the hour after this release.</p> : null}
                            {e.sourceUrl && <a href={e.sourceUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 font-medium text-accent hover:underline">Official source<ExternalLink className="h-3 w-3" /></a>}
                          </div>
                          {sc && (
                            <div className="grid gap-1.5">
                              <p className="text-[10.5px] font-semibold uppercase tracking-wide text-accent">Scenarios · not a confirmed reaction</p>
                              <p><b className="text-ink">If stronger.</b> {sc.hot}</p>
                              <p><b className="text-ink">If weaker.</b> {sc.cold}</p>
                            </div>
                          )}
                        </div>
                      </details>
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}
        </div>
      )}
      <p className="mt-3 flex gap-1.5 px-1 text-[11px] leading-snug text-ink-3"><Info className="mt-px h-3.5 w-3.5 shrink-0" />
        <span>Times in {tz}, daylight saving included. Source: {r.vendor}. {official ? "Covers scheduled US releases (CPI, PPI, PCE, payrolls, unemployment, jobless claims, JOLTS, GDP, retail sales, FOMC). Forecasts are shown as — because no official source publishes consensus forecasts; other countries are not covered by a free licensed source yet." : ""} Updated {new Date(r.fetchedAt).toLocaleTimeString("en-GB", { timeZone: tz, hour: "2-digit", minute: "2-digit" })}.</span>
      </p>
    </div>
  );
}
