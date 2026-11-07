import React from "react";
import { AbsoluteFill, Img, interpolate, staticFile, useCurrentFrame } from "remotion";
import meta from "../../public/v2.json";
import lines from "../../public/vo/lines.json";
import tl from "../../commercial.json";
import { DISPLAY, BODY, EASE, IN, OUT, clamp01, ramp } from "../lib";

export const INK = "#14121c";
export const INK2 = "#5b5869";
export const VIOLET = "#533ff5";
export const PINK = "#ed74ce";
export const PAPER = "#f6f5fb";
export const NIGHT = "#0a0911";

export type Layer = keyof typeof meta;
export const dim = (n: Layer) => ({ w: meta[n].w, h: meta[n].h });

/** A real Treidify capture layer at its CSS size (or a given width). */
export const Shot: React.FC<{ n: Layer; w?: number; radius?: number; style?: React.CSSProperties; shadow?: boolean | string }> = ({ n, w, radius = 0, style, shadow }) => {
  const m = meta[n];
  const W = w ?? m.w;
  const H = (W * m.h) / m.w;
  return (
    <div style={{ width: W, height: H, borderRadius: radius, overflow: "hidden", boxShadow: shadow === true ? "0 40px 90px -30px rgba(40,30,90,0.35), 0 10px 30px -10px rgba(40,30,90,0.18)" : shadow || undefined, ...style }}>
      <Img src={staticFile(m.file)} style={{ width: W, height: H, display: "block" }} />
    </div>
  );
};

/* ------------------------------------------------------------- backgrounds */

export const LightBg: React.FC<{ o?: number }> = ({ o = 1 }) => {
  const f = useCurrentFrame();
  const t = f / 60;
  const x1 = 22 + 8 * Math.sin(t * 0.21), y1 = 18 + 6 * Math.cos(t * 0.17);
  const x2 = 80 + 7 * Math.cos(t * 0.19), y2 = 28 + 6 * Math.sin(t * 0.23);
  const wave = 50 + 14 * Math.sin(t * 0.33);
  return (
    <AbsoluteFill style={{ opacity: o, background: PAPER }}>
      <AbsoluteFill
        style={{
          background: `radial-gradient(42% 46% at ${x1}% ${y1}%, rgba(83,63,245,0.10), transparent 70%),
            radial-gradient(40% 44% at ${x2}% ${y2}%, rgba(237,116,206,0.10), transparent 70%),
            radial-gradient(70% 38% at ${wave}% 112%, rgba(83,63,245,0.30), transparent 72%),
            radial-gradient(46% 30% at ${100 - wave * 0.6}% 108%, rgba(237,116,206,0.26), transparent 70%),
            radial-gradient(60% 34% at ${wave * 0.5 + 10}% 104%, rgba(139,123,255,0.22), transparent 70%)`,
        }}
      />
    </AbsoluteFill>
  );
};

export const DarkBg: React.FC<{ o?: number }> = ({ o = 1 }) => {
  const f = useCurrentFrame();
  const t = f / 60;
  const x = 50 + 16 * Math.sin(t * 0.2);
  return (
    <AbsoluteFill style={{ opacity: o, background: `linear-gradient(180deg, #0c0a16 0%, ${NIGHT} 60%, #07060c 100%)` }}>
      <AbsoluteFill style={{ background: `radial-gradient(55% 45% at ${x}% 30%, rgba(83,63,245,0.16), transparent 70%), radial-gradient(60% 40% at ${100 - x}% 110%, rgba(237,116,206,0.10), transparent 70%)` }} />
    </AbsoluteFill>
  );
};

/** Grain + soft vignette. */
export const Finish: React.FC<{ dark?: number }> = ({ dark = 0 }) => {
  const f = useCurrentFrame();
  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      <AbsoluteFill style={{ background: `radial-gradient(130% 100% at 50% 50%, transparent 60%, rgba(10,8,30,${0.10 + 0.35 * dark}) 100%)` }} />
      <AbsoluteFill style={{ backgroundImage: `url(${staticFile("v2/grain.png")})`, backgroundPosition: `${(f * 137) % 512}px ${(f * 263) % 512}px`, opacity: 0.05 + 0.03 * dark, mixBlendMode: "overlay" }} />
    </AbsoluteFill>
  );
};

/** SVG directional blur filters: url(#mbx4) / url(#mby6) etc. */
export const Filters: React.FC = () => (
  <svg width={0} height={0} style={{ position: "absolute" }}>
    {[1, 2, 3, 4, 6, 8, 12, 16, 24].map((k) => (
      <React.Fragment key={k}>
        <filter id={`mbx${k}`} x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation={`${k} 0`} /></filter>
        <filter id={`mby${k}`} x="-20%" y="-50%" width="140%" height="200%"><feGaussianBlur stdDeviation={`0 ${k}`} /></filter>
      </React.Fragment>
    ))}
  </svg>
);
const LV = [0, 1, 2, 3, 4, 6, 8, 12, 16, 24];
/** Quantised directional motion blur (CSS filter string) for a velocity in px/frame. */
export const mblur = (v: number, axis: "x" | "y") => {
  const k = Math.abs(v) * 0.5;
  let best = 0;
  for (const l of LV) if (l <= k) best = l;
  return best ? `url(#mb${axis}${best})` : "";
};

/* ------------------------------------------------------------- typography */

type TextProps = { at: number; out: number; qa: string };

/**
 * Dominant statement: characters rise out of a mask with vertical motion blur and tracking that settles;
 * exits upward. [bracketed] words take the brand gradient.
 */
export const Big: React.FC<TextProps & { text: string; size?: number; dark?: boolean; y?: number; stagger?: number; maxW?: number }> = ({ text, at, out, qa, size = 150, dark = false, y = 540, stagger = 1.6, maxW = 1680 }) => {
  const f = useCurrentFrame();
  if (f < at - 2 || (out && f > out + 40)) return null;
  const parts = text.split(/(\[[^\]]+\])/).filter(Boolean);
  const words: { w: string; acc: boolean }[] = [];
  for (const p of parts) {
    const acc = p.startsWith("[");
    for (const w of p.replace(/[[\]]/g, "").split(" ").filter(Boolean)) words.push({ w, acc });
  }
  const total = words.reduce((s, w) => s + w.w.length, 0);
  const track = interpolate(f, [at, at + 50], [0.14, -0.02], { easing: OUT, extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  let ci = 0;
  const col = dark ? "#f6f5fb" : INK;
  return (
    <div data-qa={qa} style={{ position: "absolute", left: (1920 - maxW) / 2, width: maxW, top: y, transform: "translateY(-50%)", display: "flex", flexWrap: "wrap", justifyContent: "center", columnGap: size * 0.26, rowGap: size * 0.02, fontFamily: DISPLAY, fontWeight: 700, fontSize: size, lineHeight: 1.04, letterSpacing: `${track}em`, color: col }}>
      {words.map((wd, wi) => (
        <span key={wi} style={{ display: "inline-flex", overflow: "hidden", padding: `${size * 0.06}px 0.02em ${size * 0.1}px` }}>
          {wd.w.split("").map((ch, k) => {
            const i = ci++;
            const s = at + i * stagger;
            const p = ramp(f, s, s + 26, OUT);
            const v = (ramp(f, s + 1, s + 27, OUT) - p) * 110;
            const e = out ? ramp(f, out + (i / total) * 10, out + (i / total) * 10 + 18, IN) : 0;
            const ty = (1 - p) * 105 - e * 105;
            return (
              <span key={k} style={{ display: "inline-block", transform: `translateY(${ty}%)`, filter: mblur(v + e * 8, "y") || undefined, opacity: clamp01(p * 1.4) * (1 - e * 0.6), ...(wd.acc ? { background: `linear-gradient(90deg, ${VIOLET}, ${PINK})`, WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent", backgroundSize: `${wd.w.length}em 100%`, backgroundPosition: `${-k}em 0` } : {}) }}>
                {ch}
              </span>
            );
          })}
        </span>
      ))}
    </div>
  );
};

/** Section label in the top-left safe band (one at a time). */
export const Label: React.FC<TextProps & { text: string; index?: string; dark?: boolean; x?: number; y?: number; size?: number }> = ({ text, at, out, qa, index, dark = false, x = 110, y = 78, size = 50 }) => {
  const f = useCurrentFrame();
  if (f < at - 1 || f > out + 30) return null;
  const p = ramp(f, at, at + 30, OUT);
  const e = ramp(f, out, out + 22, IN);
  const v = (ramp(f, at + 1, at + 31, OUT) - p) * 80;
  return (
    <div data-qa={qa} style={{ position: "absolute", left: x, top: y, display: "flex", alignItems: "center", gap: 22, overflow: "hidden", padding: "6px 4px 10px" }}>
      {index && (
        <div style={{ fontFamily: BODY, fontWeight: 600, fontSize: size * 0.36, letterSpacing: "0.14em", color: dark ? "#a99cff" : VIOLET, opacity: p * (1 - e), transform: `translateX(${(1 - p) * -20}px)` }}>{index}</div>
      )}
      <div style={{ fontFamily: DISPLAY, fontWeight: 650, fontSize: size, letterSpacing: "-0.02em", color: dark ? "#f6f5fb" : INK, opacity: 1 - e, transform: `translateY(${(1 - p) * 110 - e * 110}%)`, filter: mblur(v, "y") || undefined }}>{text}</div>
    </div>
  );
};

/**
 * Narration-synced words (the reference technique): each word rises in on its spoken time; the word being
 * spoken carries the brand violet and settles to ink. Timings come from public/vo/lines.json.
 */
export const Spoken: React.FC<{ line: number; qa: string; out?: number; size?: number; y?: number; dark?: boolean; maxW?: number; weight?: number; accent?: string[] }> = ({ line, qa, out, size = 84, y = 540, dark = false, maxW = 1500, weight = 650, accent = [] }) => {
  const f = useCurrentFrame();
  const L = lines[line];
  const start = tl.vo[line];
  const end = out ?? start + Math.round(L.dur * 60) + 40;
  if (f < start - 6 || f > end + 30) return null;
  const e = ramp(f, end, end + 20, IN);
  return (
    <div data-qa={qa} style={{ position: "absolute", left: (1920 - maxW) / 2, width: maxW, top: y, transform: "translateY(-50%)", display: "flex", flexWrap: "wrap", justifyContent: "center", columnGap: size * 0.27, fontFamily: DISPLAY, fontWeight: weight, fontSize: size, lineHeight: 1.12, letterSpacing: "-0.025em" }}>
      {L.words.map((w, i) => {
        const t0 = start + w.t0 * 60 - 4;
        const t1 = start + w.t1 * 60;
        const p = ramp(f, t0, t0 + 18, OUT);
        const v = (ramp(f, t0 + 1, t0 + 19, OUT) - p) * 90;
        const hot = clamp01(Math.min(ramp(f, t0, t0 + 6), 1 - ramp(f, t1 + 6, t1 + 26)));
        const clean = w.w.replace(/[,]/g, "");
        const acc = accent.includes(clean.replace(/[.?]/g, ""));
        const base = dark ? [246, 245, 251] : [20, 18, 28];
        const hc = [83, 63, 245];
        const c = acc ? hc : base.map((b, k) => Math.round(b + (hc[k] - b) * hot));
        return (
          <span key={i} style={{ display: "inline-block", overflow: "hidden", padding: `${size * 0.04}px 0 ${size * 0.12}px` }}>
            <span style={{ display: "inline-block", color: `rgb(${c.join(",")})`, transform: `translateY(${(1 - p) * 100 - e * 100}%)`, filter: mblur(v + e * 6, "y") || undefined, opacity: clamp01(p * 1.5) * (1 - e) }}>{clean}</span>
          </span>
        );
      })}
    </div>
  );
};

/** Honest small print for sample / illustrative content (bottom-left safe area, readable size). */
export const Note: React.FC<{ text: string; a: number; b: number; qa: string; dark?: boolean; right?: boolean }> = ({ text, a, b, qa, dark = false, right = false }) => {
  const f = useCurrentFrame();
  const o = Math.min(ramp(f, a, a + 20), 1 - ramp(f, b - 16, b));
  if (o <= 0) return null;
  return (
    <div data-qa={qa} style={{ position: "absolute", bottom: 46, ...(right ? { right: 64 } : { left: 64 }), opacity: o, fontFamily: BODY, fontSize: 21, fontWeight: 500, letterSpacing: "0.01em", color: dark ? "rgba(236,234,245,0.78)" : "rgba(40,36,60,0.72)", padding: "9px 18px", borderRadius: 999, background: dark ? "rgba(255,255,255,0.06)" : "rgba(255,255,255,0.72)", border: dark ? "1px solid rgba(255,255,255,0.10)" : "1px solid rgba(83,63,245,0.12)", backdropFilter: "blur(8px)" }}>
      {text}
    </div>
  );
};

/** Soft scrim that keeps a statement legible over UI. */
export const Veil: React.FC<{ o: number; dark?: boolean }> = ({ o, dark = false }) =>
  o <= 0 ? null : (
    <AbsoluteFill style={{ opacity: o, background: dark ? "radial-gradient(70% 60% at 50% 50%, rgba(8,7,14,0.82), rgba(8,7,14,0.55))" : "radial-gradient(70% 60% at 50% 50%, rgba(246,245,251,0.93), rgba(246,245,251,0.7))" }} />
  );

/* ------------------------------------------------------------------ iPhone */

/**
 * A modern iPhone built from layers: titanium band with real depth (stacked slices), black bezel, Dynamic Island,
 * side buttons, glass reflection. `children` is the screen content (393x852 CSS points, scaled to fit).
 */
export const Phone: React.FC<{ w?: number; ry?: number; rx?: number; rz?: number; glare?: number; children: React.ReactNode; screenStyle?: React.CSSProperties; dark?: boolean }> = ({ w = 360, ry = 0, rx = 0, rz = 0, glare = 0.5, children, screenStyle, dark = false }) => {
  const h = w * 2.06;
  const R = w * 0.165;
  const bez = w * 0.04;
  const sw = w - bez * 2;
  const sh = h - bez * 2;
  const depth = Math.round(w * 0.045);
  const slices = 10;
  const band = dark ? "linear-gradient(90deg,#3a3946,#6c6a78 18%,#2a2934 50%,#6c6a78 82%,#3a3946)" : "linear-gradient(90deg,#b9b7c2,#f2f1f6 16%,#9a98a6 50%,#eeedf3 84%,#b2b0bc)";
  return (
    <div style={{ width: w, height: h, position: "relative", transformStyle: "preserve-3d", transform: `rotateX(${rx}deg) rotateY(${ry}deg) rotateZ(${rz}deg)` }}>
      {/* depth slices */}
      {Array.from({ length: slices }).map((_, i) => (
        <div key={i} style={{ position: "absolute", inset: 0, borderRadius: R, background: band, transform: `translateZ(${-depth + (i * depth) / slices}px)`, opacity: 1 }} />
      ))}
      {/* side buttons */}
      <div style={{ position: "absolute", right: -w * 0.012, top: h * 0.27, width: w * 0.016, height: h * 0.11, borderRadius: 4, background: band, transform: `translateZ(${-depth / 2}px)` }} />
      <div style={{ position: "absolute", left: -w * 0.012, top: h * 0.2, width: w * 0.016, height: h * 0.065, borderRadius: 4, background: band, transform: `translateZ(${-depth / 2}px)` }} />
      <div style={{ position: "absolute", left: -w * 0.012, top: h * 0.29, width: w * 0.016, height: h * 0.065, borderRadius: 4, background: band, transform: `translateZ(${-depth / 2}px)` }} />
      {/* front */}
      <div style={{ position: "absolute", inset: 0, borderRadius: R, background: band, padding: w * 0.012, boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.4)" }}>
        <div style={{ position: "absolute", inset: w * 0.012, borderRadius: R - w * 0.012, background: "#050507" }} />
        <div style={{ position: "absolute", left: bez, top: bez, width: sw, height: sh, borderRadius: R - bez, overflow: "hidden", background: "#fff", ...screenStyle }}>
          <div style={{ position: "absolute", left: 0, top: 0, width: 393, height: 852, transformOrigin: "0 0", transform: `scale(${sw / 393}, ${sh / 852})` }}>{children}</div>
          {/* Dynamic Island */}
          <div style={{ position: "absolute", left: sw / 2 - sw * 0.16, top: sh * 0.014, width: sw * 0.32, height: sw * 0.092, borderRadius: 999, background: "#000" }} />
          {/* glass */}
          <div style={{ position: "absolute", inset: 0, background: `linear-gradient(${115 + ry * 0.8}deg, rgba(255,255,255,${0.22 * glare}) 0%, rgba(255,255,255,0) 38%, rgba(255,255,255,0) 70%, rgba(255,255,255,${0.08 * glare}) 100%)`, mixBlendMode: "screen" }} />
        </div>
      </div>
    </div>
  );
};

/** Ground shadow for a floating object. */
export const Shadow: React.FC<{ w: number; o?: number; style?: React.CSSProperties }> = ({ w, o = 0.35, style }) => (
  <div style={{ position: "absolute", width: w, height: w * 0.16, borderRadius: "50%", background: `radial-gradient(50% 50% at 50% 50%, rgba(30,20,80,${o}), transparent 70%)`, ...style }} />
);

/* ------------------------------------------------------------------ QA */

/** In QA renders: logs every pair of visible text boxes that intersect (data-qa elements). */
export const OverlapQA: React.FC = () => {
  const f = useCurrentFrame();
  React.useLayoutEffect(() => {
    const els = Array.from(document.querySelectorAll<HTMLElement>("[data-qa]"));
    const vis = (el: HTMLElement) => {
      let o = 1;
      for (let n: HTMLElement | null = el; n; n = n.parentElement) o *= Number(getComputedStyle(n).opacity || 1);
      return o;
    };
    const boxes = els.map((el) => {
      // union of visible glyph boxes (spans), so masked-out letters do not count
      const spans = Array.from(el.querySelectorAll<HTMLElement>("span,div")).filter((s) => s.children.length === 0 && s.textContent?.trim());
      const rs = (spans.length ? spans : [el]).map((s) => ({ r: s.getBoundingClientRect(), o: vis(s) })).filter((x) => x.o > 0.15 && x.r.width > 2);
      return { id: el.dataset.qa!, rs: rs.map((x) => x.r) };
    }).filter((b) => b.rs.length);
    const hits: string[] = [];
    for (let i = 0; i < boxes.length; i++)
      for (let j = i + 1; j < boxes.length; j++)
        for (const a of boxes[i].rs) for (const b of boxes[j].rs)
          if (a.left < b.right - 2 && b.left < a.right - 2 && a.top < b.bottom - 2 && b.top < a.bottom - 2) hits.push(`${boxes[i].id}×${boxes[j].id}`);
    const off = boxes.filter((b) => b.rs.some((r) => r.left < 40 || r.right > 1880 || r.top < 24 || r.bottom > 1056)).map((b) => b.id);
    console.log(`QA ${f} ${JSON.stringify({ n: boxes.length, ids: boxes.map((b) => b.id), hits: Array.from(new Set(hits)), off })}`);
  });
  return null;
};
