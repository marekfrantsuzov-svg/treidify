import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { Card, Footnote, Kicker, Scrim, Stage, Words } from "../components";
import { BRAND, EASE, IN, OUT, ramp, track } from "../lib";

const A = 2140;
const B = 2660;
const QUESTION = "How do I trade after a losing trade?";

const Sparkle: React.FC<{ s?: number }> = ({ s = 30 }) => (
  <svg width={s} height={s} viewBox="0 0 24 24" fill="none">
    <path d="M12 2.5l2.1 5.9 5.9 2.1-5.9 2.1L12 18.5l-2.1-5.9L4 10.5l5.9-2.1L12 2.5z" fill="url(#sg)" />
    <path d="M19 15l.9 2.3 2.1.7-2.1.8L19 21l-.9-2.2-2.1-.8 2.1-.7L19 15z" fill="#b9c4ff" />
    <defs>
      <linearGradient id="sg" x1="4" y1="2" x2="20" y2="19">
        <stop stopColor="#c9d2ff" />
        <stop offset="1" stopColor="#6d5cff" />
      </linearGradient>
    </defs>
  </svg>
);

/** 2140–2660 · AI Coach (illustrative preview): a question, a concise review; then the trading journal. */
export const S6Coach: React.FC = () => {
  const f = useCurrentFrame();
  if (f < A || f > B + 10) return null;

  const pillIn = ramp(f, 2150, 2196, OUT);
  const typed = Math.floor(Math.max(0, Math.min(QUESTION.length, (f - 2200) / 2.0)));
  const sent = ramp(f, 2286, 2320, EASE);
  const caretOn = Math.floor(f / 18) % 2 === 0 || (f > 2200 && f < 2276);

  const card = ramp(f, 2296, 2340, OUT);
  const reveal = track(f, [[2300, 0.12], [2316, 0.35], [2350, 0.585], [2384, 0.79], [2410, 1]], OUT);
  const flank = ramp(f, 2350, 2400, OUT);

  const coachOut = ramp(f, 2440, 2486, EASE);
  const jr = ramp(f, 2452, 2506, OUT);
  const textPhase = Math.min(ramp(f, 2556, 2574), 1 - ramp(f, 2626, 2646));
  const exit = ramp(f, 2618, 2662, IN);

  return (
    <AbsoluteFill style={{ opacity: ramp(f, A, A + 14) * (1 - exit * 0.95), filter: `blur(${exit * 8}px)` }}>
      <AbsoluteFill style={{ filter: `blur(${textPhase * 9}px) brightness(${1 - textPhase * 0.55})` }}>
        <Stage cam={{ s: track(f, [[A, 1.04], [2440, 1.0], [2660, 1.05]], EASE), rx: track(f, [[2440, 0], [2660, 3]]) }} perspective={2400}>
          {/* Coach */}
          <div style={{ position: "absolute", inset: 0, transformStyle: "preserve-3d", opacity: 1 - coachOut, transform: `translateZ(${-coachOut * 700}px) translateY(${-coachOut * 60}px)` }}>
            {/* question pill */}
            <div
              style={{
                position: "absolute",
                left: 960 - 470,
                top: track(f, [[2286, 470], [2320, 150]], EASE),
                width: 940,
                height: 86,
                borderRadius: 43,
                display: "flex",
                alignItems: "center",
                gap: 18,
                padding: "0 34px",
                background: "linear-gradient(180deg, rgba(40,36,70,0.85), rgba(20,18,34,0.9))",
                border: "1px solid rgba(160,150,255,0.28)",
                boxShadow: "0 40px 80px -30px rgba(0,0,0,0.9), inset 0 1px 0 rgba(255,255,255,0.1), 0 0 60px rgba(83,63,245,0.25)",
                opacity: pillIn,
                transform: `translateY(${(1 - pillIn) * 40}px) scale(${(0.94 + 0.06 * pillIn) * (1 - 0.1 * sent)})`,
                filter: `blur(${(1 - pillIn) * 10}px)`,
              }}
            >
              <Sparkle />
              <div style={{ fontFamily: "Inter", fontSize: 30, color: typed ? BRAND.text : "rgba(185,181,198,0.6)", flex: 1, whiteSpace: "nowrap" }}>
                {typed ? QUESTION.slice(0, typed) : "Ask your AI Coach…"}
                <span style={{ display: "inline-block", width: 2, height: 32, marginLeft: 3, background: "#b9c4ff", verticalAlign: "middle", opacity: caretOn && sent < 1 ? 1 : 0 }} />
              </div>
              <div style={{ width: 52, height: 52, borderRadius: 26, background: `rgba(83,63,245,${0.35 + 0.65 * ramp(f, 2276, 2290)})`, display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontSize: 26, fontFamily: "Inter", fontWeight: 700 }}>↑</div>
            </div>

            {/* flanking analytics */}
            <div style={{ position: "absolute", left: 960 - 340 - 330, top: 400, opacity: flank, transformStyle: "preserve-3d", transform: `translate3d(${(1 - flank) * -120}px,0,-220px) rotateY(18deg)` }}>
              <Card name="lc-session" w={310} style={{ position: "relative" }} />
            </div>
            <div style={{ position: "absolute", left: 960 + 340 + 20, top: 400, opacity: flank, transformStyle: "preserve-3d", transform: `translate3d(${(1 - flank) * 120}px,0,-220px) rotateY(-18deg)` }}>
              <Card name="lc-stops" w={310} style={{ position: "relative" }} />
            </div>

            {/* review card */}
            <div style={{ position: "absolute", left: 960 - 340, top: 250, opacity: card, transform: `translateY(${(1 - card) * 70}px)`, filter: `blur(${(1 - card) * 8}px)` }}>
              <div style={{ clipPath: `inset(0 0 ${(1 - reveal) * 100}% 0 round 24px)` }}>
                <Card name="lc-card" w={680} radius={24} glow={0.5} style={{ position: "relative" }} />
              </div>
            </div>
          </div>

          {/* Journal */}
          {f > 2448 && (
            <div style={{ position: "absolute", inset: 0, transformStyle: "preserve-3d", opacity: jr }}>
              <div style={{ position: "absolute", left: 960 - 760, top: 120, transformStyle: "preserve-3d", transform: `translate3d(0, ${(1 - jr) * 80}px, -520px) rotateX(10deg)`, filter: "brightness(0.55) blur(2px)" }}>
                <Card name="j-cal" w={1520} style={{ position: "relative" }} />
              </div>
              <div style={{ position: "absolute", left: 230, top: 250, transform: `translate3d(${(1 - jr) * -160}px, 0, ${(1 - jr) * 200}px)` }}>
                <Card name="j-perf" w={600} glow={0.35} style={{ position: "relative" }} />
              </div>
              <div style={{ position: "absolute", left: 870, top: 250, transform: `translate3d(${(1 - ramp(f, 2470, 2520, OUT)) * 180}px, 0, 0)`, opacity: ramp(f, 2470, 2490) }}>
                <Card name="j-symbol" w={820} style={{ position: "relative" }} />
              </div>
              <div style={{ position: "absolute", left: 870, top: 790 - 0, transform: `translate3d(${(1 - ramp(f, 2490, 2540, OUT)) * 180}px, 0, 0)`, opacity: ramp(f, 2490, 2510) }}>
                <Card name="h-month" w={820} style={{ position: "relative" }} />
              </div>
            </div>
          )}
        </Stage>
      </AbsoluteFill>

      <div style={{ position: "absolute", top: 80, left: 0, right: 0, display: "flex", justifyContent: "center" }}>
        <Kicker text="AI Coach · illustrative preview" at={2156} out={2436} />
      </div>
      <div style={{ position: "absolute", top: 120, left: 230, display: "flex" }}>
        <Kicker text="Trading journal" at={2470} out={2550} style={{ textAlign: "left" }} />
      </div>

      <Scrim o={textPhase} />
      <AbsoluteFill style={{ alignItems: "center", justifyContent: "center" }}>
        <Words text="Learn from [every decision.]" at={2560} out={2624} size={112} />
      </AbsoluteFill>

      <Footnote text="AI Coach shown as an illustrative preview · journal from the labelled sample account" a={2160} b={2640} />
    </AbsoluteFill>
  );
};
