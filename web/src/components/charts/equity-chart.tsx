"use client";

import { motion, useReducedMotion } from "motion/react";
import { useMemo, useState } from "react";
import { smoothPath } from "./smooth";
import { fmtMoney, fmtSignedMoney } from "@/lib/format";
import { useWidth } from "./use-width";

export interface EquityPoint {
  t: number;
  equity: number;
  /** Realized P&L of the step that produced this point, for the tooltip breakdown. */
  delta?: number;
}

/** Equity curve with hover/touch tooltip and a shaded drawdown-from-peak band. */
export function EquityChart({ points, height = 220, currency = "USD", showDrawdown = true, animate = true, label = "Equity curve" }: {
  points: EquityPoint[]; height?: number; currency?: string; showDrawdown?: boolean; animate?: boolean; label?: string;
}) {
  const [ref, width] = useWidth<HTMLDivElement>();
  const [hover, setHover] = useState<number | null>(null);
  const reduce = useReducedMotion();
  const padT = 10, padB = 8;
  const { path, area, dd, xs, ys } = useMemo(() => {
    const vals = points.map((p) => p.equity);
    const min = Math.min(...vals), max = Math.max(...vals);
    const span = max - min || 1;
    const xs = points.map((_, i) => (i / Math.max(1, points.length - 1)) * width);
    const ys = vals.map((v) => padT + (1 - (v - min) / span) * (height - padT - padB));
    const path = smoothPath(xs, ys);
    const area = `${path}L${width} ${height}L0 ${height}Z`;
    let peak = -Infinity;
    const peakYs = vals.map((v) => { peak = Math.max(peak, v); return padT + (1 - (peak - min) / span) * (height - padT - padB); });
    const dd = `${xs.map((x, i) => `${i ? "L" : "M"}${x.toFixed(1)} ${peakYs[i]!.toFixed(1)}`).join("")}${[...xs].reverse().map((x, j) => `L${x.toFixed(1)} ${ys[xs.length - 1 - j]!.toFixed(1)}`).join("")}Z`;
    return { path, area, dd, xs, ys };
  }, [points, width, height]);
  if (points.length < 2) return null;
  const hp = hover !== null ? points[hover] : null;
  const first = points[0]!, last = points.at(-1)!;
  return (
    <div ref={ref} className="relative w-full" style={{ height }}>
      <svg
        width={width}
        height={height}
        role="img"
        aria-label={`${label}: from ${fmtMoney(first.equity, currency)} to ${fmtMoney(last.equity, currency)} over ${points.length} points.`}
        className="block overflow-visible"
        onMouseMove={(e) => {
          const r = e.currentTarget.getBoundingClientRect();
          setHover(Math.min(points.length - 1, Math.max(0, Math.round(((e.clientX - r.left) / width) * (points.length - 1)))));
        }}
        onMouseLeave={() => setHover(null)}
        onTouchMove={(e) => {
          const r = e.currentTarget.getBoundingClientRect();
          const t = e.touches[0];
          if (t) setHover(Math.min(points.length - 1, Math.max(0, Math.round(((t.clientX - r.left) / width) * (points.length - 1)))));
        }}
        onTouchEnd={() => setHover(null)}
      >
        <defs>
          <linearGradient id="eq-fill" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0" stopColor="var(--accent)" stopOpacity="0.26" />
            <stop offset="1" stopColor="var(--accent)" stopOpacity="0" />
          </linearGradient>
        </defs>
        {[0.25, 0.5, 0.75].map((f) => (
          <line key={f} x1={0} x2={width} y1={height * f} y2={height * f} stroke="var(--chart-grid)" />
        ))}
        <motion.path d={area} fill="url(#eq-fill)" initial={reduce ? false : { opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.8, delay: 0.35 }} />
        {showDrawdown && <path d={dd} fill="var(--down)" opacity="0.1" />}
        <motion.path key={width} d={path} fill="none" stroke="var(--accent)" strokeWidth="2.2" strokeLinejoin="round" strokeLinecap="round" initial={reduce || !animate ? false : { pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 1.1, ease: [0.22, 1, 0.36, 1] }} style={{ filter: "drop-shadow(0 6px 10px color-mix(in oklab, var(--accent) 35%, transparent))" }} />
        {hover !== null && (
          <g>
            <line x1={xs[hover]} x2={xs[hover]} y1={0} y2={height} stroke="var(--border-strong)" />
            <circle cx={xs[hover]} cy={ys[hover]} r={4.5} fill="var(--accent)" stroke="var(--bg-0)" strokeWidth="2" />
          </g>
        )}
      </svg>
      {hp && (
        <div
          className="glass glass-strong num pointer-events-none absolute top-0 rounded-xl px-3 py-2 text-xs"
          style={{ left: Math.min(Math.max(0, xs[hover!]! - 70), width - 150) }}
        >
          <div className="text-ink-3">{new Date(hp.t * 1000).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}</div>
          <div className="font-semibold text-ink">{fmtMoney(hp.equity, currency)}</div>
          {hp.delta !== undefined && <div className={hp.delta >= 0 ? "text-up" : "text-down"}>{fmtSignedMoney(hp.delta, currency)} trade</div>}
        </div>
      )}
    </div>
  );
}
