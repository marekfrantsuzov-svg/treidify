"use client";

import { useId, useState } from "react";
import type { BiasLabel, ScoreComponent } from "@/lib/intelligence";
import { cn } from "@/lib/cn";
import { Modal } from "./modal";

/**
 * Automotive boost-style gauge. The needle maps the engine score (-100..+100) onto a 240° sweep; the label comes
 * from the engine's documented thresholds (±25), never from the needle position. Tap for the full breakdown.
 */
const SWEEP = 240, START = -120;
const angleFor = (score: number) => START + ((Math.max(-100, Math.min(100, score)) + 100) / 200) * SWEEP;
// Rounded so server and browser trig agree to the last digit (avoids hydration mismatches).
const r2 = (n: number) => Math.round(n * 100) / 100;
const polar = (cx: number, cy: number, r: number, deg: number) => { const a = ((deg - 90) * Math.PI) / 180; return [r2(cx + r * Math.cos(a)), r2(cy + r * Math.sin(a))] as const; };
const arc = (cx: number, cy: number, r: number, a0: number, a1: number) => { const [x0, y0] = polar(cx, cy, r, a0), [x1, y1] = polar(cx, cy, r, a1); return `M ${x0} ${y0} A ${r} ${r} 0 ${a1 - a0 > 180 ? 1 : 0} 1 ${x1} ${y1}`; };

import { biasText, biasTone } from "./bias";
export { biasText, biasTone };

export interface GaugeProps {
  title: string; subtitle: string; bias: BiasLabel; score: number | null; confidence?: string | null;
  components?: ScoreComponent[]; detail?: string; limitations?: string[]; invalidation?: string | null; asOf?: string; sample?: boolean;
}

export function Gauge(p: GaugeProps) {
  const [open, setOpen] = useState(false);
  const id = useId().replace(/[^a-zA-Z0-9]/g, "");
  const cx = 110, cy = 110, R = 86;
  const needle = p.score === null ? START + SWEEP / 2 : angleFor(p.score);
  const ticks = Array.from({ length: 41 }, (_, i) => i);
  return (
    <>
      <button onClick={() => setOpen(true)} className="group press relative grid w-full min-w-0 justify-items-center rounded-[28px] px-0 pb-3 pt-1 sm:px-2 text-center outline-none focus-visible:ring-2 focus-visible:ring-accent" aria-label={`${p.title}: ${biasText[p.bias]}${p.score !== null ? `, score ${p.score}` : ""}. Show how this is calculated.`}>
        <svg viewBox="0 -14 220 196" className="w-full max-w-[260px] overflow-visible" aria-hidden>
          <defs>
            <linearGradient id={`${id}-band`} x1="0" y1="0" x2="1" y2="0">
              <stop offset="0" stopColor="var(--down)" /><stop offset=".42" stopColor="var(--silver)" stopOpacity=".55" /><stop offset=".58" stopColor="var(--silver)" stopOpacity=".55" /><stop offset="1" stopColor="var(--up)" />
            </linearGradient>
            <radialGradient id={`${id}-face`} cx=".5" cy=".38" r=".7"><stop offset="0" stopColor="var(--surface-strong)" /><stop offset="1" stopColor="var(--surface-inset)" /></radialGradient>
            <linearGradient id={`${id}-needle`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="var(--brand-pink, #ed74ce)" /><stop offset="1" stopColor="var(--accent)" /></linearGradient>
            <filter id={`${id}-glow`} x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="3" /></filter>
          </defs>
          {/* bezel and face */}
          <circle cx={cx} cy={cy} r={R + 14} fill={`url(#${id}-face)`} stroke="var(--border-strong)" />
          <path d={arc(cx, cy, R + 12, -70, 70)} stroke="var(--highlight)" strokeWidth="2" fill="none" opacity=".9" />
          {/* colour band */}
          <path d={arc(cx, cy, R, START, START + SWEEP)} stroke="var(--chart-grid)" strokeWidth="12" fill="none" strokeLinecap="round" />
          <path d={arc(cx, cy, R, START, START + SWEEP)} stroke={`url(#${id}-band)`} strokeWidth="5" fill="none" strokeLinecap="round" opacity=".9" />
          {/* threshold marks at -25 and +25 */}
          {[-25, 25].map((s) => { const [x0, y0] = polar(cx, cy, R - 10, angleFor(s)), [x1, y1] = polar(cx, cy, R + 7, angleFor(s)); return <line key={s} x1={x0} y1={y0} x2={x1} y2={y1} stroke="var(--text-3)" strokeWidth="1.5" />; })}
          {ticks.map((i) => { const a = START + (i / 40) * SWEEP, major = i % 10 === 0; const [x0, y0] = polar(cx, cy, R - (major ? 20 : 15), a), [x1, y1] = polar(cx, cy, R - 11, a); return <line key={i} x1={x0} y1={y0} x2={x1} y2={y1} stroke="var(--text-3)" strokeWidth={major ? 1.6 : 0.8} opacity={major ? 0.9 : 0.45} />; })}
          {(["Bear", "Bull"] as const).map((t, i) => { const [x, y] = polar(cx, cy, R + 4, [-128, 128][i]!); return <text key={t} x={x + (i ? 6 : -6)} y={y + 16} textAnchor="middle" fontSize="9" fontWeight="700" fill={i ? "var(--up)" : "var(--down)"} letterSpacing=".08em">{t.toUpperCase()}</text>; })}
          <text x={cx} y={cy - R - 18} textAnchor="middle" fontSize="9" fontWeight="700" fill="var(--text-3)" letterSpacing=".08em">NEUTRAL</text>
          {/* needle */}
          <g style={{ transform: `rotate(${needle}deg)`, transformOrigin: `${cx}px ${cy}px` }} className="transition-transform duration-[1200ms] ease-[cubic-bezier(.34,1.3,.5,1)] motion-reduce:transition-none">
            {p.score !== null && <path d={`M ${cx - 3} ${cy} L ${cx} ${cy - R + 6} L ${cx + 3} ${cy} Z`} fill={`url(#${id}-needle)`} filter={`url(#${id}-glow)`} opacity=".7" />}
            <path d={`M ${cx - 2.6} ${cy + 10} L ${cx} ${cy - R + 6} L ${cx + 2.6} ${cy + 10} Z`} fill={p.score === null ? "var(--text-3)" : `url(#${id}-needle)`} opacity={p.score === null ? 0.35 : 1} />
          </g>
          <circle cx={cx} cy={cy} r="9" fill="var(--surface-strong)" stroke="var(--border-strong)" />
          <circle cx={cx} cy={cy} r="3.5" fill="var(--accent)" />
          <text x={cx} y={cy + 38} textAnchor="middle" fontSize="23" fontWeight="700" letterSpacing="-.02em" fill="var(--text)" className="num">{p.score === null ? "—" : `${p.score > 0 ? "+" : ""}${p.score}`}</text>
        </svg>
        <div className="mt-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-ink-3 sm:text-[11px] sm:tracking-[0.16em]">{p.title}</div>
        <div className={cn("text-[15px] font-semibold tracking-[-0.02em] sm:text-[19px]", biasTone[p.bias])}>{biasText[p.bias]}</div>
        <div className="hidden text-xs text-ink-3 sm:block">{p.subtitle}{p.confidence ? ` · ${p.confidence} confidence` : ""}</div>
        <span className="mt-1 text-[11px] font-medium text-accent opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">How is this calculated?</span>
      </button>
      <Modal open={open} onClose={() => setOpen(false)} title={`${p.title}: ${biasText[p.bias]}`} subtitle={<>{p.score !== null ? `Score ${p.score > 0 ? "+" : ""}${p.score} of ±100` : "No score"}{p.asOf ? ` · calculated ${new Date(p.asOf).toLocaleString([], { hour: "2-digit", minute: "2-digit", day: "numeric", month: "short" })}` : ""}{p.sample ? " · SAMPLE bars, not a market reading" : ""}</>}>
        <p className="text-sm text-ink-2">Bullish at +25 or more, bearish at −25 or less, neutral in between. Each input is scored from −1 to +1 and weighted; inputs without enough data are left out, never guessed.</p>
        {p.detail && <p className="mt-3 text-sm text-ink">{p.detail}</p>}
        {p.components && (
          <ul className="mt-4 grid gap-2">
            {p.components.map((c) => (
              <li key={c.id} className="inset rounded-2xl px-4 py-3">
                <div className="flex items-center justify-between gap-3 text-sm"><span className="font-medium text-ink">{c.label}</span>
                  <span className="num text-xs text-ink-3">weight {c.weight} · <span className={cn("font-semibold", c.contribution === null ? "text-ink-3" : c.contribution > 0 ? "text-up" : c.contribution < 0 ? "text-down" : "text-ink-2")}>{c.contribution === null ? "not used" : `${c.contribution > 0 ? "+" : ""}${c.contribution.toFixed(1)}`}</span></span></div>
                <p className="mt-1 text-[13px] text-ink-2">{c.detail}</p>
              </li>
            ))}
          </ul>
        )}
        {p.invalidation && <p className="mt-4 rounded-2xl bg-warn-soft px-4 py-3 text-sm text-ink"><b>What would change this:</b> {p.invalidation}</p>}
        {!!p.limitations?.length && <ul className="mt-3 grid gap-1 text-[13px] text-ink-3">{p.limitations.map((l, i) => <li key={i}>• {l}</li>)}</ul>}
        <p className="mt-4 text-xs text-ink-3">Methodology: structure-first, documented in the Treidify intelligence methodology. Analysis, not advice.</p>
      </Modal>
    </>
  );
}
