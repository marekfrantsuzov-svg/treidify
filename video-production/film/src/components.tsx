import React from "react";
import { AbsoluteFill, Img, random, staticFile, useCurrentFrame } from "remotion";
import crops from "../public/crops.json";
import { BRAND, DISPLAY, EASE, OUT, clamp01, ramp } from "./lib";

type CropName = keyof typeof crops;
export const size = (name: CropName) => ({ w: crops[name].w, h: crops[name].h });
export const box = (name: CropName) => crops[name].box as [number, number, number, number];

/* ------------------------------------------------------------------ backdrop */

/** Persistent deep charcoal/navy stage with slow, controlled blue light. */
export const Backdrop: React.FC<{ intensity?: number }> = ({ intensity = 1 }) => {
  const f = useCurrentFrame();
  const a = f / 60;
  const x1 = 30 + 12 * Math.sin(a * 0.22);
  const y1 = 35 + 10 * Math.cos(a * 0.17);
  const x2 = 72 + 10 * Math.cos(a * 0.19);
  const y2 = 70 + 8 * Math.sin(a * 0.25);
  return (
    <AbsoluteFill style={{ background: `linear-gradient(180deg, #07070d 0%, ${BRAND.navy} 55%, #05050a 100%)` }}>
      <AbsoluteFill
        style={{
          opacity: intensity,
          background: `radial-gradient(60% 55% at ${x1}% ${y1}%, rgba(83,63,245,0.20), transparent 70%),
                       radial-gradient(50% 50% at ${x2}% ${y2}%, rgba(64,96,255,0.13), transparent 70%),
                       radial-gradient(90% 60% at 50% 110%, rgba(40,52,140,0.25), transparent 70%)`,
        }}
      />
    </AbsoluteFill>
  );
};

/** Film grain + vignette, on top of everything. Deterministic per frame. */
export const Finish: React.FC = () => {
  const f = useCurrentFrame();
  const seed = Math.floor(random(`g${f}`) * 1000);
  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      <AbsoluteFill style={{ background: "radial-gradient(120% 90% at 50% 50%, transparent 55%, rgba(0,0,0,0.55) 100%)" }} />
      <svg width="100%" height="100%" style={{ position: "absolute", inset: 0, opacity: 0.07, mixBlendMode: "overlay" }}>
        <filter id={`n${f}`}>
          <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed={seed} stitchTiles="stitch" />
          <feColorMatrix type="saturate" values="0" />
        </filter>
        <rect width="100%" height="100%" filter={`url(#n${f})`} />
      </svg>
    </AbsoluteFill>
  );
};

/** A soft diagonal beam of blue light passing across the frame between frames a and b. */
export const LightSweep: React.FC<{ a: number; b: number; angle?: number; strength?: number; width?: number }> = ({ a, b, angle = 18, strength = 0.55, width = 26 }) => {
  const f = useCurrentFrame();
  if (f < a - 1 || f > b + 1) return null;
  const p = ramp(f, a, b, EASE);
  const x = -40 + p * 180;
  const o = Math.sin(Math.PI * p) * strength;
  return (
    <AbsoluteFill style={{ pointerEvents: "none", mixBlendMode: "screen", opacity: o }}>
      <AbsoluteFill
        style={{
          background: `linear-gradient(${90 + angle}deg, transparent ${x - width}%, rgba(90,110,255,0.0) ${x - width * 0.6}%, rgba(120,140,255,0.55) ${x}%, rgba(90,110,255,0.0) ${x + width * 0.6}%, transparent ${x + width}%)`,
          filter: "blur(30px)",
        }}
      />
      <AbsoluteFill
        style={{
          background: `linear-gradient(${90 + angle}deg, transparent ${x - 1.2}%, rgba(210,220,255,0.55) ${x}%, transparent ${x + 1.2}%)`,
          filter: "blur(6px)",
        }}
      />
    </AbsoluteFill>
  );
};

/** Vertical light slats that open across the frame (inspired by the reference's blinds reveal), blue only. */
export const Slats: React.FC<{ a: number; b: number; count?: number; strength?: number }> = ({ a, b, count = 9, strength = 0.7 }) => {
  const f = useCurrentFrame();
  if (f < a || f > b) return null;
  const p = (f - a) / (b - a);
  return (
    <AbsoluteFill style={{ pointerEvents: "none", mixBlendMode: "screen" }}>
      {Array.from({ length: count }).map((_, i) => {
        const d = Math.abs(i - (count - 1) / 2) / ((count - 1) / 2);
        const local = clamp01((p - d * 0.25) / 0.6);
        const o = Math.sin(Math.PI * local) * strength * (1 - d * 0.5);
        const w = 1920 / count;
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: i * w,
              top: 0,
              width: w * 0.92,
              height: 1080,
              opacity: o,
              background: `linear-gradient(180deg, transparent 0%, rgba(83,63,245,0.35) 30%, rgba(110,140,255,0.55) 50%, rgba(83,63,245,0.35) 70%, transparent 100%)`,
              filter: "blur(18px)",
              transform: `scaleY(${0.6 + 0.4 * local})`,
            }}
          />
        );
      })}
    </AbsoluteFill>
  );
};

/* ------------------------------------------------------------------ type */

/**
 * Kinetic headline: each word rises out of a soft blur, staggered. Exit lifts and blurs the line out.
 * Words wrapped in [brackets] get the Treidify blue gradient.
 */
export const Words: React.FC<{
  text: string;
  at: number;
  out?: number;
  size?: number;
  weight?: number;
  stagger?: number;
  align?: "center" | "left";
  style?: React.CSSProperties;
  color?: string;
  tracking?: string;
}> = ({ text, at, out = 1e9, size = 96, weight = 600, stagger = 5, align = "center", style, color = BRAND.text, tracking = "-0.04em" }) => {
  const f = useCurrentFrame();
  if (f < at - 2 || f > out + 40) return null;
  const words = text.split(" ");
  const exit = ramp(f, out, out + 22, EASE);
  return (
    <div
      style={{
        fontFamily: DISPLAY,
        fontSize: size,
        fontWeight: weight,
        letterSpacing: tracking,
        lineHeight: 1.04,
        color,
        textAlign: align,
        display: "flex",
        flexWrap: "wrap",
        justifyContent: align === "center" ? "center" : "flex-start",
        columnGap: size * 0.26,
        opacity: 1 - exit,
        filter: `blur(${exit * 14}px)`,
        transform: `translateY(${-exit * 26}px)`,
        ...style,
      }}
    >
      {words.map((w, i) => {
        const accent = w.startsWith("[");
        const clean = w.replace(/[[\]]/g, "");
        const p = ramp(f, at + i * stagger, at + i * stagger + 26, OUT);
        return (
          <span
            key={i}
            style={{
              display: "inline-block",
              opacity: p,
              filter: `blur(${(1 - p) * 16}px)`,
              transform: `translateY(${(1 - p) * size * 0.42}px) scale(${0.96 + 0.04 * p})`,
              ...(accent
                ? { backgroundImage: "linear-gradient(100deg, #c9d2ff 0%, #8b7bff 55%, #5a6bff 100%)", WebkitBackgroundClip: "text", color: "transparent", paddingRight: "0.04em" }
                : {}),
            }}
          >
            {clean}
          </span>
        );
      })}
    </div>
  );
};

/** Small caption / kicker. */
export const Kicker: React.FC<{ text: string; at: number; out?: number; style?: React.CSSProperties }> = ({ text, at, out = 1e9, style }) => {
  const f = useCurrentFrame();
  const o = Math.min(ramp(f, at, at + 20, OUT), 1 - ramp(f, out, out + 16));
  if (o <= 0) return null;
  return (
    <div style={{ fontFamily: DISPLAY, fontSize: 20, fontWeight: 500, letterSpacing: "0.22em", textTransform: "uppercase", color: "rgba(185,196,255,0.85)", opacity: o, transform: `translateY(${(1 - o) * 10}px)`, ...style }}>
      {text}
    </div>
  );
};

/** Honest-data footnote in the corner. */
export const Footnote: React.FC<{ text: string; a: number; b: number }> = ({ text, a, b }) => {
  const f = useCurrentFrame();
  const o = Math.min(ramp(f, a, a + 20), 1 - ramp(f, b - 20, b));
  if (o <= 0) return null;
  return (
    <div style={{ position: "absolute", right: 44, bottom: 30, fontFamily: "Inter", fontSize: 14, color: "rgba(220,222,240,0.55)", letterSpacing: "0.01em", opacity: o }}>
      {text}
    </div>
  );
};

/* ------------------------------------------------------------------ plates */

/** A real interface card cut from the captures, rendered as a floating glass layer. */
export const Card: React.FC<{
  name: CropName;
  style?: React.CSSProperties;
  radius?: number;
  glow?: number;
  shadow?: boolean;
  w?: number;
}> = ({ name, style, radius = 20, glow = 0, shadow = true, w }) => {
  const s = size(name);
  const width = w ?? s.w;
  const height = (s.h / s.w) * width;
  return (
    <div
      style={{
        position: "absolute",
        width,
        height,
        borderRadius: radius,
        overflow: "hidden",
        boxShadow: shadow
          ? `0 40px 90px -30px rgba(0,0,0,0.85), 0 0 0 1px rgba(160,170,255,0.10), 0 0 ${60 * glow}px ${8 * glow}px rgba(83,63,245,${0.35 * glow})`
          : undefined,
        ...style,
      }}
    >
      <Img src={staticFile(`ui/${name}.png`)} style={{ width: "100%", height: "100%", display: "block" }} />
      <div style={{ position: "absolute", inset: 0, borderRadius: radius, boxShadow: "inset 0 1px 0 rgba(255,255,255,0.08)" }} />
    </div>
  );
};

/** A full 1920x1080 app screen. */
export const Screen: React.FC<{ name: string; style?: React.CSSProperties; radius?: number }> = ({ name, style, radius = 0 }) => (
  <div style={{ position: "absolute", left: 0, top: 0, width: 1920, height: 1080, borderRadius: radius, overflow: "hidden", ...style }}>
    <Img src={staticFile(`ui/full-${name}.png`)} style={{ width: 1920, height: 1080, display: "block" }} />
  </div>
);

/** Perspective stage. Children are positioned in a 1920x1080 world that the camera moves around. */
export const Stage: React.FC<{
  children: React.ReactNode;
  cam: { x?: number; y?: number; z?: number; s?: number; rx?: number; ry?: number; rz?: number };
  perspective?: number;
  style?: React.CSSProperties;
}> = ({ children, cam, perspective = 2200, style }) => {
  const { x = 0, y = 0, z = 0, s = 1, rx = 0, ry = 0, rz = 0 } = cam;
  return (
    <AbsoluteFill style={{ perspective, perspectiveOrigin: "50% 50%", overflow: "hidden", ...style }}>
      <div
        style={{
          position: "absolute",
          inset: 0,
          transformStyle: "preserve-3d",
          transformOrigin: "50% 50%",
          transform: `translate3d(${-x}px, ${-y}px, ${z}px) scale(${s}) rotateX(${rx}deg) rotateY(${ry}deg) rotateZ(${rz}deg)`,
        }}
      >
        {children}
      </div>
    </AbsoluteFill>
  );
};

/** Camera that frames a region (cx, cy) of the 1920x1080 world at zoom s. */
export const frameOn = (cx: number, cy: number, s: number) => ({ x: (cx - 960) * s, y: (cy - 540) * s, s });

/** Dark scrim so type stays readable over interface. */
export const Scrim: React.FC<{ o: number; shape?: "center" | "bottom" | "top" }> = ({ o, shape = "center" }) => {
  if (o <= 0) return null;
  const bg =
    shape === "center"
      ? "radial-gradient(60% 50% at 50% 50%, rgba(5,5,12,0.82), rgba(5,5,12,0.45) 70%, rgba(5,5,12,0.2))"
      : shape === "bottom"
        ? "linear-gradient(0deg, rgba(5,5,12,0.92) 0%, rgba(5,5,12,0.6) 30%, transparent 55%)"
        : "linear-gradient(180deg, rgba(5,5,12,0.92) 0%, rgba(5,5,12,0.6) 30%, transparent 55%)";
  return <AbsoluteFill style={{ background: bg, opacity: o, pointerEvents: "none" }} />;
};

/** Small glass label chip, Treidify style. */
export const Chip: React.FC<{ children: React.ReactNode; on?: number; style?: React.CSSProperties; dot?: string }> = ({ children, on = 1, style, dot = BRAND.blueLight }) => (
  <div
    style={{
      display: "inline-flex",
      alignItems: "center",
      gap: 10,
      padding: "10px 18px",
      borderRadius: 999,
      fontFamily: "Inter",
      fontWeight: 600,
      fontSize: 20,
      color: `rgba(245,244,248,${0.45 + 0.55 * on})`,
      background: `rgba(${20 + 40 * on},${18 + 30 * on},${40 + 80 * on},0.72)`,
      border: `1px solid rgba(150,140,255,${0.12 + 0.4 * on})`,
      boxShadow: `0 10px 30px -10px rgba(0,0,0,0.8), 0 0 ${24 * on}px rgba(83,63,245,${0.45 * on})`,
      backdropFilter: "blur(12px)",
      ...style,
    }}
  >
    <span style={{ width: 9, height: 9, borderRadius: 9, background: dot, opacity: 0.4 + 0.6 * on, boxShadow: `0 0 ${10 * on}px ${dot}` }} />
    {children}
  </div>
);

/** The official Treidify T mark (supplied artwork, unmodified) with the wordmark set in Geist like the app. */
export const Lockup: React.FC<{ mark?: number; word?: number; wordReveal?: number; markReveal?: number; light?: number }> = ({ mark = 128, word = 104, wordReveal = 1, markReveal = 1, light = -1 }) => {
  const letters = "Treidify".split("");
  return (
    <div style={{ display: "flex", alignItems: "center", gap: mark * 0.22 }}>
      <div style={{ position: "relative", width: mark, height: mark }}>
        <Img
          src={staticFile("brand/treidify-t-512.png")}
          style={{
            width: mark,
            height: mark,
            opacity: markReveal,
            filter: `blur(${(1 - markReveal) * 18}px) drop-shadow(0 0 ${40 * markReveal}px rgba(83,63,245,0.45))`,
            transform: `scale(${0.85 + 0.15 * markReveal})`,
            clipPath: `inset(${(1 - markReveal) * 100}% 0 0 0)`,
          }}
        />
        {light >= 0 && light <= 1 && (
          <div
            style={{
              position: "absolute",
              inset: 0,
              WebkitMaskImage: `url(${staticFile("brand/treidify-t-512.png")})`,
              WebkitMaskSize: "100% 100%",
              background: `linear-gradient(115deg, transparent ${light * 160 - 40}%, rgba(255,255,255,0.95) ${light * 160 - 25}%, transparent ${light * 160 - 10}%)`,
              mixBlendMode: "screen",
            }}
          />
        )}
      </div>
      <div style={{ fontFamily: DISPLAY, fontWeight: 700, fontSize: word, letterSpacing: "-0.035em", color: BRAND.text, display: "flex", position: "relative" }}>
        {letters.map((l, i) => {
          const p = clamp01(wordReveal * (letters.length + 3) - i);
          return (
            <span key={i} style={{ display: "inline-block", opacity: p, filter: `blur(${(1 - p) * 12}px)`, transform: `translateX(${(1 - p) * -18}px)` }}>
              {l}
            </span>
          );
        })}
        {light >= 0 && light <= 1 && (
          <span
            style={{
              position: "absolute",
              inset: 0,
              backgroundImage: `linear-gradient(115deg, transparent ${light * 160 - 40}%, rgba(255,255,255,0.9) ${light * 160 - 25}%, transparent ${light * 160 - 10}%)`,
              WebkitBackgroundClip: "text",
              color: "transparent",
            }}
          >
            Treidify
          </span>
        )}
      </div>
    </div>
  );
};
