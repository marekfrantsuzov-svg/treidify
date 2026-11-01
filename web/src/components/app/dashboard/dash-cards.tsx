"use client";

import { ArrowRight, ArrowUpRight, ArrowDownRight, CalendarDays, ChartNoAxesColumn, ExternalLink, Landmark, Layers, MoveRight, Newspaper, TrendingUp, UsersRound, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import type { GoldImpact } from "@/lib/intelligence";
import type { OverviewCategory, OverviewRow } from "@/server/market/overview";
import { cn } from "@/lib/cn";
import { AssetMark, CURRENCY, Flag } from "@/components/ui/flags";
import { SlidingPill } from "@/components/ui/sliding-pill";

export interface NewsItem { id: string; title: string; summary: string; source: string; url: string; publishedAt: string; instruments: string[]; importance: "high" | "medium" | "low" }
export interface CalItem { id: string; title: string; country: string; at: string; importance: "high" | "medium" | "low"; actual: string | null; forecast: string | null; previous: string | null }
export type Feed<T> = { ok: true; data: T[]; vendor: string } | { ok: false; message: string; needs?: string[] };

const IMPACT = { high: "impact impact-high", medium: "impact impact-medium", low: "impact impact-low" } as const;
const cap = (s: string) => s[0]!.toUpperCase() + s.slice(1);
const ago = (iso: string, now: number) => { const m = Math.max(0, Math.round((now - Date.parse(iso)) / 60000)); return m < 60 ? `${m}m ago` : m < 1440 ? `${Math.round(m / 60)}h ago` : `${Math.round(m / 1440)}d ago`; };

function Head({ icon, title, href, label = "See All", id }: { icon: React.ReactNode; title: string; href?: string; label?: string; id: string }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <h2 id={id} className="dcard-title">{icon}{title}</h2>
      {href && <Link href={href} className="see-all">{label}<ArrowRight /></Link>}
    </div>
  );
}

function Unavailable({ what, needs }: { what: string; needs?: string[] }) {
  return (
    <div className="mt-3 rounded-2xl border border-dashed border-line px-3.5 py-3 text-[12.5px] leading-snug text-ink-3">
      {what} is not connected, so nothing is shown. No example data is used.
      {needs?.length ? <span className="mt-1 block font-medium text-ink-2">Needs {needs.join(", ")}</span> : null}
    </div>
  );
}

/* ── Market News ── */
function newsMark(n: NewsItem) {
  if (n.instruments.includes("XAUUSD") && !n.instruments.includes("DXY")) return <AssetMark symbol="XAUUSD" size={34} />;
  if (n.instruments.includes("XAGUSD")) return <AssetMark symbol="XAGUSD" size={34} />;
  if (n.instruments.includes("DXY")) return <Flag code="US" size={30} />;
  return <span className="grid h-[30px] w-[30px] place-items-center rounded-full bg-accent-soft text-accent"><Newspaper className="h-4 w-4" /></span>;
}

export function NewsCard({ feed, nowMs }: { feed: Feed<NewsItem>; nowMs: number }) {
  const [open, setOpen] = useState<NewsItem | null>(null);
  return (
    <section aria-labelledby="news-title" className="dcard dcard-pad d-news flex flex-col">
      <Head id="news-title" icon={<Newspaper />} title="Market News" href="/app/news" />
      {!feed.ok ? <Unavailable what="The news feed" needs={feed.needs} /> : feed.data.length === 0 ? <p className="mt-3 text-[13px] text-ink-3">No headlines right now.</p> : (
        <ul className="mt-2 grid">
          {feed.data.slice(0, 3).map((n) => (
            <li key={n.id}>
              <button onClick={() => setOpen(n)} className="flex w-full items-start gap-3 rounded-2xl px-1.5 py-2.5 text-left transition-colors duration-150 hover:bg-[var(--surface-inset)]">
                <span className="mt-0.5">{newsMark(n)}</span>
                <span className="min-w-0 flex-1">
                  <span className="line-clamp-2 text-[13.5px] font-semibold leading-snug text-ink">{n.title}</span>
                  <span className="mt-0.5 block text-[12px] text-ink-3">{n.source} · {ago(n.publishedAt, nowMs)}</span>
                </span>
                <span className={cn(IMPACT[n.importance], "mt-0.5")}>{cap(n.importance)}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
      {open && <NewsModal n={open} nowMs={nowMs} onClose={() => setOpen(null)} />}
    </section>
  );
}

function NewsModal({ n, nowMs, onClose }: { n: NewsItem; nowMs: number; onClose: () => void }) {
  useEffect(() => { const k = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); }; window.addEventListener("keydown", k); return () => window.removeEventListener("keydown", k); }, [onClose]);
  return (
    <div className="scrim-in fixed inset-0 z-[60] grid place-items-center bg-[rgba(20,12,40,0.3)] p-4 backdrop-blur-sm" onMouseDown={onClose}>
      <div role="dialog" aria-modal="true" aria-labelledby="news-detail" className="dcard sheet-in w-full max-w-lg p-5 shadow-[var(--shadow-lg)]" onMouseDown={(e) => e.stopPropagation()}>
        <div className="flex items-start gap-3">
          {newsMark(n)}
          <h3 id="news-detail" className="min-w-0 flex-1 text-[17px] font-semibold leading-snug text-ink">{n.title}</h3>
          <button onClick={onClose} aria-label="Close" className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-ink-3 hover:bg-[var(--surface-inset)] hover:text-ink"><X className="h-4 w-4" /></button>
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-2 text-[12px] text-ink-3">
          <span className="font-medium text-ink-2">{n.source}</span><span>· {new Date(n.publishedAt).toLocaleString([], { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })} ({ago(n.publishedAt, nowMs)})</span>
          <span className={IMPACT[n.importance]}>{cap(n.importance)} impact</span>
          {n.instruments.map((i) => <span key={i} className="rounded-md bg-accent-soft px-1.5 py-px font-semibold text-accent">{i}</span>)}
        </div>
        {n.summary && <p className="mt-3 text-[14px] leading-relaxed text-ink-2">{n.summary}</p>}
        <p className="mt-3 text-[11.5px] text-ink-3">Impact and instrument tags are automatic keyword rules, not an AI judgement.</p>
        <a href={n.url} target="_blank" rel="noopener noreferrer nofollow" className="press bg-brand mt-4 inline-flex h-10 items-center gap-2 rounded-full px-4 text-[13.5px] font-semibold text-white">Read at {n.source}<ExternalLink className="h-4 w-4" /></a>
      </div>
    </div>
  );
}

/* ── News Impact on Gold ── */
export function ImpactCard({ impact, nowMs }: { impact: GoldImpact; nowMs: number }) {
  const tone = impact.read === "bullish" ? "text-up" : impact.read === "bearish" ? "text-down" : "text-ink";
  const Icon = impact.read === "bearish" ? ArrowDownRight : ArrowUpRight;
  const unc = { low: "Low uncertainty", medium: "Medium uncertainty", high: "High uncertainty" }[impact.uncertainty];
  return (
    <section aria-labelledby="impact-title" className="dcard dcard-pad d-impact flex flex-col">
      <h2 id="impact-title" className="dcard-title"><Icon className={impact.read === "bearish" ? "!text-down" : impact.read === "bullish" ? "!text-up" : ""} />News Impact on Gold</h2>
      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1">
        <p className={cn("text-[22px] font-bold leading-tight tracking-[-0.02em]", tone)}>{impact.label}</p>
        <span className={cn("rounded-lg px-2 py-0.5 text-[11.5px] font-semibold", impact.uncertainty === "high" ? "bg-warn-soft text-warn" : impact.uncertainty === "medium" ? "bg-accent-soft text-accent" : "bg-up-soft text-up")}>{unc}</span>
      </div>
      <p className="mt-1 line-clamp-3 text-[12px] leading-snug text-ink-2">{impact.reasons[0]}{impact.reasons[1] ? ` ${impact.reasons[1]}` : ""}</p>
      {impact.reasons.length > 2 && <ul className="mt-1.5 grid gap-0.5 text-[11.5px] leading-snug text-ink-3">{impact.reasons.slice(2, 3).map((r) => <li key={r} className="line-clamp-2">• {r}</li>)}</ul>}
      <p className="mt-auto pt-2 text-[10.5px] text-ink-3" suppressHydrationWarning>DXY + gold structure + US events · {ago(impact.asOf, nowMs)} · not a probability</p>
    </section>
  );
}

/* ── Macro Desk ── */
export interface MacroTile { id: "rates" | "inflation" | "gdp"; label: string; value: string | null; note: string | null }
export function MacroCard({ tiles }: { tiles: MacroTile[] }) {
  const ICON = { rates: Landmark, inflation: ChartNoAxesColumn, gdp: Layers } as const;
  return (
    <section aria-labelledby="macro-title" className="dcard dcard-pad d-macro flex flex-col">
      <div className="flex items-center justify-between">
        <h2 id="macro-title" className="dcard-title"><ChartNoAxesColumn />Macro Desk</h2>
        <Link href="/app/macro" aria-label="Open Macro Desk" className="see-all"><MoveRight /></Link>
      </div>
      <div className="mt-2.5 grid grid-cols-3 gap-2">
        {tiles.map((t) => {
          const I = ICON[t.id];
          return (
            <Link key={t.id} href="/app/macro" className="grid justify-items-center gap-0.5 rounded-2xl border border-line bg-[var(--surface-top)] px-1 py-2 text-center transition-[border-color,transform] duration-150 hover:border-[var(--border-strong)] active:scale-[0.97]">
              <I className="h-5 w-5 text-ink-2" strokeWidth={1.7} aria-hidden />
              <span className="text-[12.5px] font-medium text-ink">{t.label}</span>
              <span className={cn("num text-[12px] font-semibold", t.value ? "text-ink" : "text-ink-3")}>{t.value ?? "—"}</span>
            </Link>
          );
        })}
      </div>
      <p className="sr-only">{tiles.some((t) => t.value) ? "Latest US release from the economic calendar." : "Latest US releases appear here once the calendar feed is connected."}</p>
    </section>
  );
}

/* ── Economic Calendar ── */
export function CalendarCard({ feed, tz, nowMs }: { feed: Feed<CalItem>; tz: string; nowMs: number }) {
  const today = new Date(nowMs).toLocaleDateString("en-GB", { timeZone: tz });
  return (
    <section aria-labelledby="cal-title" className="dcard dcard-pad d-calendar flex flex-col">
      <Head id="cal-title" icon={<CalendarDays />} title="Economic Calendar" href="/app/news?tab=calendar" />
      {!feed.ok ? <Unavailable what="The economic calendar" needs={feed.needs} /> : feed.data.length === 0 ? <p className="mt-3 text-[13px] text-ink-3">No high or medium impact events in the next few days.</p> : (
        <table className="mt-2 w-full text-[13px]">
          <caption className="sr-only">Upcoming events, times in {tz}</caption>
          <tbody>
            {feed.data.slice(0, 4).map((e) => {
              const d = new Date(e.at);
              const sameDay = d.toLocaleDateString("en-GB", { timeZone: tz }) === today;
              return (
                <tr key={e.id} className="border-b border-line last:border-0">
                  <td className="num whitespace-nowrap py-2 pr-2 font-medium text-ink">{sameDay ? "" : `${d.toLocaleDateString("en-GB", { timeZone: tz, weekday: "short" })} `}{d.toLocaleTimeString("en-GB", { timeZone: tz, hour: "2-digit", minute: "2-digit" })}</td>
                  <td className="py-2 pr-2"><span className="flex items-center gap-1.5 font-medium text-ink-2"><Flag code={e.country} size={18} />{CURRENCY[e.country] ?? e.country}</span></td>
                  <td className="w-full max-w-0 py-2 pr-2"><span className="block truncate text-ink" title={[e.title, e.forecast && `Forecast ${e.forecast}`, e.previous && `Previous ${e.previous}`].filter(Boolean).join(" · ")}>{e.title}</span>
                    {(e.actual || e.forecast || e.previous) && <span className="num block truncate text-[11px] text-ink-3">{[e.actual && `A ${e.actual}`, e.forecast && `F ${e.forecast}`, e.previous && `P ${e.previous}`].filter(Boolean).join(" · ")}</span>}</td>
                  <td className="py-2 text-right"><span className={IMPACT[e.importance]}>{cap(e.importance)}</span></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
      <p className="mt-auto pt-2 text-[11px] text-ink-3">Times in {tz}.</p>
    </section>
  );
}

/* ── Community ── */
export interface CommunityFace { id: string; name: string; image: string | null; hue: number | null }
export function CommunityCard({ members, faces }: { members: number; faces: CommunityFace[] }) {
  return (
    <section aria-labelledby="comm-title" className="dcard dcard-pad d-community flex flex-col">
      <Head id="comm-title" icon={<UsersRound />} title="Community" href="/app/community" />
      <div className="mt-3 flex items-center">
        {faces.slice(0, 3).map((f, i) => (
          <span key={f.id} className={cn("relative rounded-full ring-2 ring-[var(--surface-top)]", i > 0 && "-ml-2.5")} title={f.name}>
            {f.image ? (
              // eslint-disable-next-line @next/next/no-img-element -- member avatar data URL
              <img src={f.image} alt="" width={40} height={40} className="h-10 w-10 rounded-full object-cover" />
            ) : (
              <span className="grid h-10 w-10 place-items-center rounded-full text-[13px] font-semibold text-white" style={{ background: f.hue !== null ? `linear-gradient(135deg, hsl(${f.hue} 80% 68%), hsl(${(f.hue + 40) % 360} 65% 45%))` : "var(--accent)" }}>{f.name.split(" ").map((w) => w[0]).join("").slice(0, 2)}</span>
            )}
          </span>
        ))}
        <span className={cn("num grid h-10 min-w-10 place-items-center rounded-full bg-accent-soft px-3 text-[13px] font-semibold text-accent ring-2 ring-[var(--surface-top)]", faces.length > 0 && "-ml-2")}>{members.toLocaleString("en-US")} {members === 1 ? "member" : "members"}</span>
      </div>
      <div className="mt-3 flex flex-wrap items-end justify-between gap-3">
        <p className="min-w-0 flex-1 text-[13px] leading-snug text-ink-2">{members === 1 ? "You are the first member." : "Share ideas, setups and market insights."} Pro and Whale rooms open with verified results only.</p>
        <Link href="/app/community" className="press inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full bg-[#1b1530] px-4 text-[13px] font-semibold text-white dark:bg-white dark:text-[#1b1530]">Go to Community<ArrowRight className="h-4 w-4" /></Link>
      </div>
    </section>
  );
}

/* ── Market Overview ── */
const CATS: ("All" | OverviewCategory)[] = ["All", "Forex", "Metals", "Indices", "Crypto"];
export function OverviewCard({ rows }: { rows: OverviewRow[] }) {
  const [cat, setCat] = useState<(typeof CATS)[number]>("All");
  const shown = rows.filter((r) => cat === "All" || r.category === cat);
  const anySample = rows.some((r) => r.status === "sample");
  return (
    <section id="market-overview" aria-labelledby="ov-title" className="dcard dcard-pad d-overview flex flex-col">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <h2 id="ov-title" className="dcard-title"><ChartNoAxesColumn />Market Overview</h2>
        <div role="tablist" aria-label="Category" className="relative order-3 flex w-full gap-1 overflow-x-auto [scrollbar-width:none] sm:order-none sm:w-auto">
          <SlidingPill watch={cat} className="rounded-full bg-accent shadow-[0_6px_14px_-8px_var(--accent-glow)]" />
          {CATS.map((c) => (
            <button key={c} role="tab" aria-selected={cat === c} data-active={cat === c} onClick={() => setCat(c)} className={cn("relative z-[1] shrink-0 rounded-full px-3.5 py-1.5 text-[13px] font-medium transition-colors duration-150", cat === c ? "text-white" : "bg-[var(--surface-inset)] text-ink-2 hover:text-ink")}>{c}</button>
          ))}
        </div>
        <Link href="/app/markets" className="see-all ml-auto">See All<ArrowRight /></Link>
      </div>
      <table className="mt-3 w-full text-[14px]">
        <thead>
          <tr className="text-left text-[12.5px] font-medium text-ink-3">
            <th scope="col" className="pb-2 font-medium">Asset</th>
            <th scope="col" className="pb-2 text-right font-medium">Price</th>
            <th scope="col" className="pb-2 pl-3 text-center font-medium sm:pl-6">Trend (TF)</th>
            <th scope="col" className="hidden pb-2 text-right font-medium sm:table-cell">24h Change</th>
          </tr>
        </thead>
        <tbody>
          {shown.map((r) => (
            <tr key={r.symbol} className="border-t border-line">
              <td className="py-2.5 pr-2"><span className="flex items-center gap-2.5"><AssetMark symbol={r.symbol} size={26} /><span className="font-semibold text-ink">{r.symbol}</span></span></td>
              <td className="num py-2.5 text-right font-semibold text-ink">{r.price === null ? <span className="font-normal text-ink-3">—</span> : r.price.toLocaleString("en-US", { minimumFractionDigits: r.digits, maximumFractionDigits: r.digits })}</td>
              <td className="py-2.5 pl-3 text-center sm:pl-6"><TrendChip r={r} /></td>
              <td className={cn("num hidden py-2.5 text-right font-semibold sm:table-cell", r.changePct === null ? "text-ink-3" : r.changePct >= 0 ? "text-up-ink" : "text-down-ink")}>{r.changePct === null ? "—" : `${r.changePct >= 0 ? "+" : "−"}${Math.abs(r.changePct).toFixed(2)}%`}</td>
            </tr>
          ))}
          {shown.length === 0 && <tr><td colSpan={4} className="py-4 text-center text-[13px] text-ink-3">No {cat.toLowerCase()} instruments tracked yet.</td></tr>}
        </tbody>
      </table>
      <p className="mt-auto pt-2 text-[11px] text-ink-3">Trend = market structure (swings, BOS / CHOCH) on the timeframe shown, not the 24h change.{anySample ? " Gold, Silver and DXY use sample bars." : ""}</p>
    </section>
  );
}

function TrendChip({ r }: { r: OverviewRow }) {
  if (r.status === "unavailable" || r.trend === null) return <span className="trend-chip is-flat">Not connected</span>;
  if (r.trend === "none") return <span className="trend-chip is-flat">RANGE ({r.trendTf})</span>;
  const up = r.trend === "bullish";
  return <span className={cn("trend-chip", up ? "is-up" : "is-down")}>{up ? <TrendingUp className="h-4 w-4" /> : <ArrowDownRight className="h-4 w-4" />}{up ? "BULLISH" : "BEARISH"} ({r.trendTf})</span>;
}
