import React from "react";
import { AbsoluteFill, Img, staticFile, useCurrentFrame } from "remotion";
import tl from "../../commercial.json";
import lines from "../../public/vo/lines.json";
import { BODY, DISPLAY, EASE, IN, OUT, clamp01, ramp, track } from "../lib";
import { Big, DarkBg, INK, INK2, Label, LightBg, Note, PINK, Phone, Shadow, Shot, Spoken, VIOLET, Veil, dim, mblur, type Layer } from "./kit";

/** frame at which word k of narration line i is spoken */
const wordAt = (i: number, k: number) => tl.vo[i] + Math.round(lines[i].words[k].t0 * 60);

const Fly: React.FC<{ n: Layer; w: number; x: number; y: number; at: number; f: number; from?: [number, number, number]; radius?: number; glow?: number; style?: React.CSSProperties; dur?: number }> = ({ n, w, x, y, at, f, from = [0, 60, -300], radius = 18, glow = 0, style, dur = 40 }) => {
  const p = ramp(f, at, at + dur, OUT);
  if (p <= 0) return null;
  return (
    <div style={{ position: "absolute", left: x, top: y, opacity: clamp01(p * 1.6), transform: `translate3d(${(1 - p) * from[0]}px, ${(1 - p) * from[1]}px, ${(1 - p) * from[2]}px)`, filter: p < 1 ? `blur(${(1 - p) * 10}px)` : undefined, transformStyle: "preserve-3d", ...style }}>
      <Shot n={n} w={w} radius={radius} shadow={glow ? `0 0 0 ${2 + glow * 2}px rgba(83,63,245,${0.5 * glow}), 0 30px 80px -20px rgba(83,63,245,${0.45 * glow}), 0 30px 70px -30px rgba(40,30,90,0.35)` : true} />
    </div>
  );
};

/* ===================================================================== S5 · 1970–2450 · MT5 → workspace */
const Tile: React.FC<{ kind: "mt5" | "t"; glow: number }> = ({ kind, glow }) => (
  <div style={{ width: 230, height: 230, borderRadius: 56, position: "relative", background: kind === "mt5" ? "linear-gradient(160deg, #1d2a4a, #0d1424)" : "linear-gradient(160deg, #ffffff, #f1effa)", boxShadow: `0 30px 70px -24px rgba(40,30,90,0.45), 0 0 0 1px rgba(83,63,245,0.10), 0 0 ${60 * glow}px ${10 * glow}px rgba(83,63,245,${0.35 * glow})`, display: "flex", alignItems: "center", justifyContent: "center" }}>
    {kind === "t" ? (
      <Img src={staticFile("v2/t-512.png")} style={{ width: 142, height: 142 }} />
    ) : (
      <svg width={146} height={146} viewBox="0 0 120 120">
        {/* neutral trading-terminal glyph (not the MetaQuotes logo) */}
        {[[22, 60, 36, 18], [46, 40, 50, 30], [70, 52, 40, 22], [94, 28, 56, 34]].map(([x, y, h, b], i) => (
          <g key={i}>
            <line x1={x} y1={y - 10} x2={x} y2={y + h + 10} stroke={i % 2 ? "#ff6b78" : "#35d39a"} strokeWidth={3} strokeLinecap="round" />
            <rect x={x - 7} y={y} width={14} height={h} rx={3} fill={i % 2 ? "#ff6b78" : "#35d39a"} />
          </g>
        ))}
      </svg>
    )}
  </div>
);

export const S5: React.FC = () => {
  const f = useCurrentFrame();
  if (f < 1960 || f > 2455) return null;
  const into = ramp(f, 1960, 1992);
  const tiles = ramp(f, 1990, 2034, OUT);
  const line = ramp(f, 2030, 2062, EASE);
  const tilesOut = ramp(f, 2196, 2236, IN);
  const L = 780, R = 1140, Y = 460;
  const pulses = [2066, 2104, 2142, 2176];
  const arrive = Math.max(0, ...pulses.map((p) => Math.max(0, 1 - Math.abs(f - (p + 34)) / 14)));
  const dash = ramp(f, 2226, 2300, OUT);
  const pop = (k: number) => 2296 + k * 12;
  const camS = track(f, [[2226, 0.7], [2300, 0.74], [2450, 0.8]], EASE);
  const stream = Math.min(ramp(f, 2190, 2214), 1 - ramp(f, 2270, 2300));
  const D: [Layer, number, number, number, number][] = [
    ["d-health-light", 276, 96, 803, 232], ["d-balance-light", 822, 96, 1118, 232], ["d-pnl-light", 1131, 96, 1377, 232], ["d-win-light", 1390, 96, 1636, 232], ["d-pf-light", 1649, 96, 1895, 232], ["d-chart-light", 276, 252, 1144, 681], ["d-ai-light", 1163, 252, 1486, 465], ["d-macro-light", 1163, 486, 1486, 681],
  ];
  return (
    <AbsoluteFill style={{ opacity: into }}>
      <LightBg />
      {/* connection */}
      {tilesOut < 1 && (
        <AbsoluteFill style={{ opacity: 1 - tilesOut, transform: `translateY(${-tilesOut * 80}px) scale(${1 - tilesOut * 0.15})`, filter: tilesOut ? `blur(${tilesOut * 8}px)` : undefined }}>
          <div style={{ position: "absolute", left: L - 230 - (1 - tiles) * 260, top: Y - 115, opacity: tiles, filter: tiles < 1 ? mblur((1 - tiles) * 30, "x") || undefined : undefined }}><Tile kind="mt5" glow={0} /></div>
          <div style={{ position: "absolute", left: R + (1 - tiles) * 260, top: Y - 115, opacity: tiles, filter: tiles < 1 ? mblur((1 - tiles) * 30, "x") || undefined : undefined }}><Tile kind="t" glow={arrive} /></div>
          <svg width={1920} height={1080} style={{ position: "absolute", inset: 0 }}>
            <defs>
              <linearGradient id="lnk" x1="0" x2="1"><stop offset="0" stopColor="#35d39a" /><stop offset="1" stopColor={VIOLET} /></linearGradient>
            </defs>
            <line x1={L + 18} y1={Y} x2={L + 18 + (R - L - 36) * line} y2={Y} stroke="url(#lnk)" strokeWidth={4} strokeLinecap="round" strokeDasharray="2 12" opacity={0.7} />
            {pulses.map((p, i) => {
              const t = (f - p) / 34;
              if (t < 0 || t > 1) return null;
              const x = L + 18 + (R - L - 36) * EASE(t);
              return <g key={i}><circle cx={x} cy={Y} r={9} fill={VIOLET} /><circle cx={x} cy={Y} r={22} fill={VIOLET} opacity={0.18} /><rect x={x - 70} y={Y - 2} width={70} height={4} rx={2} fill="url(#lnk)" opacity={0.5} /></g>;
            })}
          </svg>
          <div data-qa="s5-mt5" style={{ position: "absolute", left: L - 115 - 200, width: 400, top: Y + 150, textAlign: "center", fontFamily: DISPLAY, fontWeight: 650, fontSize: 40, letterSpacing: "-0.02em", color: INK, opacity: ramp(f, 2018, 2040) }}>MetaTrader 5</div>
          <div data-qa="s5-tr" style={{ position: "absolute", left: R + 115 - 200, width: 400, top: Y + 150, textAlign: "center", fontFamily: DISPLAY, fontWeight: 650, fontSize: 40, letterSpacing: "-0.02em", color: INK, opacity: ramp(f, 2024, 2046) }}>Treidify</div>
        </AbsoluteFill>
      )}
      {/* data stream */}
      {stream > 0 && (
        <AbsoluteFill style={{ opacity: stream }}>
          {Array.from({ length: 16 }).map((_, i) => {
            const y = 300 + ((i * 97) % 480);
            const sp = 34 + (i % 5) * 9;
            const x = ((f - 2190) * sp + i * 173) % 2400 - 400;
            return <div key={i} style={{ position: "absolute", left: x, top: y, width: 220 + (i % 4) * 90, height: 2 + (i % 3), borderRadius: 4, background: `linear-gradient(90deg, transparent, rgba(83,63,245,${0.35 + (i % 3) * 0.15}), ${i % 2 ? "rgba(237,116,206,0.6)" : "rgba(139,123,255,0.7)"})` }} />;
          })}
        </AbsoluteFill>
      )}
      {/* the real dashboard populates */}
      {dash > 0 && (
        <AbsoluteFill style={{ opacity: dash }}>
          <div style={{ position: "absolute", left: 960 - 960 * camS, top: 560 - 540 * camS, width: 1920, height: 1080, transformOrigin: "0 0", transform: `scale(${camS})` }}>
            <div style={{ position: "absolute", inset: 0, borderRadius: 26, overflow: "hidden", boxShadow: "0 60px 140px -40px rgba(40,30,90,0.45), 0 0 0 1px rgba(83,63,245,0.10)" }}>
              <div style={{ filter: `blur(${(1 - ramp(f, 2380, 2420)) * 16}px) saturate(${0.4 + 0.6 * ramp(f, 2380, 2420)})`, opacity: 0.55 + 0.45 * ramp(f, 2380, 2420) }}><Shot n="full-dash-light" /></div>
              {D.map(([n, x0, y0, x1, y1], k) => {
                const p = ramp(f, pop(k), pop(k) + 30, OUT);
                const sweep = ramp(f, pop(k), pop(k) + 40);
                return p > 0 ? (
                  <div key={n} style={{ position: "absolute", left: x0, top: y0, width: x1 - x0, height: y1 - y0, opacity: p, transform: `translateY(${(1 - p) * 24}px) scale(${0.97 + 0.03 * p})`, borderRadius: 16, overflow: "hidden" }}>
                    <Shot n={n} />
                    <div style={{ position: "absolute", inset: 0, background: `linear-gradient(100deg, transparent ${sweep * 140 - 40}%, rgba(83,63,245,0.18) ${sweep * 140 - 20}%, transparent ${sweep * 140}%)` }} />
                  </div>
                ) : null;
              })}
            </div>
          </div>
        </AbsoluteFill>
      )}
      <Note text="Sample MT5 account · illustrative data, live sync not yet switched on" a={2250} b={2440} qa="s5-note" />
    </AbsoluteFill>
  );
};

/* ===================================================================== S6 · 2430–3170 · Performance */
const CELLS: [number, number, number, number, string][] = [[248, 315, 467, 399, "#1f9d6b"], [474, 315, 693, 399, "#1f9d6b"], [700, 315, 919, 399, "#e5484d"], [1153, 315, 1372, 399, "#1f9d6b"]];
export const S6: React.FC = () => {
  const f = useCurrentFrame();
  if (f < 2430 || f > 3175) return null;
  const into = ramp(f, 2430, 2452);
  const v1 = Math.min(ramp(f, 2436, 2450), 1 - ramp(f, 2520, 2540));
  const v2 = ramp(f, 3084, 3100) * (1 - ramp(f, 3150, 3172));
  // phone with the journal
  const ph = ramp(f, 2548, 2600, OUT);
  const phOut = ramp(f, 2612, 2660, EASE);
  // calendar card expands from the phone's calendar
  const cal = ramp(f, 2606, 2664, EASE);
  const cw = 1619 * (0.36 + 0.6 * cal);
  const cx = track(f, [[2606, 610], [2664, 960]], EASE);
  const cy = track(f, [[2606, 700], [2664, 610]], EASE);
  const flip = ramp(f, 2776, 2818, EASE);
  const eq = ramp(f, 2806, 2848, OUT);
  const grid = ramp(f, 2858, 2900, EASE); // equity card moves into the insights grid
  const eqW = 1400 - (1400 - 880) * grid;
  const eqX = 960 - eqW / 2 + (130 + 440 - 960) * grid;
  const eqY = track(f, [[2806, 610], [2900, 700]], EASE) - (eqW * 336) / 986 / 2;
  const hi = (a: number) => Math.min(ramp(f, a, a + 10), 1 - ramp(f, a + 56, a + 76));
  const r1 = wordAt(11, 0), r2 = wordAt(11, 5), r3 = wordAt(11, 11);
  const rows: [number, number, number][] = [[207, 328, r1], [96, 196, r2], [340, 439, r3]];
  const coach = ramp(f, 2870, 2920, OUT);
  const exit = ramp(f, 3084, 3110);
  return (
    <AbsoluteFill style={{ opacity: into }}>
      <LightBg />
      <AbsoluteFill style={{ filter: v2 ? `blur(${v2 * 10}px)` : undefined }}>
        {/* phone */}
        {phOut < 1 && ph > 0 && (
          <AbsoluteFill style={{ perspective: 2000, opacity: 1 - phOut }}>
            <div style={{ position: "absolute", left: 610 - 165, top: 560 - 340 + (1 - ph) * 600, transformStyle: "preserve-3d", transform: `translateZ(${-phOut * 300}px)` }}>
              <Phone w={330} ry={20 - 14 * ph} rz={-3 + 3 * ph}>
                <Shot n="mob-journal-light" w={393} />
              </Phone>
            </div>
          </AbsoluteFill>
        )}
        {/* calendar */}
        {cal > 0 && flip < 1 && (
          <AbsoluteFill style={{ perspective: 2400 }}>
            <div style={{ position: "absolute", left: cx - cw / 2, top: cy - (cw * 816) / 1619 / 2, transform: `rotateY(${flip * 90}deg)`, opacity: clamp01(cal * 3) }}>
              <div style={{ position: "relative" }}>
                <Shot n="j-cal-light" w={cw} radius={20} shadow />
                {CELLS.map(([x0, y0, x1, y1, c], k) => {
                  const p = ramp(f, 2672 + k * 18, 2690 + k * 18, OUT) * (1 - ramp(f, 2770, 2780));
                  const sc = cw / 1619;
                  return p > 0 ? <div key={k} style={{ position: "absolute", left: x0 * sc - 4, top: y0 * sc - 4, width: (x1 - x0) * sc + 8, height: (y1 - y0) * sc + 8, borderRadius: 14, border: `3px solid ${c}`, boxShadow: `0 0 ${24 * p}px ${c}`, opacity: p, transform: `scale(${1.08 - 0.08 * p})` }} /> : null;
                })}
              </div>
            </div>
          </AbsoluteFill>
        )}
        {/* equity curve (performance) */}
        {eq > 0 && exit < 1 && (
          <AbsoluteFill style={{ perspective: 2400 }}>
            <div style={{ position: "absolute", left: eqX, top: eqY, transform: `rotateY(${(1 - eq) * -90}deg)`, opacity: clamp01(eq * 3) }}>
              <Shot n="h-equity-light" w={eqW} radius={18} shadow />
            </div>
          </AbsoluteFill>
        )}
        {/* insights grid */}
        {grid > 0 && exit < 1 && (
          <>
            <Fly n="d-win-light" w={420} x={130} y={300} at={2862} f={f} from={[-120, 0, -200]} glow={hi(r1)} />
            <Fly n="d-health-light" w={440} x={570} y={322} at={2874} f={f} from={[-120, 0, -200]} />
            <div style={{ position: "absolute", left: 1100, top: 170, opacity: coach, transform: `translateX(${(1 - coach) * 160}px)` }}>
              <div style={{ position: "relative" }}>
                <Shot n="lc-card-dark" w={720} radius={26} shadow="0 50px 120px -30px rgba(30,20,80,0.55)" />
                {rows.map(([y0, y1, a], k) => {
                  const p = hi(a);
                  const sc = 720 / 524;
                  return p > 0 ? <div key={k} style={{ position: "absolute", left: 44 * sc, width: (498 - 44) * sc, top: y0 * sc - 2, height: (y1 - y0) * sc + 4, borderRadius: 14, border: "2px solid rgba(185,170,255,0.95)", boxShadow: `0 0 ${30 * p}px rgba(139,123,255,0.8)`, opacity: p }} /> : null;
                })}
              </div>
            </div>
          </>
        )}
      </AbsoluteFill>
      <Veil o={Math.max(v1, v2) * 0.92} />
      <Big text="UNDERSTAND YOUR [PERFORMANCE.]" at={2442} out={2516} size={124} qa="s6-big1" />
      <Label text="P&L calendar" index="01" at={2560} out={2770} qa="s6-l1" />
      <Label text="Performance" index="02" at={2798} out={2850} qa="s6-l2" />
      <Label text="Patterns in your decisions" index="03" at={2876} out={3070} qa="s6-l3" />
      <Big text="LEARN. [IMPROVE.]" at={3092} out={3150} size={160} qa="s6-big2" />
      <Note text="Labelled sample account · AI Coach shown as an illustrative example" a={2560} b={3080} qa="s6-note" />
    </AbsoluteFill>
  );
};

/* ===================================================================== S7 · 3150–3620 · Macro + calendar */
export const S7: React.FC = () => {
  const f = useCurrentFrame();
  if (f < 3140 || f > 3625) return null;
  const wipe = ramp(f, 3146, 3184, EASE);
  const v1 = Math.min(ramp(f, 3176, 3190), 1 - ramp(f, 3252, 3270));
  const v2 = Math.min(ramp(f, 3346, 3360), 1 - ramp(f, 3418, 3436));
  const desk = ramp(f, 3350, 3420, EASE);
  const ev = ramp(f, 3446, 3494, OUT);
  const sc = 1.62;
  const EV = { w: 371 * sc, x: 960 - (371 * sc) / 2, y: 200 };
  const rowHi = (a: number) => Math.min(ramp(f, a, a + 10), 1 - ramp(f, a + 30, a + 44));
  const ROWS: [number, number, number][] = [[58, 101, 3490], [113, 148, 3514], [164, 197, 3538]];
  const why = ramp(f, 3556, 3580, OUT);
  const push = track(f, [[3530, 1], [3610, 1.06]], EASE);
  const out = ramp(f, 3600, 3625);
  return (
    <AbsoluteFill style={{ clipPath: `inset(${(1 - wipe) * 100}% 0 0 0)` }}>
      <DarkBg />
      <AbsoluteFill style={{ filter: Math.max(v1, v2) ? `blur(${Math.max(v1, v2) * 10}px)` : undefined, opacity: 1 - out }}>
        {/* Macro Desk */}
        <AbsoluteFill style={{ perspective: 2400 }}>
          <div style={{ position: "absolute", inset: 0, transformStyle: "preserve-3d", transform: `translateZ(${-desk * 700}px) rotateX(${desk * 8}deg)`, opacity: 1 - desk * 0.82 }}>
            <Fly n="m-gold-dark" w={528} x={150} y={250} at={3262} f={f} from={[-200, 0, -300]} />
            <Fly n="m-dxy-dark" w={528} x={696} y={250} at={3274} f={f} from={[0, 80, -300]} />
            <Fly n="m-silver-dark" w={528} x={1242} y={250} at={3286} f={f} from={[200, 0, -300]} />
            <Fly n="m-dxygold-dark" w={935} x={492} y={510} at={3300} f={f} from={[0, 120, -300]} />
          </div>
        </AbsoluteFill>
        {/* Example event risk card (Treidify landing component) */}
        {ev > 0 && (
          <div style={{ position: "absolute", left: EV.x, top: EV.y, opacity: ev, transformOrigin: "50% 90%", transform: `translateY(${(1 - ev) * 80}px) scale(${push})` }}>
            <div style={{ position: "relative" }}>
              <Shot n="lm-events-dark" w={EV.w} radius={28} shadow="0 60px 140px -30px rgba(0,0,0,0.8), 0 0 80px rgba(83,63,245,0.25)" />
              {ROWS.map(([y0, y1, a], k) => {
                const p = rowHi(a);
                return p > 0 ? <div key={k} style={{ position: "absolute", left: 22 * sc, width: (349 - 22) * sc, top: y0 * sc - 3, height: (y1 - y0) * sc + 6, borderRadius: 16, border: "2px solid rgba(185,170,255,0.9)", boxShadow: `0 0 ${28 * p}px rgba(139,123,255,0.7)`, opacity: p }} /> : null;
              })}
              {why > 0 && <div style={{ position: "absolute", left: 20 * sc, width: (350 - 20) * sc, top: 266 * sc, height: 110 * sc, borderRadius: 18, border: "2px solid rgba(185,170,255,0.95)", boxShadow: `0 0 ${40 * why}px rgba(139,123,255,0.75)`, opacity: why }} />}
            </div>
          </div>
        )}
      </AbsoluteFill>
      <Veil o={Math.max(v1, v2) * 0.9} dark />
      <Big text="STAY [INFORMED.]" at={3184} out={3250} size={160} dark qa="s7-big1" />
      <Label text="Macro Desk" index="01" at={3268} out={3340} dark qa="s7-l1" />
      <Big text="UNDERSTAND THE [IMPACT.]" at={3354} out={3416} size={136} dark qa="s7-big2" />
      <Label text="Economic calendar" index="02" at={3436} out={3596} dark qa="s7-l2" />
      <Note text="Macro Desk on sample bars · events shown are labelled examples" a={3270} b={3600} dark qa="s7-note" />
    </AbsoluteFill>
  );
};

/* ===================================================================== S8 · 3600–4290 · Everything → logo */
export const S8: React.FC = () => {
  const f = useCurrentFrame();
  if (f < 3596) return null;
  const wipe = ramp(f, 3598, 3636, EASE);
  const conv = ramp(f, 3950, 3992, IN);
  const hiA = Math.min(ramp(f, 3636, 3650), 1 - ramp(f, 3700, 3716));
  const hiP = Math.min(ramp(f, 3720, 3734), 1 - ramp(f, 3776, 3792));
  const hiL = Math.min(ramp(f, 3796, 3810), 1 - ramp(f, 3852, 3868));
  const hiAll = Math.min(ramp(f, 3872, 3886), 1 - ramp(f, 3940, 3950));
  const camS = track(f, [[3600, 0.96], [3950, 1.04]], EASE);
  const mark = ramp(f, 3972, 4010, OUT);
  const word = ramp(f, 4005, 4040, OUT);
  return (
    <AbsoluteFill style={{ clipPath: `circle(${wipe * 120}% at 50% 60%)` }}>
      <LightBg />
      {conv < 1 && (
        <AbsoluteFill style={{ opacity: 1 - conv, transform: `scale(${camS * (1 - 0.7 * conv)})`, filter: conv ? `blur(${conv * 18}px)` : undefined, perspective: 2400 }}>
          {/* desktop */}
          <div style={{ position: "absolute", left: 960 - 560, top: 250, opacity: ramp(f, 3610, 3640), transform: `translateY(${(1 - ramp(f, 3610, 3660, OUT)) * 60}px)` }}>
            <Shot n="full-dash-light" w={1120} radius={22} shadow="0 60px 140px -40px rgba(40,30,90,0.45), 0 0 0 1px rgba(83,63,245,0.10)" />
          </div>
          {/* features */}
          <Fly n="chart-zones-light" w={520} x={70} y={200} at={3620} f={f} from={[-200, 0, -300]} glow={Math.max(hiA, hiAll)} style={{ transform: `rotate(-2deg) scale(${1 + 0.05 * hiA})` }} />
          <Fly n="h-equity-light" w={500} x={80} y={700} at={3632} f={f} from={[-200, 60, -300]} glow={Math.max(hiP, hiAll)} style={{ transform: `rotate(1.5deg) scale(${1 + 0.05 * hiP})` }} />
          <Fly n="j-cal-light" w={430} x={1290} y={195} at={3644} f={f} from={[200, 0, -300]} glow={Math.max(hiL, hiAll)} style={{ transform: `rotate(2deg) scale(${1 + 0.05 * hiL})` }} />
          <Fly n="m-gold-light" w={400} x={1440} y={760} at={3656} f={f} from={[200, 60, -300]} glow={hiAll} style={{ transform: "rotate(-1.5deg)" }} />
          {/* phone in front */}
          <div style={{ position: "absolute", left: 1200, top: 330 + (1 - ramp(f, 3626, 3690, OUT)) * 600, transformStyle: "preserve-3d" }}>
            <Phone w={250} ry={-14} rz={2}>
              <Shot n="mob-dash-light" w={393} />
            </Phone>
          </div>
        </AbsoluteFill>
      )}
      <Spoken line={13} qa="s8-a" y={120} size={70} out={3694} accent={["analysis"]} />
      <Spoken line={14} qa="s8-p" y={120} size={70} out={3770} accent={["performance"]} />
      <Spoken line={15} qa="s8-l" y={120} size={70} out={3846} accent={["learning"]} />
      <Spoken line={16} qa="s8-all" y={120} size={70} out={3946} accent={["one", "place"]} />
      {/* end card */}
      {mark > 0 && (
        <AbsoluteFill>
          <div style={{ position: "absolute", left: 960 - 80, top: 268, width: 160, height: 160, opacity: mark, transform: `scale(${0.7 + 0.3 * mark}) rotate(${(1 - mark) * -30}deg)`, filter: mark < 1 ? `blur(${(1 - mark) * 12}px)` : undefined }}>
            <Img src={staticFile("v2/t-512.png")} style={{ width: 160, height: 160 }} />
          </div>
          <div style={{ position: "absolute", left: 0, right: 0, top: 470, textAlign: "center", fontFamily: DISPLAY, fontWeight: 700, fontSize: 118, letterSpacing: `${0.3 - 0.12 * word}em`, paddingLeft: `${0.3 - 0.12 * word}em`, color: INK, opacity: word, filter: word < 1 ? `blur(${(1 - word) * 10}px)` : undefined }}><span data-qa="s8-word">TREIDIFY</span></div>
        </AbsoluteFill>
      )}
      <Big text="Trade with [clarity.]" at={4086} out={0} size={60} y={690} qa="s8-tag" stagger={0.9} />
      {f > 4130 && (
        <div style={{ position: "absolute", left: 0, right: 0, top: 790, textAlign: "center", fontFamily: BODY, fontWeight: 600, fontSize: 34, letterSpacing: "0.04em", color: VIOLET, opacity: ramp(f, 4130, 4160), transform: `translateY(${(1 - ramp(f, 4130, 4166, OUT)) * 16}px)` }}><span data-qa="s8-url">treidify.com</span></div>
      )}
    </AbsoluteFill>
  );
};
