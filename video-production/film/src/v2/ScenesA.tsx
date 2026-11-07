import React from "react";
import { AbsoluteFill, Img, staticFile, useCurrentFrame } from "remotion";
import { BODY, DISPLAY, EASE, IN, OUT, clamp01, ramp, track } from "../lib";
import { Big, DarkBg, INK, Label, LightBg, Note, PINK, Phone, Shadow, Shot, Spoken, VIOLET, Veil, dim, mblur } from "./kit";

/** chart crop sits at this CSS box inside the 1920x1080 desktop capture */
export const CHART = { x: 272, y: 290, w: 1180, h: 662 };

/** world (1920x1080 desktop space) → screen camera. Point (cx,cy) of the world lands on (sx,sy) at scale s. */
const cam = (cx: number, cy: number, s: number, sx = 960, sy = 540) => ({ transformOrigin: "0 0", transform: `translate(${sx - cx * s}px, ${sy - cy * s}px) scale(${s})` });

const Chip: React.FC<{ qa: string; text: string; n?: string; on: number; x: number; y: number; tone?: "violet" | "red" | "dark"; size?: number }> = ({ qa, text, n, on, x, y, tone = "violet", size = 15 }) => {
  if (on <= 0) return null;
  const bg = tone === "red" ? "#e5484d" : tone === "dark" ? "#14121c" : VIOLET;
  return (
    <div data-qa={qa} style={{ position: "absolute", left: x, top: y, opacity: clamp01(on * 1.5), transform: `translateY(${(1 - on) * 10}px) scale(${0.9 + 0.1 * on})`, transformOrigin: "0 50%", display: "flex", alignItems: "center", gap: size * 0.45, padding: `${size * 0.38}px ${size * 0.75}px`, borderRadius: 999, background: bg, color: "white", fontFamily: BODY, fontWeight: 600, fontSize: size, whiteSpace: "nowrap", boxShadow: `0 ${size * 0.5}px ${size * 1.4}px -${size * 0.4}px rgba(83,63,245,0.45)` }}>
      {n && <span style={{ display: "inline-flex", width: size * 1.25, height: size * 1.25, borderRadius: 99, background: "rgba(255,255,255,0.22)", alignItems: "center", justifyContent: "center", fontSize: size * 0.75 }}>{n}</span>}
      {text}
    </div>
  );
};

/* ===================================================================== S1 · 0–440 · Stop chasing */
export const S1: React.FC = () => {
  const f = useCurrentFrame();
  if (f > 445) return null;
  // printing edge of the chart (crop-local x)
  const edge = track(f, [[0, 60], [120, 420], [236, 712], [300, 790], [340, 840]], (t) => t);
  const kx: [number, number][] = [[0, 150], [120, 400], [200, 640], [240, 700], [300, 740], [350, 640], [440, 620]];
  const ky: [number, number][] = [[0, 470], [120, 330], [200, 270], [240, 250], [300, 330], [350, 340], [440, 340]];
  const ks: [number, number][] = [[0, 2.5], [120, 2.3], [200, 2.15], [240, 2.6], [300, 1.9], [350, 1.25], [440, 1.18]];
  const cx = track(f, kx, EASE), cy = track(f, ky, EASE), s = track(f, ks, EASE);
  const vx = (track(f + 1, kx, EASE) - cx) * s;
  const shake = f > 236 && f < 262 ? Math.sin(f * 2.1) * (262 - f) * 0.35 : 0;
  const late = ramp(f, 236, 254, OUT);
  const loss = ramp(f, 252, 320, EASE);
  const stop = ramp(f, 296, 318, EASE);
  const out = ramp(f, 410, 440, IN);
  const lx = 706, ly = 236; // the top that was chased (sample bars)
  return (
    <AbsoluteFill style={{ opacity: 1 - out }}>
      <DarkBg />
      <AbsoluteFill style={{ filter: `blur(${stop * 10}px) brightness(${1 - stop * 0.45})` }}>
        <AbsoluteFill style={{ ...cam(cx, cy + shake * 0.2, s), filter: mblur(vx, "x") || undefined }}>
          <div style={{ position: "absolute", left: 0, top: 0, width: CHART.w, height: CHART.h, clipPath: `inset(0 ${CHART.w - edge}px 0 0)` }}>
            <Shot n="chart-clean-dark" />
          </div>
          {/* printing edge glow */}
          <div style={{ position: "absolute", left: edge - 2, top: 40, width: 3, height: CHART.h - 120, background: "linear-gradient(180deg, transparent, rgba(185,170,255,0.9), transparent)", boxShadow: "0 0 24px 6px rgba(139,123,255,0.45)", opacity: 1 - ramp(f, 320, 345) }} />
          {/* late entry */}
          {late > 0 && (
            <>
              <div style={{ position: "absolute", left: lx, top: ly, width: (edge - lx) * clamp01(late * 2), height: 2, borderTop: "2px dashed rgba(255,110,120,0.95)" }} />
              <div style={{ position: "absolute", left: lx, top: ly, width: Math.max(0, edge - lx), height: Math.max(0, (441 - ly) * loss), background: "linear-gradient(180deg, rgba(229,72,77,0.28), rgba(229,72,77,0.05))" }} />
              <div style={{ position: "absolute", left: lx - 9, top: ly - 9, width: 18, height: 18, borderRadius: 99, background: "#ff5d6c", boxShadow: `0 0 0 ${8 * late}px rgba(255,93,108,0.25)`, transform: `scale(${late})` }} />
              <Chip qa="s1-late" text="Late entry" on={late * (1 - stop)} x={lx - 150} y={ly - 58} tone="red" size={15} />
            </>
          )}
        </AbsoluteFill>
      </AbsoluteFill>
      <AbsoluteFill style={{ background: "linear-gradient(180deg, transparent 62%, rgba(8,7,14,0.85) 100%)", opacity: 1 - stop }} />
      <Spoken line={0} qa="s1-vo" y={930} size={50} dark maxW={1500} out={290} />
      <Big text="STOP [CHASING.]" at={300} out={402} size={190} dark qa="s1-big" />
    </AbsoluteFill>
  );
};

/* ===================================================================== S2 · 420–770 · Meet Treidify */
export const S2: React.FC = () => {
  const f = useCurrentFrame();
  if (f < 405 || f > 775) return null;
  const wipe = ramp(f, 405, 445, EASE);
  const logo = ramp(f, 440, 476, OUT);
  const logoOut = ramp(f, 560, 600, IN);
  // phone
  const ph = ramp(f, 556, 640, OUT);
  const py = track(f, [[556, 1020], [640, 540]], OUT);
  const ry = track(f, [[556, -48], [640, -16], [700, 10], [728, 0]], EASE);
  const rz = track(f, [[556, 12], [640, -3], [700, 2], [728, 0]], EASE);
  const rx = track(f, [[556, 24], [640, 6], [728, 0]], EASE);
  const scroll = track(f, [[640, 0], [690, -230]], EASE);
  const toMarkets = ramp(f, 690, 704);
  const ex = ramp(f, 712, 758, EASE);
  const W = 360, H = W * 2.06, bez = W * 0.04;
  const sw = W - 2 * bez, sh = H - 2 * bez;
  const rw = sw + (1920 - sw) * ex, rh = sh + (1080 - sh) * ex;
  return (
    <AbsoluteFill style={{ clipPath: `circle(${wipe * 120}% at 50% 50%)` }}>
      <LightBg />
      {/* logo lockup */}
      <AbsoluteFill style={{ opacity: logo * (1 - logoOut), transform: `translateY(${-logoOut * 120}px) scale(${0.92 + 0.08 * logo})`, filter: `blur(${(1 - logo) * 14 + logoOut * 10}px)` }}>
        <div style={{ position: "absolute", left: 960 - 75, top: 300, width: 150, height: 150 }}>
          <Img src={staticFile("v2/t-512.png")} style={{ width: 150, height: 150, transform: `rotate(${(1 - logo) * -25}deg)` }} />
        </div>
      </AbsoluteFill>
      {f < 600 && <Big text="Meet [Treidify.]" at={446} out={556} size={128} y={590} qa="s2-meet" stagger={1.4} />}
      {/* phone */}
      {f >= 556 && ex < 1 && (
        <AbsoluteFill style={{ perspective: 2200, opacity: 1 - ramp(f, 712, 726) }}>
          <Shadow w={420} o={0.3 * ph} style={{ left: 960 - 210, top: py + H / 2 - 10 }} />
          <div style={{ position: "absolute", left: 960 - W / 2, top: py - H / 2, transformStyle: "preserve-3d" }}>
            <Phone w={W} ry={ry} rz={rz} rx={rx}>
              <div style={{ position: "absolute", inset: 0, transform: `translateY(${scroll}px)` }}><Shot n="mob-dash-light-full" w={393} /></div>
              <div style={{ position: "absolute", inset: 0, opacity: toMarkets }}><Shot n="mob-markets-light" w={393} /></div>
            </Phone>
          </div>
        </AbsoluteFill>
      )}
      {/* screen expands into the desktop app */}
      {f >= 708 && (
        <div style={{ position: "absolute", left: 960 - rw / 2, top: 540 - rh / 2, width: rw, height: rh, borderRadius: 52 * (1 - ex), overflow: "hidden", boxShadow: "0 40px 120px -30px rgba(40,30,90,0.4)" }}>
          <div style={{ position: "absolute", left: rw / 2 - Math.max(rw, (rh * 16) / 9) / 2, top: rh / 2 - Math.max(rh, (rw * 9) / 16) / 2 }}>
            <Shot n="full-clean-light" w={Math.max(rw, (rh * 16) / 9)} />
          </div>
          <div style={{ position: "absolute", inset: 0, opacity: 1 - ramp(f, 712, 736) }}>
            <Shot n="mob-markets-light" w={rw} />
          </div>
        </div>
      )}
    </AbsoluteFill>
  );
};

/* ===================================================================== S3 · 750–1400 · Liquidity / S&D / Fibonacci */
const Wipe: React.FC<{ n: Parameters<typeof Shot>[0]["n"]; p: number; o?: number }> = ({ n, p, o = 1 }) =>
  p <= 0 || o <= 0 ? null : (
    <div style={{ position: "absolute", inset: 0, clipPath: `inset(0 ${(1 - p) * 100}% 0 0)`, opacity: o }}>
      <Shot n={n} />
    </div>
  );

export const S3: React.FC = () => {
  const f = useCurrentFrame();
  if (f < 750 || f > 1405) return null;
  const base = 1 - ramp(f, 770, 812, EASE); // surrounding desktop UI fades, the chart stays
  const s = track(f, [[758, 1], [812, 1.18], [1220, 1.2], [1270, 0.86], [1400, 0.9]], EASE);
  const cy = track(f, [[758, 540], [812, 621], [1220, 621]], EASE);
  const cx = track(f, [[758, 960], [812, 862], [1220, 862]], EASE);
  const sy = track(f, [[758, 540], [812, 594], [1220, 594], [1270, 640]], EASE);
  const sx = track(f, [[1220, 960], [1270, 900]], EASE);
  const veil = (a: number, b: number) => Math.min(ramp(f, a - 4, a + 10), 1 - ramp(f, b, b + 18));
  const v = Math.max(veil(774, 834), veil(930, 990), veil(1086, 1146));
  const liq = ramp(f, 846, 900, EASE), zon = ramp(f, 1000, 1050, EASE), fib = ramp(f, 1156, 1200, EASE);
  const all = ramp(f, 1236, 1270);
  const liqO = Math.max(1 - ramp(f, 988, 1004), all), zonO = Math.max(1 - ramp(f, 1144, 1160), all);
  const phone = ramp(f, 1250, 1300, OUT);
  const out = ramp(f, 1380, 1405);
  return (
    <AbsoluteFill style={{ opacity: f < 1380 ? 1 : 1 - out * 0 }}>
      <LightBg />
      <AbsoluteFill style={{ filter: v ? `blur(${v * 10}px)` : undefined }}>
        <AbsoluteFill style={cam(cx, cy, s, sx, sy)}>
          {base > 0 && <div style={{ position: "absolute", left: 0, top: 0, opacity: base }}><Shot n="full-clean-light" /></div>}
          <div style={{ position: "absolute", left: CHART.x, top: CHART.y, width: CHART.w, height: CHART.h, borderRadius: 18 * (1 - base), overflow: "hidden", boxShadow: base < 1 ? `0 40px 100px -30px rgba(40,30,90,${0.35 * (1 - base)}), 0 0 0 1px rgba(83,63,245,${0.08 * (1 - base)})` : undefined }}>
            <Shot n="chart-clean-light" />
            <Wipe n="ov-liq-light" p={liq} o={liqO} />
            <Wipe n="ov-zones-light" p={zon} o={zonO} />
            <Wipe n="ov-fib-light" p={fib} />
          </div>
        </AbsoluteFill>
      </AbsoluteFill>
      {/* the same tools on the phone */}
      {phone > 0 && (
        <AbsoluteFill style={{ perspective: 2000 }}>
          <div style={{ position: "absolute", left: 1500, top: 300 + (1 - phone) * 500, transformStyle: "preserve-3d" }}>
            <Phone w={250} ry={-16 + 6 * phone} rz={-2}>
              <Shot n="mob-markets-light" w={393} />
            </Phone>
          </div>
        </AbsoluteFill>
      )}
      <Veil o={v * 0.9} />
      <Big text="LIQUIDITY" at={774} out={830} size={170} qa="s3-big-liq" />
      <Big text="SUPPLY & [DEMAND]" at={930} out={986} size={160} qa="s3-big-sd" />
      <Big text="FIBONACCI" at={1086} out={1142} size={170} qa="s3-big-fib" />
      <Label text="Liquidity" index="01" at={846} out={908} qa="s3-l1" />
      <Label text="Supply & demand zones" index="02" at={1002} out={1064} qa="s3-l2" />
      <Label text="Fibonacci levels" index="03" at={1158} out={1200} qa="s3-l3" />
      <Spoken line={5} qa="s3-all" y={128} size={76} out={1360} accent={["one", "place"]} />
      <Note text="Real Treidify chart tools · labelled sample bars, not live prices" a={820} b={1370} qa="s3-note" />
    </AbsoluteFill>
  );
};

/* ===================================================================== S4 · 1380–1990 · Structure / FOMO */
export const S4: React.FC = () => {
  const f = useCurrentFrame();
  if (f < 1380 || f > 1995) return null;
  const into = ramp(f, 1380, 1410);
  // camera on the structure + liquidity chart (crop-local coords → world = CHART.x + lx)
  const lx = track(f, [[1380, 590], [1480, 590], [1530, 760], [1770, 770], [1820, 590]], EASE);
  const ly = track(f, [[1380, 331], [1480, 331], [1530, 320], [1770, 330], [1820, 331]], EASE);
  const s = track(f, [[1380, 0.9], [1480, 1.25], [1530, 2.15], [1770, 2.25], [1830, 1.15], [1990, 1.0]], EASE);
  const v = Math.max(Math.min(ramp(f, 1388, 1402), 1 - ramp(f, 1470, 1488)), Math.min(ramp(f, 1796, 1810), 1 - ramp(f, 1904, 1922)));
  const at = (a: number) => ramp(f, a, a + 20, OUT) * (1 - ramp(f, 1772, 1790));
  const c1 = at(1540), c2 = at(1616), c3 = at(1640), c4 = at(1672);
  const box = at(1668);
  const out = ramp(f, 1930, 1990, IN);
  const P = (x: number, y: number) => ({ left: x, top: y });
  return (
    <AbsoluteFill style={{ opacity: into }}>
      <LightBg />
      <AbsoluteFill style={{ filter: v ? `blur(${v * 10}px)` : undefined, opacity: 1 - out, transform: `scale(${1 - out * 0.1})` }}>
        <AbsoluteFill style={cam(CHART.x + lx, CHART.y + ly, s, 960, 600)}>
          <div style={{ position: "absolute", left: CHART.x, top: CHART.y, width: CHART.w, height: CHART.h, borderRadius: 18, overflow: "hidden", boxShadow: "0 40px 100px -30px rgba(40,30,90,0.35)" }}>
            <Shot n="chart-structliq-light" />
            {/* confirmation area */}
            {box > 0 && <div style={{ position: "absolute", left: 734, top: 300, width: 58, height: 52, borderRadius: 6, border: `1.5px dashed ${VIOLET}`, background: "rgba(83,63,245,0.10)", opacity: box }} />}
            {/* leader lines */}
            <svg width={CHART.w} height={CHART.h} style={{ position: "absolute", inset: 0 }}>
              {c1 > 0 && <line x1={560} y1={186} x2={630} y2={286} stroke={VIOLET} strokeWidth={1.4} strokeDasharray="3 3" opacity={c1} />}
              {c2 > 0 && <line x1={790} y1={190} x2={714} y2={236} stroke={VIOLET} strokeWidth={1.4} strokeDasharray="3 3" opacity={c2} />}
              {c3 > 0 && <line x1={872} y1={392} x2={760} y2={318} stroke={VIOLET} strokeWidth={1.4} strokeDasharray="3 3" opacity={c3} />}
              {c4 > 0 && <line x1={958} y1={482} x2={792} y2={344} stroke={VIOLET} strokeWidth={1.4} strokeDasharray="3 3" opacity={c4} />}
            </svg>
            <div style={{ position: "absolute", ...P(452, 160) }}><Chip qa="s4-c1" n="1" text="Liquidity above the high" on={c1} x={0} y={0} size={12} /></div>
            <div style={{ position: "absolute", ...P(790, 172) }}><Chip qa="s4-c2" n="2" text="Sweep" on={c2} x={0} y={0} size={12} /></div>
            <div style={{ position: "absolute", ...P(872, 380) }}><Chip qa="s4-c3" n="3" text="Structure shift" on={c3} x={0} y={0} size={12} /></div>
            <div style={{ position: "absolute", ...P(958, 472) }}><Chip qa="s4-c4" n="4" text="Confirmation area" on={c4} x={0} y={0} size={12} /></div>
          </div>
        </AbsoluteFill>
      </AbsoluteFill>
      <AbsoluteFill style={{ background: "linear-gradient(180deg, rgba(246,245,251,0.96) 0px, rgba(246,245,251,0.85) 150px, rgba(246,245,251,0) 230px)", opacity: ramp(f, 1490, 1520) * (1 - ramp(f, 1772, 1800)) }} />
      <AbsoluteFill style={{ background: "linear-gradient(0deg, rgba(246,245,251,0.95) 0px, rgba(246,245,251,0.8) 100px, rgba(246,245,251,0) 190px)", opacity: ramp(f, 1490, 1520) * (1 - ramp(f, 1772, 1800)) }} />
      <Veil o={v * 0.9} />
      <Big text="UNDERSTAND [STRUCTURE.]" at={1392} out={1468} size={128} qa="s4-big1" />
      <Label text="Wait for liquidity, then confirmation" at={1500} out={1772} qa="s4-label" size={44} />
      <Big text="CONTROL YOUR [FOMO.]" at={1800} out={1904} size={140} qa="s4-big2" />
      <Note text="Historical illustration on labelled sample bars · not a trade signal" a={1480} b={1790} qa="s4-note" />
    </AbsoluteFill>
  );
};
