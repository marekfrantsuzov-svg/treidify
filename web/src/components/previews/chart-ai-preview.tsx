"use client";

import { ImageUp, Layers } from "lucide-react";
import { useMemo, useState } from "react";
import { detectSwings } from "@/lib/analytics";
import { sampleAnalysis } from "@/lib/demo/markets";
import { cn } from "@/lib/cn";
import { Glass } from "@/components/ui/glass";
import { SampleBadge } from "@/components/ui/pill";

type Layer = "structure" | "zones" | "liquidity";

/** Illustrates the chart-screenshot analysis output with toggleable overlays on a sample chart image. */
export function ChartAiPreview({ className }: { className?: string }) {
  const [layers, setLayers] = useState<Record<Layer, boolean>>({ structure: true, zones: true, liquidity: true });
  const { candles, levels } = useMemo(() => sampleAnalysis("XAUUSD", "1H"), []);
  const data = candles.slice(-70);
  const W = 640, H = 300;
  const lo = Math.min(...data.map((c) => c.l)), hi = Math.max(...data.map((c) => c.h));
  const y = (p: number) => 14 + (1 - (p - lo) / (hi - lo)) * (H - 28);
  const step = W / data.length;
  const offset = candles.length - data.length;
  const swings = detectSwings(candles).filter((s) => s.index >= offset).slice(-8);
  const zones = levels.zones.filter((z) => z.upper >= lo && z.lower <= hi);

  return (
    <Glass className={cn("p-4 sm:p-5", className)}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="grid h-8 w-8 place-items-center rounded-full bg-accent-soft text-accent"><ImageUp className="h-4 w-4" /></span>
          <div>
            <h3 className="text-[15px] font-semibold text-ink">chart-xauusd-1h.png</h3>
            <p className="text-xs text-ink-3">Detected: XAUUSD · 1H · visible range only</p>
          </div>
        </div>
        <SampleBadge label="Example output" />
      </div>
      <div className="inset relative mt-4 overflow-hidden rounded-2xl">
        <svg viewBox={`0 0 ${W} ${H}`} className="block h-auto w-full" role="img" aria-label="Uploaded chart with AI annotations">
          {layers.zones && zones.filter((z) => !z.kind.endsWith("Liquidity")).map((z) => (
            <rect key={z.id} x={0} width={W} y={y(z.upper)} height={Math.max(5, y(z.lower) - y(z.upper))} fill={z.kind === "support" ? "var(--up-soft)" : "var(--down-soft)"} />
          ))}
          {data.map((c, i) => {
            const x = i * step + step / 2, up = c.c >= c.o, col = up ? "var(--up)" : "var(--down)";
            return (
              <g key={c.t}>
                <line x1={x} x2={x} y1={y(c.h)} y2={y(c.l)} stroke={col} />
                <rect x={x - step * 0.3} width={step * 0.6} y={y(Math.max(c.o, c.c))} height={Math.max(1, Math.abs(y(c.o) - y(c.c)))} fill={col} />
              </g>
            );
          })}
          {layers.structure && (
            <>
              <polyline fill="none" stroke="var(--accent)" strokeWidth="1.5" strokeDasharray="5 4" points={swings.map((s) => `${(s.index - offset) * step + step / 2},${y(s.price)}`).join(" ")} />
              {swings.map((s, i) => {
                const prev = swings.slice(0, i).findLast((p) => p.kind === s.kind);
                const tag = prev ? (s.kind === "high" ? (s.price > prev.price ? "HH" : "LH") : s.price > prev.price ? "HL" : "LL") : s.kind === "high" ? "H" : "L";
                return (
                  <g key={`${s.index}${s.kind}`}>
                    <rect x={(s.index - offset) * step + step / 2 - 13} y={y(s.price) + (s.kind === "high" ? -24 : 8)} width="26" height="16" rx="5" fill="var(--accent)" />
                    <text x={(s.index - offset) * step + step / 2} y={y(s.price) + (s.kind === "high" ? -12 : 20)} textAnchor="middle" fontSize="10" fontWeight="700" fill="#fff">{tag}</text>
                  </g>
                );
              })}
            </>
          )}
          {layers.liquidity && zones.filter((z) => z.kind.endsWith("Liquidity")).map((z) => (
            <g key={z.id}>
              <line x1={0} x2={W} y1={y(z.upper)} y2={y(z.upper)} stroke="var(--warn)" strokeDasharray="3 3" />
              <text x={W - 6} y={y(z.upper) - 4} textAnchor="end" fontSize="10" fontWeight="600" fill="var(--warn)">{z.kind === "buySideLiquidity" ? "Buy-side liquidity" : "Sell-side liquidity"}</text>
            </g>
          ))}
        </svg>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <Layers className="h-4 w-4 text-ink-3" />
        {(["structure", "zones", "liquidity"] as Layer[]).map((l) => (
          <button key={l} aria-pressed={layers[l]} onClick={() => setLayers((s) => ({ ...s, [l]: !s[l] }))} className={cn("rounded-full border px-3 py-1 text-xs font-medium capitalize transition-colors", layers[l] ? "border-transparent bg-accent text-white" : "border-line text-ink-2 hover:text-ink")}>
            {l}
          </button>
        ))}
      </div>
      <div className="mt-4 grid gap-2 text-[13px] sm:grid-cols-2">
        <div className="inset rounded-2xl p-3"><div className="font-semibold text-ink">Market structure</div><div className="mt-1 text-ink-2">Swing labels show the visible sequence of highs and lows.</div></div>
        <div className="inset rounded-2xl p-3"><div className="font-semibold text-ink">Missing information</div><div className="mt-1 text-ink-2">Price axis is cropped, so exact levels are checked against market data before they are shown.</div></div>
      </div>
    </Glass>
  );
}
