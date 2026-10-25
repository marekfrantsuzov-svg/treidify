"use client";

import { ArrowRight, Lock } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { sampleSeries } from "@/lib/demo/markets";
import { sampleCandles } from "@/lib/demo/sample";
import { cn } from "@/lib/cn";
import { fmtNumber, fmtPct, fmtSignedMoney } from "@/lib/format";
import { Sparkline } from "@/components/charts/sparkline";
import { GlassIcon, type GlassIconName } from "@/components/icons/glass-icon";
import { InstrumentIcon } from "@/components/previews/parts";
import { Glass } from "@/components/ui/glass";
import { Pill, SampleBadge } from "@/components/ui/pill";

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
    <div role="tablist" aria-label={label} className="mt-3 flex gap-1 overflow-x-auto [scrollbar-width:none]">
      {tabs.map((t) => (
        <button key={t} role="tab" aria-selected={value === t} onClick={() => onChange(t)} className={cn("shrink-0 rounded-full px-3 py-1 text-xs font-medium text-ink-3 transition-colors hover:text-ink", value === t ? "bg-[var(--text)] text-[var(--bg-0)] hover:text-[var(--bg-0)]" : "inset")}>
          {t}
        </button>
      ))}
    </div>
  );
}

/* ───────── News ───────── */

const NEWS_CATEGORIES: { icon: GlassIconName; title: string; note: string; hue: string }[] = [
  { icon: "dollar", title: "Central banks", note: "Fed, ECB and other speakers, decisions and minutes", hue: "from-[#1d5cf5]/30 via-[#6aa2ff]/15" },
  { icon: "macro", title: "Geopolitics", note: "Conflicts, sanctions and tariffs that move gold and the dollar", hue: "from-[#e0394a]/25 via-[#ff8a5b]/12" },
  { icon: "markets", title: "Energy and yields", note: "Oil supply, Treasury yields, inflation and jobs data", hue: "from-[#b7791f]/30 via-[#f5b44a]/12" },
];

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

export function NewsCard({ connected }: { connected: boolean }) {
  return (
    <Glass className="flex min-w-0 flex-col p-4 sm:p-5">
      <CardHead title="Next Important News" href="/app/news" />
      <ul className="mt-3 grid flex-1 gap-2.5">
        {NEWS_CATEGORIES.map((c) => (
          <li key={c.title}>
            <Link href="/app/news" className="group flex items-center gap-3 rounded-2xl p-1.5 transition-colors hover:bg-[var(--surface-inset)]">
              <NewsArt icon={c.icon} hue={c.hue} className="h-[62px] w-[92px]" />
              <div className="min-w-0">
                <div className="text-sm font-semibold text-ink">{c.title}</div>
                <div className="line-clamp-2 text-xs text-ink-3">{c.note}</div>
              </div>
            </Link>
          </li>
        ))}
      </ul>
      <p className="mt-3 text-xs text-ink-3">{connected ? "Latest events with sources and timestamps." : "Live headlines with sources, licensed photos and impact on gold and the dollar appear here once the news feed is connected. Nothing is invented in the meantime."}</p>
    </Glass>
  );
}

/* ───────── Macro Desk ───────── */

const MACRO = [
  { id: "XAUUSD", name: "XAUUSD", series: () => sampleSeries("XAUUSD", "4H").map((c) => c.c), digits: 2, icon: "XAUUSD" },
  { id: "DXY", name: "DXY", series: () => sampleSeries("DXY", "4H").map((c) => c.c), digits: 3, icon: "DXY" },
  { id: "SILVER", name: "Silver", series: () => sampleSeries("XAGUSD", "4H").map((c) => c.c), digits: 2, icon: "XAGUSD" },
  { id: "US10Y", name: "US 10Y", series: () => sampleCandles({ seed: 77, count: 140, start: 4.31, vol: 0.006, drift: 0.01 }).map((c) => c.c), digits: 3, icon: "US10Y", pct: true },
] as const;

export function MacroCard() {
  const [tab, setTab] = useState("Overview");
  const router = useRouter();
  const rows = useMemo(() => MACRO.map((m) => { const v = m.series().slice(-40); const last = v.at(-1)!, first = v[0]!; return { ...m, values: v, last, chg: ((last - first) / first) * 100 }; }), []);
  const shown = tab === "Overview" ? rows : rows.filter((r) => r.name.toLowerCase().includes(tab.toLowerCase().replace("yields", "10y")));
  return (
    <Glass className="min-w-0 p-4 sm:p-5">
      <CardHead title="Macro Desk" href="/app/macro"><SampleBadge label="Sample" /></CardHead>
      <Tabs label="Macro view" tabs={["Overview", "XAUUSD", "DXY", "Silver", "Yields"]} value={tab} onChange={setTab} />
      <div className="mt-3 grid grid-cols-2 gap-2.5">
        {shown.map((r) => {
          const up = r.chg >= 0;
          return (
            <button key={r.id} onClick={() => router.push(`/app/macro#${r.id.toLowerCase()}`)} className="inset min-w-0 rounded-2xl p-3 text-left transition-shadow hover:shadow-[var(--shadow)]">
              <div className="flex items-center gap-2">
                {r.id === "US10Y" ? <GlassIcon name="yield" size={24} /> : <InstrumentIcon symbol={r.icon} className="h-6 w-6 text-[9px]" />}
                <span className="truncate text-[11.5px] font-semibold text-ink-2">{r.name}</span>
              </div>
              <div className="mt-1.5 flex items-end justify-between gap-2">
                <div className="min-w-0">
                  <div className="num truncate text-[14px] font-semibold text-ink">{fmtNumber(r.last, r.digits)}{"pct" in r && "%"}</div>
                  <div className={cn("num text-[11px] font-medium", up ? "text-up" : "text-down")}>{fmtPct(r.chg, 2, true)}</div>
                </div>
                <Sparkline values={r.values} up={up} width={60} height={28} className="h-7 w-[38%] max-w-[72px] shrink-0" />
              </div>
            </button>
          );
        })}
      </div>
    </Glass>
  );
}

/* ───────── AI Chart Analysis ───────── */

export function AiAnalysisCard({ aiConnected, recent }: { aiConnected: boolean; recent: { id: string; thumb: string | null }[] }) {
  const router = useRouter();
  const [drag, setDrag] = useState(false);
  const open = () => router.push("/app/ai-analysis");
  return (
    <Glass className="min-w-0 p-4 sm:p-5">
      <CardHead title="AI Chart Analysis" href="/app/ai-analysis">{!aiConnected && <Pill>Not connected</Pill>}</CardHead>
      <div className="mt-3 grid gap-3 sm:grid-cols-[1fr_auto]">
        <button
          onClick={open}
          onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
          onDragLeave={() => setDrag(false)}
          onDrop={(e) => { e.preventDefault(); setDrag(false); open(); }}
          className={cn("inset grid place-items-center gap-2 rounded-2xl border-dashed px-4 py-6 text-center transition-colors", drag && "border-accent bg-accent-soft")}
        >
          <GlassIcon name="ai" size={44} />
          <span className="text-sm text-ink-2">Drag and drop a chart screenshot<br />or upload an image</span>
          <span className="text-[11px] text-ink-3">PNG, JPG or WebP up to 10 MB</span>
        </button>
        <div className="hidden w-[118px] grid-rows-3 gap-2 sm:grid">
          {[0, 1, 2].map((i) => {
            const r = recent[i];
            return r?.thumb ? (
              // eslint-disable-next-line @next/next/no-img-element -- user's own re-encoded thumbnail
              <Link key={r.id} href={`/app/ai-analysis/${r.id}`}><img src={r.thumb} alt="Analysed chart" className="h-full w-full rounded-xl object-cover" /></Link>
            ) : (
              <div key={i} className="inset grid place-items-center rounded-xl text-[10px] text-ink-3">{i === 0 && "Your charts"}</div>
            );
          })}
        </div>
      </div>
      <button onClick={open} className="mt-3 flex h-11 w-full items-center justify-center gap-2 rounded-2xl bg-[linear-gradient(180deg,#16203a,#0b1222)] text-sm font-medium text-white shadow-[0_8px_20px_-8px_rgba(10,20,40,0.6)] dark:bg-[linear-gradient(180deg,#2a63f0,#1a4fd0)]">
        <GlassIcon name="ai" size={26} active /> Analyse with AI <ArrowRight className="h-4 w-4" />
      </button>
    </Glass>
  );
}

/* ───────── Community ───────── */

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
      <CardHead title="Community" href="/app/community" />
      <Tabs label="Community room" tabs={Object.keys(rooms)} value={tab} onChange={setTab} />
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
    </Glass>
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
        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[620px] text-left text-sm">
            <thead><tr className="text-[11px] text-ink-3">{["Symbol", "Side", "Size", "Entry", "Current", "P&L", "SL", "TP"].map((h) => <th key={h} className="pb-2 font-medium">{h}</th>)}</tr></thead>
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
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Glass>
  );
}

function ago(iso: string, now: number) {
  const s = Math.max(0, (now - new Date(iso).getTime()) / 1000);
  return s < 3600 ? `${Math.max(1, Math.round(s / 60))}m ago` : s < 86_400 ? `${Math.round(s / 3600)}h ago` : `${Math.round(s / 86_400)}d ago`;
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
              <span className={cn("ml-auto font-semibold", t.net >= 0 ? "text-up" : "text-down")}>{fmtSignedMoney(t.net, currency)}</span>
              <span className="w-16 text-right text-xs text-ink-3">{ago(t.closeTime, now)}</span>
            </li>
          ))}
        </ul>
      )}
    </Glass>
  );
}

