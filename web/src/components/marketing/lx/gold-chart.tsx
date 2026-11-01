import { cn } from "@/lib/cn";
import { fmt, type TfScene } from "./data";

const W = 600;
const H = 340;
const PLOT_R = 0.86; // right edge of the plot as a fraction of the width; the price axis sits beyond it

export interface Layers { zones: boolean; fib: boolean; liquidity: boolean }

/**
 * Illustrative XAUUSD candle chart for the landing page. Shapes are SVG (stretched to the box), and every label is
 * HTML positioned in percent, so text stays crisp and readable at any size. Remounting with a new `key` replays the
 * entrance animation (CSS, disabled under reduced motion).
 */
export function GoldChart({ scene, layers = { zones: true, fib: false, liquidity: false }, className, compact }: { scene: TfScene; layers?: Partial<Layers>; className?: string; compact?: boolean }) {
  const { candles, min, max } = scene;
  const show: Layers = { zones: true, fib: false, liquidity: false, ...layers };
  const y = (p: number) => ((max - p) / (max - min)) * H;
  const pct = (p: number) => `${((max - p) / (max - min)) * 100}%`;
  const step = (W * PLOT_R) / candles.length;
  const bw = Math.max(2, step * 0.62);
  const x = (i: number) => i * step + step / 2;
  const last = candles[candles.length - 1]!.c;
  const ticks = Array.from({ length: 5 }, (_, i) => min + ((max - min) * (i + 0.5)) / 5);

  return (
    <div className={cn("lx-chart", compact && "is-compact", className)}>
      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="lx-chart-svg" aria-hidden>
        {ticks.map((t) => (
          <line key={t} x1={0} x2={W * PLOT_R} y1={y(t)} y2={y(t)} className="lx-grid" vectorEffect="non-scaling-stroke" />
        ))}
        {show.zones &&
          scene.zones.map((z, i) => (
            <rect
              key={z.label}
              x={x(z.from)}
              width={W * PLOT_R - x(z.from)}
              y={y(z.hi)}
              height={Math.max(3, y(z.lo) - y(z.hi))}
              className={cn("lx-zone", z.kind === "demand" ? "is-demand" : "is-supply")}
              style={{ animationDelay: `${0.25 + i * 0.12}s` }}
              vectorEffect="non-scaling-stroke"
            />
          ))}
        {show.fib &&
          scene.fib.map((l) => (
            <line key={l.label} x1={0} x2={W * PLOT_R} y1={y(l.price)} y2={y(l.price)} className="lx-fib" vectorEffect="non-scaling-stroke" />
          ))}
        {show.liquidity &&
          scene.liquidity.map((l) => (
            <line key={l.label} x1={x(l.from)} x2={W * PLOT_R} y1={y(l.price)} y2={y(l.price)} className={cn("lx-liq", l.side === "buy" ? "is-buy" : "is-sell")} vectorEffect="non-scaling-stroke" />
          ))}
        <g className="lx-candles">
          {candles.map((c, i) => {
            const up = c.c >= c.o;
            return (
              <g key={i} className={up ? "is-up" : "is-down"} style={{ animationDelay: `${i * 9}ms` }}>
                <line x1={x(i)} x2={x(i)} y1={y(c.h)} y2={y(c.l)} vectorEffect="non-scaling-stroke" />
                <rect x={x(i) - bw / 2} width={bw} y={y(Math.max(c.o, c.c))} height={Math.max(1.2, Math.abs(y(c.o) - y(c.c)))} />
              </g>
            );
          })}
        </g>
        <line x1={0} x2={W} y1={y(last)} y2={y(last)} className="lx-last" vectorEffect="non-scaling-stroke" />
      </svg>

      <div className="lx-axis" aria-hidden>
        {ticks.map((t) => (
          <span key={t} style={{ top: pct(t) }}>{t.toFixed(0)}</span>
        ))}
        <span className="lx-axis-last" style={{ top: pct(last) }}>{fmt(last)}</span>
      </div>

      {show.zones &&
        scene.zones.map((z, i) => (
          <div
            key={z.label}
            className={cn("lx-bubble", z.kind === "demand" ? "is-demand" : "is-supply")}
            style={{ top: pct((z.lo + z.hi) / 2), animationDelay: `${0.45 + i * 0.12}s` }}
          >
            <b>{z.kind === "demand" ? "BUY ZONE" : "SELL ZONE"} <em>{scene.tf}</em></b>
            <span className="num">{fmt(z.lo)} – {fmt(z.hi)}</span>
          </div>
        ))}
      {show.fib &&
        scene.fib.map((l) => (
          <span key={l.label} className="lx-fib-tag" style={{ top: pct(l.price) }}>Fib {l.label}</span>
        ))}
      {show.liquidity &&
        scene.liquidity.map((l) => (
          <span key={l.label} className={cn("lx-liq-tag", l.side === "buy" ? "is-buy" : "is-sell")} style={{ top: pct(l.price), left: `${(x(l.from) / W) * 100}%` }}>{l.label}</span>
        ))}
    </div>
  );
}
