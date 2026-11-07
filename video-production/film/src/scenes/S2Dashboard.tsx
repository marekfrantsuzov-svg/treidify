import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { Card, Footnote, Scrim, Screen, Stage, Words, box, frameOn } from "../components";
import { EASE, IN, OUT, ramp, track } from "../lib";

const A = 340;
const B = 740;

/** Card that floats into its exact place in the dashboard layout. */
const Float: React.FC<{ name: Parameters<typeof box>[0]; at: number; f: number; from?: number }> = ({ name, at, f, from = 420 }) => {
  const [x0, y0] = box(name);
  const p = ramp(f, at, at + 42, OUT);
  return (
    <div
      style={{
        position: "absolute",
        left: x0,
        top: y0,
        transformStyle: "preserve-3d",
        transform: `translate3d(0, ${(1 - p) * 50}px, ${(1 - p) * from}px) rotateX(${(1 - p) * -10}deg)`,
        opacity: ramp(f, at, at + 18),
        filter: `blur(${(1 - p) * 8}px)`,
      }}
    >
      <Card name={name} style={{ position: "relative" }} glow={name === "d-greeting" ? 0 : 0.6 * (1 - p) + 0.15} shadow={name !== "d-greeting"} radius={name === "d-greeting" ? 0 : 20} />
    </div>
  );
};

/** 340–740 · The real dashboard assembles, the camera tracks across the KPIs, "Everything in one place." */
export const S2Dashboard: React.FC = () => {
  const f = useCurrentFrame();
  if (f < A || f > B + 10) return null;

  // Camera path
  const kpiL = frameOn(600, 175, 1.5);
  const kpiR = frameOn(1460, 175, 1.5);
  const chart = frameOn(860, 420, 1.28);
  const dive = frameOn(118, 338, 6);
  const keysX: [number, number][] = [[A, 0], [450, 0], [500, kpiL.x], [575, kpiR.x], [625, chart.x], [668, 0], [700, 0], [740, dive.x]];
  const keysY: [number, number][] = [[A, 60], [450, 0], [500, kpiL.y], [575, kpiR.y], [625, chart.y], [668, 0], [700, 0], [740, dive.y]];
  const keysS: [number, number][] = [[A, 0.8], [450, 0.96], [500, 1.5], [575, 1.5], [625, 1.28], [668, 0.94], [700, 0.94], [740, 6]];
  const cam = {
    x: track(f, keysX),
    y: track(f, keysY),
    s: track(f, keysS),
    rx: track(f, [[A, 16], [450, 0], [600, 0], [668, 6], [700, 6], [730, 0]]),
    ry: track(f, [[450, 0], [500, -4], [575, 4], [625, 0]]),
  };

  const appear = ramp(f, A, A + 40, EASE);
  const textPhase = Math.min(ramp(f, 632, 656), 1 - ramp(f, 698, 712));
  const diveBlur = ramp(f, 712, 740, IN) * 14;
  const exit = ramp(f, 722, 742, IN);

  return (
    <AbsoluteFill style={{ opacity: appear * (1 - exit) }}>
      <AbsoluteFill style={{ filter: `blur(${textPhase * 9 + diveBlur}px) brightness(${1 - textPhase * 0.55})` }}>
        <Stage cam={cam} perspective={2000}>
          {/* base: the full real screen, out of focus — a depth plane for the layers above */}
          <Screen name="dashboard-blur" radius={26} style={{ boxShadow: "0 0 0 1px rgba(150,140,255,0.1), 0 80px 200px -40px rgba(0,0,0,0.9)" }} />
          <Float name="d-sidebar" at={352} f={f} from={260} />
          <Float name="d-greeting" at={368} f={f} from={260} />
          <Float name="d-health" at={382} f={f} />
          <Float name="d-balance" at={392} f={f} />
          <Float name="d-pnl" at={402} f={f} />
          <Float name="d-win" at={412} f={f} />
          <Float name="d-pf" at={422} f={f} />
          <Float name="d-chart" at={436} f={f} from={520} />
          <Float name="d-ai" at={452} f={f} from={520} />
        </Stage>
      </AbsoluteFill>

      <Scrim o={textPhase} />
      <AbsoluteFill style={{ alignItems: "center", justifyContent: "center" }}>
        <Words text="Everything in [one place.]" at={636} out={696} size={112} />
      </AbsoluteFill>
      <Footnote text="Treidify web app · labelled sample account" a={460} b={720} />
    </AbsoluteFill>
  );
};
