"use client";

import { useMemo, useRef, useState } from "react";

export interface ChartPoint { date: string; value: number }

/**
 * One-series history chart for an official indicator: a 2px line (or thin bars for quarterly GDP), recessive grid,
 * a zero line when values cross zero, and a hover/touch crosshair with the exact value and period. A table view of
 * the same numbers sits under it.
 */
export function MacroChart({ points, kind = "line", unit = "%", label, periodFmt = "month" }: { points: ChartPoint[]; kind?: "line" | "bar" | "step"; unit?: string; label: string; periodFmt?: "month" | "quarter" }) {
  const W = 640, H = 220, L = 40, R = 12, T = 12, B = 26;
  const ref = useRef<SVGSVGElement>(null);
  const [hover, setHover] = useState<number | null>(null);
  const fmtDate = (d: string) => periodFmt === "quarter" ? `Q${Math.floor((Number(d.slice(5, 7)) - 1) / 3) + 1} ${d.slice(0, 4)}` : new Date(`${d}T00:00:00Z`).toLocaleDateString("en-GB", { month: "short", year: "numeric", timeZone: "UTC" });
  const g = useMemo(() => {
    const vs = points.map((p) => p.value);
    let lo = Math.min(...vs, kind === "bar" ? 0 : Infinity), hi = Math.max(...vs, kind === "bar" ? 0 : -Infinity);
    if (hi - lo < 0.5) { hi += 0.25; lo -= 0.25; }
    const pad = (hi - lo) * 0.08; lo -= kind === "bar" && lo === 0 ? 0 : pad; hi += pad;
    const step = [0.25, 0.5, 1, 2, 2.5, 5, 10].find((s) => (hi - lo) / s <= 5) ?? 10;
    const ticks: number[] = []; for (let t = Math.ceil(lo / step) * step; t <= hi + 1e-9; t += step) ticks.push(Number(t.toFixed(4)));
    const x = (i: number) => L + (points.length <= 1 ? (W - L - R) / 2 : (i * (W - L - R)) / (points.length - 1));
    const y = (v: number) => T + ((hi - v) * (H - T - B)) / (hi - lo);
    return { lo, hi, ticks, x, y };
  }, [points, kind]);
  if (points.length < 2) return <p className="text-[13px] text-ink-3">Not enough history to draw a trend.</p>;
  const { ticks, x, y, lo, hi } = g;
  const bw = Math.max(3, Math.min(18, ((W - L - R) / points.length) * 0.6));
  const path = kind === "step"
    ? points.map((p, i) => (i === 0 ? `M${x(i)},${y(p.value)}` : `H${x(i)}V${y(p.value)}`)).join("")
    : points.map((p, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(p.value).toFixed(1)}`).join("");
  const onMove = (clientX: number) => {
    const r = ref.current?.getBoundingClientRect(); if (!r) return;
    const px = ((clientX - r.left) / r.width) * W;
    const i = Math.round(((px - L) / (W - L - R)) * (points.length - 1));
    setHover(Math.max(0, Math.min(points.length - 1, i)));
  };
  const h = hover !== null ? points[hover]! : null;
  const labelsEvery = Math.ceil(points.length / 6);
  return (
    <figure className="m-0">
      <div className="relative">
        <svg ref={ref} viewBox={`0 0 ${W} ${H}`} className="block h-auto w-full touch-pan-y select-none" role="img" aria-label={`${label}. ${fmtDate(points[0]!.date)} to ${fmtDate(points.at(-1)!.date)}, latest ${points.at(-1)!.value.toFixed(2)}${unit}.`}
          onPointerMove={(e) => onMove(e.clientX)} onPointerDown={(e) => onMove(e.clientX)} onPointerLeave={() => setHover(null)}>
          {ticks.map((t) => (
            <g key={t}>
              <line x1={L} x2={W - R} y1={y(t)} y2={y(t)} stroke="var(--border)" strokeWidth={t === 0 ? 1.25 : 1} strokeDasharray={t === 0 ? undefined : "2 4"} />
              <text x={L - 6} y={y(t) + 3.5} textAnchor="end" className="fill-[var(--ink-3)] text-[10px] num">{t % 1 ? t.toFixed(2).replace(/0$/, "") : t}{unit}</text>
            </g>
          ))}
          {lo < 0 && hi > 0 && <line x1={L} x2={W - R} y1={y(0)} y2={y(0)} stroke="var(--border-strong)" />}
          {points.map((p, i) => i % labelsEvery === 0 || (i === points.length - 1 && (points.length - 1) % labelsEvery >= labelsEvery / 2) ? <text key={p.date} x={x(i)} y={H - 8} textAnchor={i === 0 ? "start" : i === points.length - 1 ? "end" : "middle"} className="fill-[var(--ink-3)] text-[10px]">{fmtDate(p.date)}</text> : null)}
          {kind === "bar" ? points.map((p, i) => {
            const y0 = y(0), yv = y(p.value);
            const top = Math.min(y0, yv), hgt = Math.max(1, Math.abs(y0 - yv));
            return <rect key={p.date} x={x(i) - bw / 2} y={top} width={bw} height={hgt} rx={Math.min(4, bw / 2)} fill={p.value < 0 ? "var(--down, #e5484d)" : "var(--accent)"} opacity={hover === null || hover === i ? 1 : 0.45} />;
          }) : (
            <path d={path} fill="none" stroke="var(--accent)" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
          )}
          {h && hover !== null && (
            <g pointerEvents="none">
              <line x1={x(hover)} x2={x(hover)} y1={T} y2={H - B} stroke="var(--ink-3)" strokeWidth={1} strokeDasharray="3 3" />
              {kind !== "bar" && <circle cx={x(hover)} cy={y(h.value)} r={4.5} fill="var(--accent)" stroke="var(--surface-top, #fff)" strokeWidth={2} />}
            </g>
          )}
          <rect x={L} y={T} width={W - L - R} height={H - T - B} fill="transparent" />
        </svg>
        {h && hover !== null && (
          <div className="pointer-events-none absolute top-1 rounded-xl border border-line bg-[var(--surface-top)] px-2.5 py-1.5 text-[12px] shadow-[var(--shadow)]"
            style={{ left: `${(x(hover) / W) * 100}%`, transform: `translateX(${hover > points.length / 2 ? "-105%" : "5%"})` }}>
            <div className="text-ink-3">{fmtDate(h.date)}</div>
            <div className="num font-semibold text-ink">{h.value.toFixed(2)}{unit}</div>
          </div>
        )}
      </div>
      <details className="mt-2 text-[12px] text-ink-3">
        <summary className="cursor-pointer select-none font-medium text-accent">Show as table</summary>
        <div className="mt-2 max-h-56 overflow-auto rounded-xl border border-line">
          <table className="w-full text-left">
            <thead><tr className="text-ink-3"><th scope="col" className="px-3 py-1.5 font-medium">Period</th><th scope="col" className="px-3 py-1.5 text-right font-medium">{label}</th></tr></thead>
            <tbody>{[...points].reverse().map((p) => <tr key={p.date} className="border-t border-line"><td className="px-3 py-1.5 text-ink-2">{fmtDate(p.date)}</td><td className="num px-3 py-1.5 text-right text-ink">{p.value.toFixed(2)}{unit}</td></tr>)}</tbody>
          </table>
        </div>
      </details>
    </figure>
  );
}
