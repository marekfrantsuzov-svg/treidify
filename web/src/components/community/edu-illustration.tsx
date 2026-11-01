import type { Illustration } from "@/lib/community/education";

/** Schematic diagrams for educational posts. Illustrations of a concept, not charts of a real market. */
const C = (o: number, c: number, x: number, w = 8, wick = 4) => ({ o, c, x, w, h: Math.min(o, c) - wick, l: Math.max(o, c) + wick });
function Candles({ data }: { data: ReturnType<typeof C>[] }) {
  return <>{data.map((k, i) => { const up = k.c < k.o; return (
    <g key={i} stroke={up ? "var(--up)" : "var(--down)"}><line x1={k.x} x2={k.x} y1={k.h} y2={k.l} strokeWidth={1.2} /><rect x={k.x - k.w / 2} y={Math.min(k.o, k.c)} width={k.w} height={Math.max(1.5, Math.abs(k.o - k.c))} rx={1.5} fill={up ? "var(--up)" : "var(--down)"} strokeWidth={0} /></g>
  ); })}</>;
}
const walk = (pts: number[], x0 = 20, dx = 14) => pts.slice(1).map((p, i) => C(pts[i]!, p, x0 + i * dx));

export function EduIllustration({ kind }: { kind: Illustration }) {
  return (
    <figure className="edu-fig">
      <svg viewBox="0 0 360 150" className="h-auto w-full" role="img" aria-label={`Illustration: ${kind}`}>
        {kind === "zones" && <>
          <rect x={60} y={98} width={292} height={16} rx={3} fill="var(--up-soft)" stroke="var(--up)" strokeOpacity={0.6} />
          <text x={290} y={110} fontSize={10} fontWeight={800} fill="var(--up)">BUY ZONE</text>
          <rect x={150} y={26} width={202} height={14} rx={3} fill="var(--down-soft)" stroke="var(--down)" strokeOpacity={0.6} />
          <text x={286} y={37} fontSize={10} fontWeight={800} fill="var(--down)">SELL ZONE</text>
          <Candles data={walk([90, 96, 108, 102, 104, 60, 50, 44, 34, 40, 30, 48, 62, 76, 90, 100, 84, 70, 58, 50, 56])} />
        </>}
        {kind === "bos-choch" && <>
          <Candles data={walk([120, 110, 116, 96, 102, 84, 90, 70, 78, 92, 86, 104, 98, 80, 70, 60])} />
          <line x1={104} x2={186} y1={70} y2={70} stroke="var(--up)" strokeWidth={1.5} /><text x={130} y={64} fontSize={9.5} fontWeight={800} fill="var(--up)">BOS</text>
          <line x1={146} x2={258} y1={104} y2={104} stroke="var(--down)" strokeDasharray="4 3" strokeWidth={1.5} /><text x={196} y={118} fontSize={9.5} fontWeight={800} fill="var(--down)">CHOCH</text>
        </>}
        {kind === "sweep" && <>
          <line x1={20} x2={340} y1={110} y2={110} stroke="var(--brand-pink)" strokeDasharray="3 3" />
          <text x={22} y={124} fontSize={9.5} fontWeight={700} fill="var(--brand-pink)">Equal lows · sell-side liquidity</text>
          <Candles data={walk([80, 96, 108, 100, 90, 104, 108, 96, 88, 100, 106, 118, 96, 78, 64, 56, 50])} />
          <circle cx={174} cy={122} r={9} fill="none" stroke="var(--accent)" strokeWidth={1.5} /><text x={188} y={140} fontSize={9.5} fontWeight={700} fill="var(--accent)">Swept, closed back</text>
        </>}
        {kind === "fib" && <>
          {[0.236, 0.382, 0.5, 0.618, 0.786, 0.886].map((r) => { const y = 22 + r * 108; return <g key={r}><line x1={120} x2={340} y1={y} y2={y} stroke="var(--accent)" strokeOpacity={r === 0.618 || r === 0.786 ? 0.9 : 0.45} strokeDasharray={r === 0.618 || r === 0.786 ? "" : "3 3"} /><text x={300} y={y - 2} fontSize={9} fontWeight={700} fill="var(--accent)">{(r * 100).toFixed(1)}%</text></g>; })}
          <Candles data={walk([130, 118, 104, 92, 78, 66, 52, 40, 30, 24, 40, 56, 70, 84, 92, 86], 20, 15)} />
          <text x={22} y={146} fontSize={9} fontWeight={700} fill="var(--text-3)">Swing low (0)</text><text x={148} y={16} fontSize={9} fontWeight={700} fill="var(--text-3)">Swing high (100)</text>
        </>}
        {kind === "risk" && <>
          <rect x={30} y={40} width={300} height={22} rx={4} fill="var(--up-soft)" stroke="var(--up)" strokeOpacity={0.5} /><text x={40} y={55} fontSize={10} fontWeight={800} fill="var(--up)">Entry zone</text>
          <line x1={30} x2={330} y1={112} y2={112} stroke="var(--down)" strokeWidth={1.5} /><text x={40} y={127} fontSize={10} fontWeight={800} fill="var(--down)">Structural stop</text>
          <line x1={250} x2={250} y1={40} y2={112} stroke="var(--text)" strokeWidth={1.2} markerEnd="url(#ar)" markerStart="url(#ar)" />
          <defs><marker id="ar" viewBox="0 0 8 8" refX="4" refY="4" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M0 0L8 4L0 8z" fill="var(--text)" /></marker></defs>
          <text x={258} y={82} fontSize={11} fontWeight={800} fill="var(--text)">≤ 50 pips</text><text x={258} y={96} fontSize={10} fontWeight={600} fill="var(--text-3)">= $5.00</text>
        </>}
        {kind === "dxy" && <>
          <path d="M20 110 C 70 100, 100 60, 150 64 S 240 30, 340 26" fill="none" stroke="#d4a017" strokeWidth={2.5} />
          <path d="M20 40 C 70 52, 100 92, 150 88 S 240 118, 340 124" fill="none" stroke="var(--accent)" strokeWidth={2.5} />
          <text x={300} y={20} fontSize={10} fontWeight={800} fill="#d4a017">Gold</text><text x={304} y={142} fontSize={10} fontWeight={800} fill="var(--accent)">DXY</text>
        </>}
        {kind === "mtf" && <>
          {["4H · Direction", "1H · Structure", "15M · Setup", "5M · Trigger"].map((t, i) => <g key={t}><rect x={20 + i * 84} y={30 + i * 18} width={74} height={54} rx={10} fill="var(--surface-inset)" stroke="var(--border-strong)" /><text x={57 + i * 84} y={62 + i * 18} fontSize={9.5} fontWeight={700} textAnchor="middle" fill="var(--text)">{t}</text></g>)}
          <path d="M90 60 L104 72 M174 78 L188 90 M258 96 L272 108" stroke="var(--accent)" strokeWidth={1.5} />
        </>}
        {kind === "displacement" && <>
          <Candles data={[...walk([90, 94, 88, 92, 86, 90], 20, 14), C(90, 40, 104, 10, 3), C(40, 30, 118, 10, 3), ...walk([30, 34, 28, 32], 132, 14)]} />
          <rect x={96} y={26} width={30} height={72} rx={6} fill="none" stroke="var(--accent)" strokeWidth={1.5} /><text x={136} y={24} fontSize={9.5} fontWeight={800} fill="var(--accent)">Displacement</text>
        </>}
      </svg>
      <figcaption>Illustration · not a live chart</figcaption>
    </figure>
  );
}
