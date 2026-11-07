import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { Card, Footnote, Kicker, Scrim, Stage, Words, size } from "../components";
import { EASE, IN, OUT, ramp, track } from "../lib";

const A = 1660;
const B = 2180;

const Slide: React.FC<{ at: number; f: number; x: number; y: number; dx?: number; dy?: number; dz?: number; children: React.ReactNode }> = ({ at, f, x, y, dx = 0, dy = 60, dz = 200, children }) => {
  const p = ramp(f, at, at + 44, OUT);
  return (
    <div style={{ position: "absolute", left: x, top: y, opacity: ramp(f, at, at + 20), transformStyle: "preserve-3d", transform: `translate3d(${(1 - p) * dx}px, ${(1 - p) * dy}px, ${(1 - p) * dz}px)`, filter: `blur(${(1 - p) * 8}px)` }}>
      {children}
    </div>
  );
};

/** 1660–2180 · The chart becomes the Gold card on the Macro Desk; DXY and Silver join; then the event calendar. */
export const S5Macro: React.FC = () => {
  const f = useCurrentFrame();
  if (f < A || f > B + 10) return null;

  // Desk layout (world px)
  const L = 150;
  const row1 = 300;
  const row2 = 548;
  const gW = size("m-gold").w;

  // morph: Gold card starts as a large plate (where the chart was) and settles into its slot
  const m = ramp(f, 1664, 1728, EASE);
  const gx = track(f, [[1664, 960 - gW * 1.7], [1728, L]], EASE);
  const gy = track(f, [[1664, 540 - 225 * 1.7], [1728, row1]], EASE);
  const gs = track(f, [[1664, 3.4], [1728, 1]], EASE);

  const deskOut = ramp(f, 1930, 1975, EASE);
  const textPhase = Math.min(ramp(f, 1848, 1866), 1 - ramp(f, 1916, 1934));
  const cal = ramp(f, 1940, 1996, OUT);
  const exit = ramp(f, 2140, 2182, IN);

  const camS = track(f, [[1700, 1.0], [1930, 1.07]], EASE);
  const camRy = track(f, [[1700, 3], [1930, -3]], EASE);

  // event list highlight (lm-events rows sit at ~13–60% of the card height)
  const rowY = track(f, [[2010, 0], [2040, 1], [2070, 2], [2100, 3]], OUT);

  return (
    <AbsoluteFill style={{ opacity: 1 - exit, filter: `blur(${exit * 10}px)` }}>
      <AbsoluteFill style={{ filter: `blur(${textPhase * 9}px) brightness(${1 - textPhase * 0.55})` }}>
        <Stage cam={{ s: camS, ry: camRy }} perspective={2400}>
          <div style={{ position: "absolute", inset: 0, opacity: 1 - deskOut, transform: `translateZ(${-deskOut * 600}px)`, transformStyle: "preserve-3d" }}>
            <Slide at={1700} f={f} x={L} y={200} dy={30} dz={0}>
              <Card name="m-head" w={924} shadow={false} radius={0} style={{ position: "relative" }} />
            </Slide>
            <div style={{ position: "absolute", left: gx, top: gy, transformOrigin: "0 0", transform: `scale(${gs})`, opacity: ramp(f, 1662, 1680) }}>
              <Card name="m-gold" style={{ position: "relative" }} glow={0.8 * (1 - m) + 0.2} />
            </div>
            <Slide at={1734} f={f} x={L + gW + 18} y={row1} dx={260} dy={0}>
              <Card name="m-dxy" style={{ position: "relative" }} />
            </Slide>
            <Slide at={1750} f={f} x={L + 2 * (gW + 18)} y={row1} dx={260} dy={0}>
              <Card name="m-silver" style={{ position: "relative" }} />
            </Slide>
            <Slide at={1780} f={f} x={L} y={row2}>
              <Card name="m-rs" style={{ position: "relative" }} />
            </Slide>
            <Slide at={1796} f={f} x={L + 667 + 18} y={row2}>
              <Card name="m-dxygold" style={{ position: "relative" }} />
            </Slide>
          </div>

          {/* Economic calendar */}
          {f > 1935 && (
            <div style={{ position: "absolute", inset: 0, transformStyle: "preserve-3d", opacity: cal }}>
              <div style={{ position: "absolute", left: 960 - 330 - 520, top: 300, transformStyle: "preserve-3d", transform: `translate3d(${(1 - cal) * -200}px,0,-260px) rotateY(16deg)` }}>
                <Card name="lm-markets" w={460} style={{ position: "relative" }} />
              </div>
              <div style={{ position: "absolute", left: 960 + 330 + 40, top: 300, transformStyle: "preserve-3d", transform: `translate3d(${(1 - cal) * 200}px,0,-260px) rotateY(-16deg)` }}>
                <Card name="lm-sessions" w={560} style={{ position: "relative" }} />
              </div>
              <div style={{ position: "absolute", left: 960 - 330, top: 240, transform: `translateY(${(1 - cal) * 80}px) translateZ(${(1 - cal) * 300}px)`, transformStyle: "preserve-3d" }}>
                <div style={{ position: "relative" }}>
                  <Card name="lm-events" w={640} style={{ position: "relative" }} glow={0.55} radius={24} />
                  {f > 2004 && f < 2128 && (
                    <div
                      style={{
                        position: "absolute",
                        left: 26,
                        right: 26,
                        top: 105 + rowY * 56,
                        height: 50,
                        borderRadius: 14,
                        background: "linear-gradient(90deg, rgba(110,130,255,0.0), rgba(110,130,255,0.22), rgba(110,130,255,0.0))",
                        boxShadow: "0 0 30px rgba(110,130,255,0.35)",
                        opacity: Math.min(ramp(f, 2004, 2014), 1 - ramp(f, 2112, 2128)),
                        mixBlendMode: "screen",
                      }}
                    />
                  )}
                </div>
              </div>
            </div>
          )}
        </Stage>
      </AbsoluteFill>

      <Scrim o={textPhase} />
      <AbsoluteFill style={{ alignItems: "center", justifyContent: "center" }}>
        <Words text="Stay ahead of [what moves markets.]" at={1852} out={1914} size={104} stagger={5} />
      </AbsoluteFill>
      <div style={{ position: "absolute", top: 140, left: 0, right: 0, display: "flex", justifyContent: "center" }}>
        <Kicker text="Economic calendar · event risk for gold" at={1960} out={2128} />
      </div>

      <Footnote text="Macro Desk on sample bars · calendar events are labelled examples" a={1700} b={2160} />
    </AbsoluteFill>
  );
};
