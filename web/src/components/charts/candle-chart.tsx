"use client";

import { useMemo, useState } from "react";
import type { Candle, PriceZone } from "@/lib/analytics";
import { zoneLabel } from "@/lib/analytics";
import { fmtNumber } from "@/lib/format";
import { useWidth } from "./use-width";

const zoneStyle: Record<PriceZone["kind"], { fill: string; stroke: string; text: string }> = {
  support: { fill: "var(--up-soft)", stroke: "var(--up)", text: "var(--up)" },
  resistance: { fill: "var(--down-soft)", stroke: "var(--down)", text: "var(--down)" },
  buySideLiquidity: { fill: "transparent", stroke: "var(--accent)", text: "var(--accent)" },
  sellSideLiquidity: { fill: "transparent", stroke: "var(--accent)", text: "var(--accent)" },
};

export interface CandleChartProps {
  candles: Candle[];
  zones?: PriceZone[];
  height?: number;
  digits?: number;
  /** Render at most this many of the latest candles. */
  visible?: number;
  onZoneSelect?: (zone: PriceZone) => void;
  selectedZoneId?: string | null;
  label: string;
  timeLabel?: (t: number) => string;
}

/**
 * Candlestick chart with conditional zones. Zones are buttons: keyboard and screen-reader reachable.
 * Hover or touch shows an OHLC readout. Drawn at true pixel width for crisp labels.
 */
export function CandleChart({ candles, zones = [], height = 320, digits = 2, visible = 90, onZoneSelect, selectedZoneId, label, timeLabel }: CandleChartProps) {
  const [ref, width] = useWidth<HTMLDivElement>();
  const [hover, setHover] = useState<number | null>(null);
  const data = candles.slice(-Math.min(visible, Math.max(30, Math.floor(width / 6))));
  const axisW = 64, padT = 12, padB = 24;
  const plotW = width - axisW;
  const { min, max } = useMemo(() => {
    const lows = data.map((c) => c.l), highs = data.map((c) => c.h);
    const zl = zones.map((z) => z.lower), zh = zones.map((z) => z.upper);
    let lo = Math.min(...lows), hi = Math.max(...highs);
    // Include zones only if they are near the visible range, so far-away levels don't flatten the chart.
    const range = hi - lo;
    for (const v of [...zl, ...zh]) if (v > lo - range * 0.25 && v < hi + range * 0.25) { lo = Math.min(lo, v); hi = Math.max(hi, v); }
    const pad = (hi - lo) * 0.06;
    return { min: lo - pad, max: hi + pad };
  }, [data, zones]);
  const y = (p: number) => padT + (1 - (p - min) / (max - min)) * (height - padT - padB);
  const step = plotW / data.length;
  const bodyW = Math.max(1.5, step * 0.62);
  const last = data.at(-1);
  const ticks = Array.from({ length: 5 }, (_, i) => min + ((max - min) * (i + 0.5)) / 5);
  const visibleZones = zones.filter((z) => z.upper >= min && z.lower <= max);
  const h = hover !== null ? data[hover] : null;
  // Hide labels that would collide; the zone band stays visible and clickable.
  const labelled = new Set<string>();
  {
    let lastY = -Infinity;
    for (const z of [...visibleZones].sort((a, b) => b.upper - a.upper)) {
      const ly = y(z.upper) - 5;
      if (ly - lastY >= 14) { labelled.add(z.id); lastY = ly; }
    }
  }

  const onMove = (clientX: number, rect: DOMRect) => {
    const i = Math.floor((clientX - rect.left) / step);
    setHover(i >= 0 && i < data.length ? i : null);
  };

  if (!last) return null;
  return (
    <div ref={ref} className="relative w-full select-none" style={{ height }}>
      <svg
        width={width}
        height={height}
        role="img"
        aria-label={`${label}. ${data.length} candles. Last close ${fmtNumber(last.c, digits)}. ${visibleZones.length} zones marked.`}
        onMouseMove={(e) => onMove(e.clientX, e.currentTarget.getBoundingClientRect())}
        onMouseLeave={() => setHover(null)}
        onTouchMove={(e) => e.touches[0] && onMove(e.touches[0].clientX, e.currentTarget.getBoundingClientRect())}
        onTouchEnd={() => setHover(null)}
        className="block"
      >
        {ticks.map((p) => (
          <g key={p}>
            <line x1={0} x2={plotW} y1={y(p)} y2={y(p)} stroke="var(--chart-grid)" />
            <text x={width - 6} y={y(p) + 4} textAnchor="end" fontSize="11" className="num" fill="var(--text-3)">
              {fmtNumber(p, digits)}
            </text>
          </g>
        ))}
        {visibleZones.map((z) => {
          const s = zoneStyle[z.kind];
          const liquidity = z.kind.endsWith("Liquidity");
          const top = y(z.upper), bottom = y(z.lower);
          const hgt = Math.max(liquidity ? 0 : 6, bottom - top);
          const selected = selectedZoneId === z.id;
          return (
            <g key={z.id}>
              {liquidity ? (
                <line x1={0} x2={plotW} y1={top} y2={top} stroke={s.stroke} strokeDasharray="4 4" strokeWidth={selected ? 2 : 1} opacity={0.85} />
              ) : (
                <rect x={0} width={plotW} y={top - (hgt === 6 ? 3 : 0)} height={hgt} fill={s.fill} stroke={s.stroke} strokeOpacity={selected ? 0.9 : 0.25} strokeWidth={selected ? 1.5 : 1} />
              )}
              {(labelled.has(z.id) || selected) && <text x={plotW - 8} y={top - 5} textAnchor="end" fontSize="10.5" fontWeight="600" fill={s.text} paintOrder="stroke" stroke="var(--bg-0)" strokeWidth={3} strokeOpacity={0.6}>
                {zoneLabel[z.kind]} {fmtNumber(z.lower, digits)}{z.upper !== z.lower ? `–${fmtNumber(z.upper, digits)}` : ""}
              </text>}
            </g>
          );
        })}
        {data.map((c, i) => {
          const x = i * step + step / 2;
          const up = c.c >= c.o;
          const color = up ? "var(--up)" : "var(--down)";
          const top = y(Math.max(c.o, c.c)), bot = y(Math.min(c.o, c.c));
          return (
            <g key={c.t} opacity={hover === null || hover === i ? 1 : 0.55}>
              <line x1={x} x2={x} y1={y(c.h)} y2={y(c.l)} stroke={color} strokeWidth="1" />
              <rect x={x - bodyW / 2} y={top} width={bodyW} height={Math.max(1, bot - top)} rx={Math.min(1.5, bodyW / 4)} fill={color} />
            </g>
          );
        })}
        <line x1={0} x2={plotW} y1={y(last.c)} y2={y(last.c)} stroke="var(--accent)" strokeDasharray="2 3" opacity="0.7" />
        <g transform={`translate(${plotW + 2}, ${y(last.c) - 10})`}>
          <rect width={axisW - 4} height={20} rx={6} fill="var(--accent)" />
          <text x={(axisW - 4) / 2} y={14} textAnchor="middle" fontSize="11" fontWeight="600" fill="#fff" className="num">
            {fmtNumber(last.c, digits)}
          </text>
        </g>
        {h && hover !== null && (
          <line x1={hover * step + step / 2} x2={hover * step + step / 2} y1={padT} y2={height - padB} stroke="var(--border-strong)" />
        )}
        {timeLabel &&
          data.map((c, i) =>
            i % Math.ceil(data.length / 6) === 0 ? (
              <text key={`t${c.t}`} x={i * step + step / 2} y={height - 6} textAnchor="middle" fontSize="10.5" fill="var(--text-3)">
                {timeLabel(c.t)}
              </text>
            ) : null,
          )}
      </svg>
      {h && (
        <div className="glass glass-strong num pointer-events-none absolute left-2 top-2 rounded-xl px-3 py-1.5 text-[11px] text-ink-2">
          O <b className="text-ink">{fmtNumber(h.o, digits)}</b> H <b className="text-ink">{fmtNumber(h.h, digits)}</b> L{" "}
          <b className="text-ink">{fmtNumber(h.l, digits)}</b> C <b className={h.c >= h.o ? "text-up" : "text-down"}>{fmtNumber(h.c, digits)}</b>
        </div>
      )}
      {onZoneSelect && visibleZones.length > 0 && (
        <div className="sr-only">
          {visibleZones.map((z) => (
            <button key={z.id} onClick={() => onZoneSelect(z)}>
              Explain {zoneLabel[z.kind]} zone {fmtNumber(z.lower, digits)} to {fmtNumber(z.upper, digits)}
            </button>
          ))}
        </div>
      )}
      {onZoneSelect &&
        visibleZones.map((z) => {
          const top = y(z.upper), bottom = y(z.lower);
          return (
            <button
              key={`hit-${z.id}`}
              aria-hidden
              tabIndex={-1}
              onClick={() => onZoneSelect(z)}
              className="absolute left-0 cursor-pointer rounded-sm hover:bg-[var(--accent-soft)]"
              style={{ top: top - 8, height: Math.max(16, bottom - top + 16), width: plotW }}
            />
          );
        })}
    </div>
  );
}
