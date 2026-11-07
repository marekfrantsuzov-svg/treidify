import { cn } from "@/lib/cn";
import { fmt, type Scenario } from "./data";

const W = 600;
const H = 300;
const PLOT_R = 0.86;

/**
 * Illustrative XAUUSD chart for the showcase. Candles reveal left to right, then the structure labels, the break of
 * structure, the zone and the reaction highlight are drawn in order (CSS delays, so the whole sequence pauses with
 * the showcase). Shapes are SVG stretched to the box; every label is HTML positioned in percent, so text stays crisp.
 * `still` renders the finished state with no entrance (the dashboard thumbnail).
 */
export function ScenarioChart({ s, still, className }: { s: Scenario; still?: boolean; className?: string }) {
  const { candles, min, max } = s;
  const y = (p: number) => ((max - p) / (max - min)) * H;
  const pct = (p: number) => `${((max - p) / (max - min)) * 100}%`;
  const step = (W * PLOT_R) / candles.length;
  const bw = Math.max(2, step * 0.6);
  const x = (i: number) => i * step + step / 2;
  const xp = (i: number) => `${(x(i) / W) * 100}%`;
  const last = candles[candles.length - 1]!.c;
  const ticks = Array.from({ length: 5 }, (_, i) => min + ((max - min) * (i + 0.5)) / 5);
  const z = s.zone;
  const demand = z.kind === "demand";

  return (
    <div className={cn("sx-chart", still && "is-still", className)}>
      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="sx-chart-svg" aria-hidden>
        <defs>
          <linearGradient id={`sxz-${s.id}`} x1="0" x2="1">
            <stop offset="0" stopColor={demand ? "#21d58c" : "#ff5b79"} stopOpacity="0.32" />
            <stop offset="1" stopColor={demand ? "#21d58c" : "#ff5b79"} stopOpacity="0.1" />
          </linearGradient>
        </defs>
        {ticks.map((t) => (
          <line key={t} x1={0} x2={W * PLOT_R} y1={y(t)} y2={y(t)} className="sx-grid" vectorEffect="non-scaling-stroke" />
        ))}
        <g className="sx-zone-g">
          <rect x={x(z.from)} width={W * PLOT_R - x(z.from)} y={y(z.hi)} height={Math.max(4, y(z.lo) - y(z.hi))} fill={`url(#sxz-${s.id})`} className={cn("sx-zone", demand ? "is-demand" : "is-supply")} vectorEffect="non-scaling-stroke" />
        </g>
        <line x1={x(s.bos.from)} x2={x(s.bos.to)} y1={y(s.bos.price)} y2={y(s.bos.price)} className="sx-bos" pathLength={1} vectorEffect="non-scaling-stroke" />
        <g className="sx-candles">
          {candles.map((c, i) => {
            const up = c.c >= c.o;
            const lastOne = i === candles.length - 1;
            return (
              <g key={i} className={cn(up ? "is-up" : "is-down", lastOne && "is-live")} style={{ ["--i" as string]: i }}>
                <line x1={x(i)} x2={x(i)} y1={y(c.h)} y2={y(c.l)} vectorEffect="non-scaling-stroke" />
                <rect x={x(i) - bw / 2} width={bw} y={y(Math.max(c.o, c.c))} height={Math.max(1.4, Math.abs(y(c.o) - y(c.c)))} />
              </g>
            );
          })}
        </g>
        <line x1={0} x2={W} y1={y(last)} y2={y(last)} className="sx-last" vectorEffect="non-scaling-stroke" />
      </svg>

      <div className="sx-axis" aria-hidden>
        {ticks.map((t) => (
          <span key={t} style={{ top: pct(t) }}>{t.toFixed(0)}</span>
        ))}
        <span className="sx-axis-last num" style={{ top: pct(last) }}>{fmt(last)}</span>
      </div>

      {s.pivots.map((p, k) => {
        const c = candles[p.i]!;
        const hi = p.at === "high";
        return (
          <span key={p.label} className={cn("sx-pivot", hi ? "is-high" : "is-low")} style={{ left: xp(p.i), top: pct(hi ? c.h : c.l), ["--k" as string]: k }}>
            {p.label}
          </span>
        );
      })}
      <span className="sx-bos-tag" style={{ left: xp(Math.round((s.bos.from + s.bos.to) / 2)), top: pct(s.bos.price) }}>BOS</span>
      <span className={cn("sx-zone-tag", demand ? "is-demand" : "is-supply")} style={{ top: pct((z.lo + z.hi) / 2) }}>
        <b>{demand ? "Buy zone" : "Sell zone"} <em>{s.tf}</em></b>
        <span className="num">{fmt(z.lo)} – {fmt(z.hi)}</span>
      </span>
      <span className="sx-react" style={{ left: xp(z.from), top: pct(z.hi), height: `${((z.hi - z.lo) / (max - min)) * 100}%`, right: `${(1 - PLOT_R) * 100}%` }} />
    </div>
  );
}
