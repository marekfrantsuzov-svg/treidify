"use client";

import { useInView, useReducedMotion } from "motion/react";
import { useEffect, useId, useRef, useState } from "react";
import { cn } from "@/lib/cn";

/** Small pill that marks every mockup surface as an illustration, never live data. */
export function Illustrative({ className, children = "Illustrative" }: { className?: string; children?: React.ReactNode }) {
  return <span className={cn("lx-illus", className)}>{children}</span>;
}

/** Violet-to-pink health ring. Draws in when scrolled into view. */
export function Ring({ value, className, label = true }: { value: number; className?: string; label?: boolean }) {
  const id = useId();
  const r = 42;
  const c = 2 * Math.PI * r;
  return (
    <span className={cn("lx-ring", className)}>
      <svg viewBox="0 0 100 100" aria-hidden>
        <defs>
          <linearGradient id={`rg${id}`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="var(--grad-a, #6a3df5)" />
            <stop offset="1" stopColor="var(--grad-b, #fe85d0)" />
          </linearGradient>
        </defs>
        <circle cx="50" cy="50" r={r} className="lx-ring-track" />
        <circle cx="50" cy="50" r={r} className="lx-ring-bar" stroke={`url(#rg${id})`} strokeDasharray={c} style={{ ["--off" as string]: c * (1 - value / 100), ["--len" as string]: c }} />
      </svg>
      {label && <span className="lx-ring-num num">{value}<small>/100</small></span>}
    </span>
  );
}

/** Smooth equity line with a soft area fill. Draws when visible. */
export function EquityLine({ values, className, stroke = "var(--accent)" }: { values: number[]; className?: string; stroke?: string }) {
  const id = useId();
  const w = 300;
  const h = 100;
  const lo = Math.min(...values);
  const hi = Math.max(...values);
  const pts = values.map((v, i) => [(i / (values.length - 1)) * w, h - 6 - ((v - lo) / (hi - lo || 1)) * (h - 14)] as const);
  const d = pts.reduce((acc, [x, y], i) => {
    if (i === 0) return `M${x},${y}`;
    const [px, py] = pts[i - 1]!;
    const cx = (px + x) / 2;
    return `${acc} C${cx},${py} ${cx},${y} ${x},${y}`;
  }, "");
  return (
    <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" className={cn("lx-equity", className)} aria-hidden>
      <defs>
        <linearGradient id={`eq${id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={stroke} stopOpacity="0.28" />
          <stop offset="1" stopColor={stroke} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={`${d} L${w},${h} L0,${h} Z`} fill={`url(#eq${id})`} className="lx-equity-area" />
      <path d={d} fill="none" stroke={stroke} strokeWidth="2.2" pathLength={1} className="lx-equity-line" />
    </svg>
  );
}

/** Cycles through `items` every `ms` while the element is on screen. Holds still under reduced motion. */
export function useAutoCycle<T>(items: readonly T[], ms: number, start = 0) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { margin: "-10% 0px" });
  const reduce = useReducedMotion();
  const [i, setI] = useState(start);
  const [paused, setPaused] = useState(false);
  useEffect(() => {
    if (!inView || reduce || paused) return;
    const t = window.setInterval(() => setI((v) => (v + 1) % items.length), ms);
    return () => window.clearInterval(t);
  }, [inView, reduce, paused, items.length, ms]);
  return { ref, index: i, value: items[i], set: (n: number) => { setI(n); setPaused(true); } };
}

/** Number that counts up once when scrolled into view. */
export function CountUp({ to, decimals = 0, prefix = "", suffix = "", className }: { to: number; decimals?: number; prefix?: string; suffix?: string; className?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true });
  const reduce = useReducedMotion();
  const [v, setV] = useState(to);
  useEffect(() => {
    if (!inView || reduce) return;
    let raf = 0;
    const t0 = performance.now();
    const tick = (t: number) => {
      const p = Math.min(1, (t - t0) / 1100);
      setV(to * (1 - Math.pow(1 - p, 3)));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [inView, reduce, to]);
  const s = v.toLocaleString("en-US", { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
  return <span ref={ref} className={cn("num", className)}>{prefix}{s}{suffix}</span>;
}
