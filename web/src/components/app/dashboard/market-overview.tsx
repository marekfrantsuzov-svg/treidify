"use client";

import { AnimatePresence, LayoutGroup, motion } from "motion/react";
import { ArrowDownRight, ArrowRight, ArrowUpDown, ArrowUpRight, ChartNoAxesColumn, Minus } from "lucide-react";
import Link from "next/link";
import { useId, useMemo, useState } from "react";
import type { OverviewCategory, OverviewRow } from "@/server/market/overview";
import { cn } from "@/lib/cn";
import { AssetMark } from "@/components/ui/flags";
import { SlidingPill } from "@/components/ui/sliding-pill";

const CATS: ("All" | OverviewCategory)[] = ["All", "Forex", "Metals", "Indices", "Crypto"];
const SORTS = [
  { id: "default", label: "Default" },
  { id: "gainers", label: "Top gainers" },
  { id: "losers", label: "Top losers" },
  { id: "az", label: "A–Z" },
] as const;
type SortId = (typeof SORTS)[number]["id"];
const spring = { type: "spring", stiffness: 420, damping: 38, mass: 0.8 } as const;

const fmt = (v: number, d: number) => v.toLocaleString("en-US", { minimumFractionDigits: d, maximumFractionDigits: d });
const pct = (v: number) => `${v >= 0 ? "+" : "−"}${Math.abs(v).toFixed(2)}%`;

/**
 * Sparkline of the same fetched 1H closes the price and the 24h change come from (25 bars). Nothing is smoothed into
 * shapes the data does not have: straight segments between real closes, a soft fill underneath, the last close marked.
 */
function Spark({ data, up, sample }: { data: number[]; up: boolean | null; sample: boolean }) {
  const id = useId().replace(/:/g, "");
  const w = 160, h = 34, pad = 2;
  const min = Math.min(...data), max = Math.max(...data);
  const span = max - min || 1;
  const pts = data.map((v, i) => [pad + (i / (data.length - 1)) * (w - pad * 2), pad + (1 - (v - min) / span) * (h - pad * 2)] as const);
  const line = pts.map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(1)} ${y.toFixed(1)}`).join(" ");
  const area = `${line} L${pts.at(-1)![0].toFixed(1)} ${h} L${pts[0]![0].toFixed(1)} ${h} Z`;
  const color = up === null ? "var(--text-3)" : up ? "var(--up)" : "var(--down)";
  const [lx, ly] = pts.at(-1)!;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" aria-hidden className={cn(sample && "opacity-60")}>
      <defs>
        <linearGradient id={`f${id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={color} stopOpacity="0.28" />
          <stop offset="1" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#f${id})`} />
      <path d={line} fill="none" stroke={color} strokeWidth="1.6" strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" strokeDasharray={sample ? "3 3" : undefined} className="reveal-x" />
      <circle cx={lx} cy={ly} r="2.4" fill={color} vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

function TrendChip({ r }: { r: OverviewRow }) {
  if (r.status === "unavailable" || r.trend === null) return <span className="trend-chip is-flat">Not connected</span>;
  if (r.trend === "none") return <span className="trend-chip is-flat"><Minus className="h-3.5 w-3.5" />RANGE ({r.trendTf})</span>;
  const up = r.trend === "bullish";
  return <span className={cn("trend-chip", up ? "is-up" : "is-down")}>{up ? <ArrowUpRight className="h-3.5 w-3.5" /> : <ArrowDownRight className="h-3.5 w-3.5" />}{up ? "BULLISH" : "BEARISH"} ({r.trendTf})</span>;
}

function AssetCard({ r, open, onToggle }: { r: OverviewRow; open: boolean; onToggle: () => void }) {
  const up = r.changePct === null ? null : r.changePct >= 0;
  const detailId = `mo-${r.symbol}`;
  return (
    <motion.li layout="position" initial={{ opacity: 0, y: 8, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, scale: 0.97 }} transition={spring} className={cn(open && "mo-open")}>
      <div className="mo-card" aria-expanded={open}>
        <button type="button" onClick={onToggle} aria-expanded={open} aria-controls={detailId} className="absolute inset-0 z-[1] rounded-[inherit]" aria-label={`${r.symbol} details`} />
        <AssetMark symbol={r.symbol} size={30} />
        <span className="min-w-0">
          <span className="mo-sym block">{r.symbol}</span>
          <span className="mo-name block">{r.name}</span>
        </span>
        <span className="grid justify-items-end">
          <span className="num mo-price">{r.price === null ? <span className="font-normal text-ink-3">—</span> : fmt(r.price, r.digits)}</span>
          <span className={cn("num mo-chg inline-flex items-center gap-0.5", up === null ? "text-ink-3" : up ? "text-up-ink" : "text-down-ink")}>
            {up === null ? "—" : <>{up ? <ArrowUpRight className="h-3.5 w-3.5" /> : <ArrowDownRight className="h-3.5 w-3.5" />}{pct(r.changePct!)}</>}
          </span>
        </span>
        <div className="mo-spark">
          {r.spark ? <Spark data={r.spark} up={up} sample={r.status === "sample"} /> : <div className="grid h-full place-items-center rounded-lg bg-[repeating-linear-gradient(90deg,var(--border)_0_6px,transparent_6px_12px)] bg-[length:100%_1px] bg-center bg-no-repeat"><span className="rounded-md bg-[var(--surface-strong)] px-2 text-[11px] text-ink-3">No provider data</span></div>}
        </div>
        <div className="col-span-full flex items-center justify-between gap-2">
          <TrendChip r={r} />
          {r.status === "sample" ? <span className="rounded-md bg-warn-soft px-1.5 py-0.5 text-[10.5px] font-semibold text-warn">Sample</span> : r.status === "live" ? <span className="text-[11px] text-ink-3">24h · 1H bars</span> : null}
        </div>
        <AnimatePresence initial={false}>
          {open && (
            <motion.div id={detailId} key="d" className="mo-detail relative z-[2]" initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}>
              <dl className="mo-stats">
                <div><dt>24h high</dt><dd className="num">{r.high24 === null ? "—" : fmt(r.high24, r.digits)}</dd></div>
                <div><dt>24h low</dt><dd className="num">{r.low24 === null ? "—" : fmt(r.low24, r.digits)}</dd></div>
                <div><dt>Structure</dt><dd>{r.trend === null ? "—" : r.trend === "none" ? "Range" : r.trend === "bullish" ? "Higher highs" : "Lower lows"}{r.trendTf ? ` · ${r.trendTf}` : ""}</dd></div>
              </dl>
              <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2">
                <p className="text-[11.5px] leading-snug text-ink-3">Trend is read from swings and BOS / CHOCH, not from the 24h change.</p>
                <Link href={`/app/markets?symbol=${r.symbol}`} className="press inline-flex h-8 items-center gap-1.5 rounded-full bg-accent-soft px-3 text-[12.5px] font-semibold text-accent">Open chart<ArrowRight className="h-3.5 w-3.5" /></Link>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.li>
  );
}

/**
 * Market Overview: interactive asset cards with the real 24h series behind each price. Category filter and sorting
 * re-flow the cards with a short spring; selecting a card opens its 24h range and structure. Rows without a provider
 * stay listed as not connected, never filled with invented numbers.
 */
export function OverviewCard({ rows }: { rows: OverviewRow[] }) {
  const [cat, setCat] = useState<(typeof CATS)[number]>("All");
  const [sort, setSort] = useState<SortId>("default");
  const [open, setOpen] = useState<string | null>(null);
  const shown = useMemo(() => {
    const list = rows.filter((r) => cat === "All" || r.category === cat);
    const ch = (r: OverviewRow) => r.changePct ?? (sort === "gainers" ? -Infinity : Infinity);
    if (sort === "gainers") return [...list].sort((a, b) => ch(b) - ch(a));
    if (sort === "losers") return [...list].sort((a, b) => ch(a) - ch(b));
    if (sort === "az") return [...list].sort((a, b) => a.symbol.localeCompare(b.symbol));
    return list;
  }, [rows, cat, sort]);
  const anySample = rows.some((r) => r.status === "sample");
  const live = rows.filter((r) => r.status === "live").length;
  const sortLabel = SORTS.find((s) => s.id === sort)!.label;
  const nextSort = () => setSort(SORTS[(SORTS.findIndex((s) => s.id === sort) + 1) % SORTS.length]!.id);

  return (
    <section id="market-overview" aria-labelledby="ov-title" className="dcard dcard-pad d-overview flex flex-col">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <h2 id="ov-title" className="dcard-title"><ChartNoAxesColumn />Market Overview</h2>
        {live > 0 && <span className="inline-flex items-center gap-1.5 text-[11.5px] font-medium text-ink-3"><span className="mo-dot" aria-hidden />{live} live</span>}
        <Link href="/app/markets" className="see-all ml-auto">See All<ArrowRight /></Link>
      </div>
      <div className="mo-toolbar mt-3">
        <div role="tablist" aria-label="Category" className="relative flex min-w-0 flex-1 gap-1 overflow-x-auto [scrollbar-width:none]">
          <SlidingPill watch={cat} className="rounded-full bg-accent shadow-[0_8px_18px_-10px_var(--accent-glow)]" />
          {CATS.map((c) => (
            <button key={c} role="tab" aria-selected={cat === c} data-active={cat === c} onClick={() => { setCat(c); setOpen(null); }} className={cn("relative z-[1] shrink-0 rounded-full px-3 py-1.5 text-[12.5px] font-medium transition-colors duration-150", cat === c ? "text-white" : "text-ink-2 hover:text-ink")}>{c}</button>
          ))}
        </div>
        <button type="button" onClick={nextSort} className="mo-sort" aria-label={`Sort: ${sortLabel}. Change sort`}><ArrowUpDown className="h-3.5 w-3.5" />{sortLabel}</button>
      </div>
      <LayoutGroup>
        <motion.ul layout className="mo-grid" aria-live="polite">
          <AnimatePresence mode="popLayout" initial={false}>
            {shown.map((r) => <AssetCard key={r.symbol} r={r} open={open === r.symbol} onToggle={() => setOpen((o) => (o === r.symbol ? null : r.symbol))} />)}
          </AnimatePresence>
          {shown.length === 0 && <li className="col-span-full py-4 text-center text-[13px] text-ink-3">No {cat.toLowerCase()} instruments tracked yet.</li>}
        </motion.ul>
      </LayoutGroup>
      <p className="mt-auto pt-3 text-[11px] text-ink-3">Prices, change and sparklines come from the last 25 hourly bars the data provider returned. Trend = market structure on the timeframe shown.{anySample ? " Gold, Silver and DXY use labelled sample bars." : ""}</p>
    </section>
  );
}
