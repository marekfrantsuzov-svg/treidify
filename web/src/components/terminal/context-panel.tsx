"use client";

import { ArrowDownRight, ArrowUpRight, ChevronRight, Droplets, Layers3, Ruler, Spline } from "lucide-react";
import type { SDZone, TfOverlays } from "@/lib/intelligence/overlays";
import { cn } from "@/lib/cn";
import { fmtPrice, statusText } from "./zone-detail";

/** Compact lists of what the chart is drawing for the selected timeframe. Click a zone to select it on the chart. */
export function ZoneList({ o, selected, onSelect, max = 6 }: { o: TfOverlays; selected?: string | null; onSelect: (z: SDZone) => void; max?: number }) {
  const zones = [...o.zones].sort((a, b) => rank(a) - rank(b)).slice(0, max);
  if (!zones.length) return <p className="text-[12.5px] text-ink-3">No {o.tf} supply or demand zone qualifies on these bars. Nothing is drawn rather than a guess.</p>;
  return (
    <ul className="grid gap-1.5">
      {zones.map((z) => {
        const buy = z.side === "buy";
        return (
          <li key={z.id}>
            <button type="button" onClick={() => onSelect(z)} aria-pressed={selected === z.id} className={cn("zl-item", buy ? "is-buy" : "is-sell", selected === z.id && "is-selected", (z.status === "invalidated" || z.status === "historical") && "is-dead")}>
              <span className="zl-side">{buy ? <ArrowUpRight /> : <ArrowDownRight />}</span>
              <span className="min-w-0 flex-1 text-left">
                <span className="block text-[11px] font-bold uppercase tracking-[0.08em]">{buy ? "Buy zone" : "Sell zone"} <span className="font-semibold normal-case tracking-normal text-ink-3">· {z.tf} · {statusText[z.status]}</span></span>
                <span className="num block text-[14px] font-semibold text-ink">{fmtPrice(z.lower, o.digits)} – {fmtPrice(z.upper, o.digits)}</span>
              </span>
              <span className={cn("num shrink-0 rounded-full px-2 py-0.5 text-[11px] font-bold", z.stop.eligible ? "bg-up-soft text-up" : "bg-warn-soft text-warn")} title="Structural stop distance">{z.stop.pips} {z.stop.unit === "pip" ? "p" : "pt"}</span>
              <ChevronRight className="h-4 w-4 shrink-0 text-ink-3" />
            </button>
          </li>
        );
      })}
    </ul>
  );
}
const rank = (z: SDZone) => ({ active: 0, tested: 1, invalidated: 2, historical: 3 })[z.status];

export function FibTable({ o, side }: { o: TfOverlays; side: "bullish" | "bearish" | "active" }) {
  const s = side === "active" ? (o.fib.active ? o.fib[o.fib.active] : null) : o.fib[side];
  if (!s) return <p className="text-[12.5px] text-ink-3">No qualifying {o.tf} {side === "active" ? "" : `${side} `}swing leg, so no Fibonacci is drawn.</p>;
  const last = o.last;
  return (
    <div>
      <div className="mb-2 flex flex-wrap items-center gap-1.5 text-[11.5px]">
        <span className={cn("chip font-semibold", s.direction === "bullish" ? "text-up" : "text-down")}>{s.direction === "bullish" ? "Bullish retracement" : "Bearish retracement"}</span>
        <span className="chip num">{o.tf} · {fmtPrice(s.from.price, o.digits)} → {fmtPrice(s.to.price, o.digits)}</span>
        {o.fib.active === s.direction && <span className="chip font-semibold text-accent">Active anchor</span>}
      </div>
      <div className="fib-grid" role="table" aria-label={`${o.tf} Fibonacci levels`}>
        {s.levels.map((l) => {
          const near = last !== null && o.atr !== null && Math.abs(last - l.price) <= o.atr * 0.5;
          return (
            <div key={l.ratio} role="row" className={cn("fib-cell", (l.ratio === 0.618 || l.ratio === 0.786) && "is-golden", near && "is-near")}>
              <span role="cell" className="fib-pct">{(l.ratio * 100).toFixed(1)}%</span>
              <span role="cell" className="num fib-price">{fmtPrice(l.price, o.digits)}</span>
            </div>
          );
        })}
      </div>
      <p className="mt-2 text-[11.5px] text-ink-3">Anchored from the {s.direction === "bullish" ? "swing low" : "swing high"} that began the latest {o.tf} leg to its extreme. Recalculated on every timeframe change.</p>
    </div>
  );
}

export function LiquidityList({ o }: { o: TfOverlays }) {
  if (!o.liquidity.length) return <p className="text-[12.5px] text-ink-3">No clustered or recent swing liquidity near price on {o.tf}.</p>;
  const sorted = [...o.liquidity].sort((a, b) => b.price - a.price);
  return (
    <ul className="grid gap-1">
      {sorted.map((b) => (
        <li key={b.id} className={cn("liq-row", b.side === "buy" ? "is-bsl" : "is-ssl", b.state !== "unswept" && "is-swept")}>
          <span className="liq-bar" aria-hidden />
          <span className="min-w-0 flex-1">
            <span className="block text-[12px] font-semibold text-ink">{b.side === "buy" ? "Buy-side" : "Sell-side"} · {b.kind === "equal-highs" ? `Equal highs (${b.swings})` : b.kind === "equal-lows" ? `Equal lows (${b.swings})` : b.kind === "swing-high" ? "Previous swing high" : "Previous swing low"}</span>
            <span className="block text-[11px] text-ink-3">{b.state === "unswept" ? `${b.estimate} estimated liquidity, unswept` : b.state === "swept" ? "Swept: wick through, closed back" : "Taken: closed through"}</span>
          </span>
          <span className="num text-[13px] font-semibold text-ink">{fmtPrice(b.price, o.digits)}</span>
        </li>
      ))}
    </ul>
  );
}

export function StructureTimeline({ o, max = 6 }: { o: TfOverlays; max?: number }) {
  const ev = o.structure.events.slice(-max).reverse();
  if (!ev.length) return <p className="text-[12.5px] text-ink-3">No confirmed {o.tf} break of structure yet.</p>;
  return (
    <ol className="timeline">
      {ev.map((e) => (
        <li key={`${e.kind}-${e.index}`} className={cn("tl-item", e.direction === "bullish" ? "is-bull" : "is-bear")}>
          <span className="tl-dot" aria-hidden />
          <span className="text-[12.5px] font-semibold text-ink">{e.direction === "bullish" ? "Bullish" : "Bearish"} {e.kind === "BOS" ? "break of structure" : "change of character"} <span className="font-medium text-ink-3">({e.kind})</span></span>
          <span className="num block text-[11.5px] text-ink-3">Close through {fmtPrice(e.level, o.digits)} · {new Date(e.t * 1000).toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}</span>
        </li>
      ))}
    </ol>
  );
}

export function PanelSection({ icon, title, children, aside }: { icon: React.ReactNode; title: string; children: React.ReactNode; aside?: React.ReactNode }) {
  return (
    <section className="cp-section">
      <header className="mb-2 flex items-center justify-between gap-2">
        <h3 className="flex items-center gap-2 text-[13px] font-semibold text-ink"><span className="cp-icon" aria-hidden>{icon}</span>{title}</h3>
        {aside}
      </header>
      {children}
    </section>
  );
}

export const PanelIcons = { zones: <Layers3 />, fib: <Ruler />, liquidity: <Droplets />, structure: <Spline /> };
