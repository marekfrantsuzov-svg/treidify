"use client";

import { ArrowRight, Expand, Lock, MessageSquare, ThumbsUp } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { sampleSeries } from "@/lib/demo/markets";
import { sampleCandles } from "@/lib/demo/sample";
import { cn } from "@/lib/cn";
import { fmtNumber, fmtPct, fmtSignedMoney } from "@/lib/format";
import { Sparkline } from "@/components/charts/sparkline";
import { GlassIcon, type GlassIconName } from "@/components/icons/glass-icon";
import { Flag, InstrumentIcon } from "@/components/previews/parts";
import { DemoPhotoArt, type DemoPhoto } from "./demo-photos";
import { Glass } from "@/components/ui/glass";
import { Pill, SampleBadge } from "@/components/ui/pill";
import { SlidingPill } from "@/components/ui/sliding-pill";

export function CardHead({ title, href, children }: { title: string; href?: string; children?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <h2 className="truncate text-[15px] font-semibold tracking-[-0.01em] text-ink">{title}</h2>
      <div className="flex shrink-0 items-center gap-2">
        {children}
        {href && <Link href={href} className="inline-flex items-center gap-1 text-xs font-medium text-accent hover:underline">View all <ArrowRight className="h-3 w-3" /></Link>}
      </div>
    </div>
  );
}

function Tabs({ tabs, value, onChange, label }: { tabs: string[]; value: string; onChange: (t: string) => void; label: string }) {
  return (
    <div role="tablist" aria-label={label} className="relative mt-3 flex gap-1 overflow-x-auto [scrollbar-width:none]">
      <SlidingPill watch={value} className="rounded-full bg-brand shadow-[0_6px_14px_-6px_var(--accent-glow)]" />
      {tabs.map((t) => (
        <button key={t} role="tab" aria-selected={value === t} data-active={value === t} onClick={() => onChange(t)} className={cn("relative z-[1] shrink-0 rounded-full px-3 py-1 text-xs font-medium text-ink-3 transition-[color,transform] duration-200 hover:text-ink active:scale-95", value === t ? "text-white hover:text-white" : "inset")}>
          {t}
        </button>
      ))}
    </div>
  );
}

/* ───────── News ───────── */

/** Branded category illustration, used whenever a licensed article photo is unavailable. */
export function NewsArt({ icon, hue, className }: { icon: GlassIconName; hue: string; className?: string }) {
  return (
    <div className={cn("relative grid shrink-0 place-items-center overflow-hidden rounded-xl bg-gradient-to-br to-transparent", hue, className)} aria-hidden>
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.5),transparent_55%)] opacity-60" />
      <div className="absolute -bottom-6 -right-6 h-16 w-16 rounded-full border border-white/30" />
      <GlassIcon name={icon} size={36} />
    </div>
  );
}

/** Example rows that show the layout until a licensed news feed is connected. Badged Demo, never shown as live. */
const DEMO_NEWS: { title: string; note: string; impact: "High" | "Medium"; photo: DemoPhoto }[] = [
  { title: "Fed Member Speaks", note: "Hawkish tone signals higher for USD, pressure on Gold.", impact: "High", photo: "podium" },
  { title: "Middle East tensions rise", note: "Reports of new strikes increase safe haven demand.", impact: "High", photo: "skyline" },
  { title: "Crude Oil Inventories", note: "Larger than expected build, USD stronger.", impact: "Medium", photo: "rigs" },
];

export function NewsCard({ connected }: { connected: boolean }) {
  return (
    <Glass className="flex min-w-0 flex-col p-4 sm:p-5">
      <CardHead title="Next Important News" href="/app/news">{!connected && <SampleBadge label="Demo" />}</CardHead>
      <ul className="mt-3 grid flex-1 content-start gap-3">
        {DEMO_NEWS.map((n) => (
          <li key={n.title}>
            <Link href="/app/news" className="group relative flex gap-3 rounded-2xl transition-colors hover:bg-[var(--surface-inset)]">
              <DemoPhotoArt kind={n.photo} className="h-[66px] w-[104px] shrink-0 rounded-xl" />
              <div className="min-w-0 flex-1 pr-1">
                <div className="flex items-start justify-between gap-2">
                  <span className="truncate text-[13px] font-semibold text-ink">{n.title}</span>
                  <Expand className="mt-0.5 h-3.5 w-3.5 shrink-0 text-ink-3" aria-hidden />
                </div>
                <p className="line-clamp-2 text-[11.5px] leading-snug text-ink-3">{n.note}</p>
                <div className="mt-1 flex items-center justify-between gap-2">
                  <span className="inline-flex items-center gap-1.5 text-[11px] text-ink-3"><Flag country="us" className="h-3.5 w-3.5" />Example</span>
                  <Pill tone={n.impact === "High" ? "down" : "warn"} className="px-2 text-[10.5px]">{n.impact}</Pill>
                </div>
              </div>
            </Link>
          </li>
        ))}
      </ul>
      <p className="mt-3 text-[11px] leading-snug text-ink-3">{connected ? "Latest events with sources and timestamps." : "Example headlines and illustrations that show the layout. Real headlines with sources and licensed photos appear once the news feed is connected."}</p>
    </Glass>
  );
}

/* ───────── Macro Desk ───────── */

const MACRO = [
  { id: "XAUUSD", name: "XAUUSD", series: () => sampleSeries("XAUUSD", "4H").map((c) => c.c), digits: 2, icon: "XAUUSD" },
  { id: "DXY", name: "DXY", series: () => sampleSeries("DXY", "4H").map((c) => c.c), digits: 3, icon: "DXY" },
  { id: "SILVER", name: "SILVER", series: () => sampleSeries("XAGUSD", "4H").map((c) => c.c), digits: 2, icon: "XAGUSD" },
  { id: "US10Y", name: "US10Y", series: () => sampleCandles({ seed: 77, count: 140, start: 4.31, vol: 0.006, drift: 0.01 }).map((c) => c.c), digits: 2, icon: "US10Y", pct: true },
] as const;

export function MacroCard() {
  const [tab, setTab] = useState("Overview");
  const router = useRouter();
  const rows = useMemo(() => MACRO.map((m) => { const v = m.series().slice(-40); const last = v.at(-1)!, first = v[0]!; return { ...m, values: v, last, chg: ((last - first) / first) * 100 }; }), []);
  const shown = tab === "Overview" ? rows : rows.filter((r) => (tab === "Yields" ? r.id === "US10Y" : r.id === tab.toUpperCase()));
  return (
    <Glass className="flex min-w-0 flex-col p-4 sm:p-5">
      <CardHead title="Macro Desk" href="/app/macro"><SampleBadge label="Sample" /></CardHead>
      <Tabs label="Macro view" tabs={["Overview", "XAUUSD", "DXY", "Silver", "Yields"]} value={tab} onChange={setTab} />
      <div className="mt-2 grid flex-1 grid-cols-2 content-around gap-x-3">
        {shown.map((r) => {
          const up = r.chg >= 0;
          return (
            <button key={r.id} onClick={() => router.push(`/app/macro#${r.id.toLowerCase()}`)} className="flex min-w-0 items-center gap-2 rounded-2xl px-1 py-3.5 text-left transition-colors hover:bg-[var(--surface-inset)]">
              <InstrumentIcon symbol={r.icon} className="h-7 w-7 self-start text-[10px]" />
              <div className="min-w-0 flex-1">
                <div className="truncate text-[10.5px] font-semibold uppercase tracking-wide text-ink-2">{r.name}</div>
                <div className="num truncate text-[13.5px] font-semibold text-ink">{fmtNumber(r.last, r.digits)}{"pct" in r && "%"}</div>
                <div className={cn("num text-[11px] font-medium", up ? "text-up" : "text-down")}>{fmtPct(r.chg, 2, true)}</div>
              </div>
              <Sparkline values={r.values} up={up} width={60} height={30} className="h-8 w-[30%] max-w-[78px] shrink-0" />
            </button>
          );
        })}
      </div>
    </Glass>
  );
}

/* ───────── AI Chart Analysis ───────── */

/** Small dark candle chart for example thumbnails. Drawn from sample candles, labelled Example. */
function ExampleChartThumb({ seed, label }: { seed: number; label: string }) {
  const c = useMemo(() => sampleCandles({ seed, count: 34, start: 100, vol: 0.006, drift: 0.04 }), [seed]);
  const lo = Math.min(...c.map((k) => k.l)), hi = Math.max(...c.map((k) => k.h));
  const y = (p: number) => 6 + (1 - (p - lo) / (hi - lo)) * 48;
  return (
    <div className="relative overflow-hidden rounded-xl border border-white/10 bg-[linear-gradient(180deg,#0f1626,#070b14)]">
      <svg viewBox="0 0 120 60" preserveAspectRatio="none" className="block h-full w-full" aria-hidden>
        {[15, 30, 45].map((g) => <line key={g} x1="0" x2="120" y1={g} y2={g} stroke="#ffffff" strokeOpacity="0.06" />)}
        {c.map((k, i) => {
          const x = 3 + i * 3.42, col = k.c >= k.o ? "#22c55e" : "#ef4444";
          return <g key={k.t}><line x1={x} x2={x} y1={y(k.h)} y2={y(k.l)} stroke={col} strokeWidth="0.6" /><rect x={x - 1} width="2" y={y(Math.max(k.o, k.c))} height={Math.max(0.6, y(Math.min(k.o, k.c)) - y(Math.max(k.o, k.c)))} fill={col} /></g>;
        })}
      </svg>
      <span className="absolute left-1.5 top-1 text-[8px] font-medium text-white/60">{label}</span>
    </div>
  );
}

export function AiAnalysisCard({ aiConnected, recent }: { aiConnected: boolean; recent: { id: string; thumb: string | null }[] }) {
  const router = useRouter();
  const [drag, setDrag] = useState(false);
  const open = () => router.push("/app/ai-analysis");
  return (
    <Glass className="flex min-w-0 flex-col p-4 sm:p-5">
      <CardHead title="AI Chart Analysis" href="/app/ai-analysis">{!aiConnected && <Pill>Not connected</Pill>}</CardHead>
      <div className="mt-3 grid flex-1 gap-3 sm:grid-cols-[1fr_minmax(0,0.62fr)]">
        <div className="grid grid-rows-[1fr_auto] gap-3">
          <button
            onClick={open}
            onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
            onDragLeave={() => setDrag(false)}
            onDrop={(e) => { e.preventDefault(); setDrag(false); open(); }}
            className={cn("inset grid place-items-center gap-1.5 rounded-2xl px-4 py-5 text-center transition-colors", drag && "border-accent bg-accent-soft")}
          >
            <span className="grid h-10 w-10 place-items-center rounded-full bg-brand text-[12px] font-bold text-white shadow-[0_6px_16px_-4px_var(--accent-glow),inset_0_1px_0_rgba(255,255,255,0.5)]">AI</span>
            <span className="text-[12.5px] leading-snug text-ink-2">Drag &amp; drop a chart screenshot<br />or upload image</span>
            <span className="text-[10.5px] text-ink-3">PNG, JPG up to 10MB</span>
          </button>
          <button onClick={open} className="press bg-brand flex h-11 w-full items-center justify-center gap-2 rounded-2xl text-sm font-medium text-white shadow-[0_10px_24px_-10px_var(--accent-glow)] hover:brightness-110 hover:shadow-[0_14px_30px_-10px_var(--accent-glow)]">
            <span className="grid h-6 w-6 place-items-center rounded-full bg-white/20 text-[9px] font-bold ring-1 ring-white/40">AI</span> Analyse with AI <ArrowRight className="h-4 w-4" />
          </button>
        </div>
        <div className="hidden grid-rows-3 gap-2 sm:grid">
          {[0, 1, 2].map((i) => {
            const r = recent[i];
            return r?.thumb ? (
              // eslint-disable-next-line @next/next/no-img-element -- user's own re-encoded thumbnail
              <Link key={r.id} href={`/app/ai-analysis/${r.id}`}><img src={r.thumb} alt="Analysed chart" className="h-full w-full rounded-xl object-cover" /></Link>
            ) : (
              <ExampleChartThumb key={i} seed={31 + i * 17} label="Example" />
            );
          })}
        </div>
      </div>
    </Glass>
  );
}

/* ───────── Community ───────── */

/** Example posts that show the feed layout. Fictional handles, badged Demo; real posts arrive with the community phase. */
const DEMO_POSTS = [
  { handle: "trader_jay", ago: "12m", text: "XAUUSD long idea, looking for 2,670 break", likes: 24, comments: 5, seed: 41, hue: "#f5a524" },
  { handle: "mark_trades", ago: "1h", text: "DXY analysis for this week", likes: 32, comments: 8, seed: 52, hue: "#22c55e" },
  { handle: "silverhunter", ago: "2h", text: "My gold analysis, key levels", likes: 18, comments: 3, seed: 63, hue: "#8b9bb4" },
];

export function CommunityCard() {
  const [tab, setTab] = useState("General");
  const rooms: Record<string, { rule: string; locked: boolean }> = {
    General: { rule: "Open to every Treidify member. Share analysis and discuss markets. No signal selling, affiliate links or promotion.", locked: false },
    Analysis: { rule: "Chart breakdowns with levels, confirmation and invalidation. Posts link to the chart they analyse.", locked: false },
    Trades: { rule: "Closed trades shared from a synced account, with the privacy delay you choose.", locked: false },
    "Whale Room": { rule: "At least $50,000 verified net realized profit in each of the last three completed months, from a synced account. Cannot be bought.", locked: true },
  };
  const r = rooms[tab]!;
  return (
    <Glass className="flex min-w-0 flex-col p-4 sm:p-5">
      <CardHead title="Community" href="/app/community"><SampleBadge label="Demo" /></CardHead>
      <Tabs label="Community room" tabs={Object.keys(rooms)} value={tab} onChange={setTab} />
      {tab === "General" ? (
        <ul className="mt-2 grid flex-1 grid-cols-[minmax(0,1fr)] content-start">
          {DEMO_POSTS.map((p) => (
            <li key={p.handle} className="flex items-center gap-3 border-t border-line py-2.5 first:border-t-0">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-[12px] font-bold text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.35)]" style={{ background: `linear-gradient(135deg, ${p.hue}, #1b2333)` }} aria-hidden>{p.handle[0]!.toUpperCase()}</span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 text-[12px]"><span className="truncate font-semibold text-ink">@{p.handle}</span><span className="text-ink-3">{p.ago}</span></div>
                <p className="truncate text-[11.5px] text-ink-2">{p.text}</p>
                <div className="mt-0.5 flex items-center gap-3 text-[10.5px] text-ink-3">
                  <span className="inline-flex items-center gap-1"><ThumbsUp className="h-3 w-3" />{p.likes}</span>
                  <span className="inline-flex items-center gap-1"><MessageSquare className="h-3 w-3" />{p.comments}</span>
                </div>
              </div>
              <PostChart seed={p.seed} />
            </li>
          ))}
        </ul>
      ) : (
        <div className="mt-3 flex flex-1 flex-col justify-between gap-3 rounded-2xl p-1">
          <div className="flex gap-3">
            <GlassIcon name={r.locked ? "shield" : "community"} size={40} />
            <p className="text-sm leading-relaxed text-ink-2">{r.rule}</p>
          </div>
          <div className="flex items-center justify-between gap-2 text-xs text-ink-3">
            <span className="inline-flex items-center gap-1.5">{r.locked && <Lock className="h-3.5 w-3.5" />}{r.locked ? "Verification required" : "Posting opens in the community phase"}</span>
            <Link href="/app/settings/profile" className="font-medium text-accent hover:underline">Set up profile</Link>
          </div>
        </div>
      )}
      {tab === "General" && <p className="mt-1 text-[11px] text-ink-3">Example posts that show the feed. Posting opens in the community phase.</p>}
    </Glass>
  );
}

function PostChart({ seed }: { seed: number }) {
  const v = useMemo(() => sampleCandles({ seed, count: 30, start: 100, vol: 0.008, drift: 0.05 }).map((c) => c.c), [seed]);
  return (
    <div className="hidden h-[42px] w-[76px] shrink-0 overflow-hidden rounded-lg bg-[var(--surface-inset)] p-1 min-[400px]:block">
      <Sparkline values={v} up={v.at(-1)! >= v[0]!} width={68} height={34} className="h-full w-full" />
    </div>
  );
}

/* ───────── Positions and trades ───────── */

export interface PositionRow { id: string; symbol: string; side: string; volume: number; openPrice: number; currentPrice: number | null; floatingPnl: number | null; stopLoss: number | null; takeProfit: number | null }
export interface TradeRow { id: string; symbol: string; side: string; net: number; closeTime: string }

const dp = (sym: string) => (sym.includes("JPY") || sym === "DXY" ? 3 : /US30|NAS|SPX/.test(sym) ? 0 : sym.startsWith("XA") ? 2 : 5);

export function PositionsCard({ rows, currency, sample, connected }: { rows: PositionRow[]; currency: string; sample: boolean; connected: boolean }) {
  return (
    <Glass className="min-w-0 p-4 sm:p-5">
      <CardHead title="Open Positions" href="/app/journal">{sample && <SampleBadge label="Sample" />}</CardHead>
      {rows.length === 0 ? (
        <p className="mt-6 pb-4 text-center text-sm text-ink-3">{connected ? "No open positions right now." : "Open positions appear here once your MetaTrader account is connected."}</p>
      ) : (
        <>
        <ul className="num mt-2 sm:hidden">
          {rows.map((r) => (
            <li key={r.id}>
              <Link href={`/app/journal?symbol=${encodeURIComponent(r.symbol)}`} className="flex items-center gap-3 border-t border-line py-3 first:border-t-0" title={`View ${r.symbol} history`}>
                <InstrumentIcon symbol={r.symbol} className="h-8 w-8 text-[10px]" />
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-2 text-[14px] font-semibold text-ink">{r.symbol}<span className={cn("rounded-full px-1.5 py-0.5 text-[10.5px] font-semibold", r.side === "buy" ? "bg-up-soft text-up" : "bg-down-soft text-down")}>{r.side === "buy" ? "Buy" : "Sell"} {fmtNumber(r.volume, 2)}</span></span>
                  <span className="block truncate text-[11.5px] text-ink-3">{fmtNumber(r.openPrice, dp(r.symbol))} → {r.currentPrice === null ? "—" : fmtNumber(r.currentPrice, dp(r.symbol))}{r.stopLoss !== null ? ` · SL ${fmtNumber(r.stopLoss, dp(r.symbol))}` : ""}</span>
                </span>
                <span className={cn("text-[14px] font-semibold", (r.floatingPnl ?? 0) >= 0 ? "text-up" : "text-down")}>{r.floatingPnl === null ? "—" : fmtSignedMoney(r.floatingPnl, currency)}</span>
              </Link>
            </li>
          ))}
        </ul>
        <div className="mt-3 hidden overflow-x-auto sm:block">
          <table className="w-full min-w-[680px] text-left text-sm">
            <thead><tr className="text-[11px] text-ink-3">{["Symbol", "Side", "Size", "Entry", "Current", "P&L", "SL", "TP", "Actions"].map((h) => <th key={h} className={cn("pb-2 font-medium", h === "Actions" && "text-center")}>{h}</th>)}</tr></thead>
            <tbody className="num">
              {rows.map((r) => (
                <tr key={r.id} className="border-t border-line">
                  <td className="py-2.5"><span className="flex items-center gap-2 font-medium text-ink"><InstrumentIcon symbol={r.symbol} className="h-6 w-6 text-[9px]" />{r.symbol}</span></td>
                  <td className={cn("font-medium", r.side === "buy" ? "text-up" : "text-down")}>{r.side === "buy" ? "Buy" : "Sell"}</td>
                  <td className="text-ink-2">{fmtNumber(r.volume, 2)}</td>
                  <td className="text-ink-2">{fmtNumber(r.openPrice, dp(r.symbol))}</td>
                  <td className="text-ink-2">{r.currentPrice === null ? "—" : fmtNumber(r.currentPrice, dp(r.symbol))}</td>
                  <td className={cn("font-semibold", (r.floatingPnl ?? 0) >= 0 ? "text-up" : "text-down")}>{r.floatingPnl === null ? "—" : fmtSignedMoney(r.floatingPnl, currency)}</td>
                  <td className="text-ink-3">{r.stopLoss === null ? "—" : fmtNumber(r.stopLoss, dp(r.symbol))}</td>
                  <td className="text-ink-3">{r.takeProfit === null ? "—" : fmtNumber(r.takeProfit, dp(r.symbol))}</td>
                  <td className="text-center"><Link href={`/app/journal?symbol=${encodeURIComponent(r.symbol)}`} className="inset inline-flex h-7 items-center rounded-lg px-3.5 font-sans text-[11.5px] font-medium text-ink-2 hover:text-ink">View<span className="sr-only"> {r.symbol} history</span></Link></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        </>
      )}
    </Glass>
  );
}

function ago(iso: string, now: number) {
  const s = Math.max(0, (now - new Date(iso).getTime()) / 1000);
  return s < 3600 ? `${Math.max(1, Math.round(s / 60))}m ago` : s < 86_400 ? `${Math.round(s / 3600)}h ago` : `${Math.round(s / 86_400)}d ago`;
}

/** Shape-only line for sample trades, which have no recorded price path. Real trades show none. */
function TradeSpark({ id, up }: { id: string; up: boolean }) {
  const v = useMemo(() => {
    let seed = 0;
    for (const ch of id) seed = (seed * 31 + ch.charCodeAt(0)) % 9973;
    return sampleCandles({ seed, count: 24, start: 100, vol: 0.006, drift: up ? 0.3 : -0.3 }).map((c) => c.c);
  }, [id, up]);
  return <Sparkline values={v} up={up} width={56} height={20} className="ml-auto hidden h-5 w-14 shrink-0 min-[400px]:block" />;
}

export function RecentTradesCard({ rows, currency, sample, nowIso }: { rows: TradeRow[]; currency: string; sample: boolean; nowIso: string }) {
  const now = new Date(nowIso).getTime();
  return (
    <Glass className="min-w-0 p-4 sm:p-5">
      <CardHead title="Recent Trades" href="/app/journal">{sample && <SampleBadge label="Sample" />}</CardHead>
      {rows.length === 0 ? (
        <p className="mt-6 pb-4 text-center text-sm text-ink-3">Closed trades are recorded here automatically.</p>
      ) : (
        <ul className="num mt-2">
          {rows.map((t) => (
            <li key={t.id} className="flex items-center gap-3 border-t border-line py-2.5 text-sm first:border-t-0">
              <InstrumentIcon symbol={t.symbol} className="h-6 w-6 text-[9px]" />
              <span className="w-16 font-medium text-ink">{t.symbol}</span>
              <span className={cn("w-10 font-medium", t.side === "buy" ? "text-up" : "text-down")}>{t.side === "buy" ? "Buy" : "Sell"}</span>
              {sample && <span className="hidden 2xl:block"><TradeSpark id={t.id} up={t.net >= 0} /></span>}
              <span className={cn("ml-auto font-semibold", t.net >= 0 ? "text-up" : "text-down")}>{fmtSignedMoney(t.net, currency)}</span>
              <span className="w-14 shrink-0 text-right text-xs text-ink-3">{ago(t.closeTime, now)}</span>
            </li>
          ))}
        </ul>
      )}
    </Glass>
  );
}

