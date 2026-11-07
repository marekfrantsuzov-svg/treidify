import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { Footnote, LightSweep, Screen, Words } from "../components";
import { EASE, IN, OUT, clamp01, ramp, track } from "../lib";

const A = 2620;
const B = 3020;

type P = { name: string; x: number; y: number; z: number; ry: number; rx?: number };
// The other four spaces float around the dashboard, which waits at the back and becomes the hero.
const PANELS: P[] = [
  { name: "journal", x: -560, y: -250, z: -150, ry: 20 },
  { name: "health", x: 580, y: -240, z: -420, ry: -20 },
  { name: "markets-fib", x: -600, y: 250, z: -700, ry: 18 },
  { name: "macro", x: 600, y: 260, z: -980, ry: -18 },
];
const SCALE = 0.42;

/** 2620–3020 · Camera travels through floating Treidify spaces, which merge into one complete dashboard. */
export const S7Ecosystem: React.FC = () => {
  const f = useCurrentFrame();
  if (f < A || f > B + 10) return null;

  const flyZ = track(f, [[2626, -500], [2866, 880]], EASE);
  const merge = ramp(f, 2850, 2940, EASE);
  const textIn = ramp(f, 2900, 2930);
  const exit = ramp(f, 2990, 3022, IN);

  // Dashboard: from far back centre to the hero pose (tilted, large).
  const dZ = track(f, [[2626, -1700], [2850, -900], [2940, 0]], EASE);
  const dS = track(f, [[2850, SCALE], [2940, 0.74]], EASE);
  const dRx = track(f, [[2850, 0], [2940, 16]], EASE);
  const dY = track(f, [[2850, 0], [2940, 150]], EASE);
  const dRy = track(f, [[2626, -6], [2850, 4], [2940, 0]], EASE);

  return (
    <AbsoluteFill style={{ opacity: ramp(f, A, A + 18) * (1 - exit), filter: `blur(${exit * 6}px)` }}>
      <AbsoluteFill style={{ perspective: 1600, perspectiveOrigin: "50% 46%" }}>
        <div style={{ position: "absolute", inset: 0, transformStyle: "preserve-3d" }}>
          {/* dashboard (hero) */}
          <div
            style={{
              position: "absolute",
              left: 0,
              top: 0,
              width: 1920,
              height: 1080,
              transformStyle: "preserve-3d",
              transform: `translate3d(0, ${dY}px, ${dZ}px) rotateX(${dRx}deg) rotateY(${dRy}deg) scale(${dS})`,
              WebkitMaskImage: `linear-gradient(180deg, black 0%, black ${100 - 38 * merge}%, transparent ${100 - 2 * merge}%)`,
            }}
          >
            <Screen name="dashboard" radius={28} style={{ boxShadow: `0 0 0 2px rgba(150,140,255,0.25), 0 0 ${120 + 120 * merge}px rgba(83,63,245,${0.35 + 0.2 * merge}), 0 120px 200px -40px rgba(0,0,0,0.9)` }} />
          </div>
          {PANELS.map((p, i) => {
            const z = p.z + flyZ;
            const near = clamp01((z - 650) / 300); // fade before passing the camera
            const conv = merge;
            const x = p.x * (1 - conv);
            const y = p.y * (1 - conv) + 150 * conv;
            const zz = z * (1 - conv) + -200 * conv;
            const o = ramp(f, A + 6 + i * 10, A + 40 + i * 10, OUT) * (1 - near) * (1 - conv);
            if (o <= 0.002) return null;
            return (
              <div
                key={p.name}
                style={{
                  position: "absolute",
                  left: 0,
                  top: 0,
                  width: 1920,
                  height: 1080,
                  opacity: o,
                  transformStyle: "preserve-3d",
                  transform: `translate3d(${x}px, ${y}px, ${zz}px) rotateY(${p.ry * (1 - conv)}deg) scale(${SCALE})`,
                  filter: `blur(${Math.max(0, (z - 400) / 60) + conv * 6}px)`,
                }}
              >
                <Screen name={p.name} radius={30} style={{ boxShadow: "0 0 0 2px rgba(150,140,255,0.22), 0 0 140px rgba(83,63,245,0.35), 0 120px 200px -40px rgba(0,0,0,0.9)" }} />
              </div>
            );
          })}
        </div>
      </AbsoluteFill>
      <LightSweep a={2690} b={2860} angle={22} strength={0.4} />

      <div style={{ position: "absolute", top: 120, left: 0, right: 0, display: "flex", justifyContent: "center", opacity: textIn }}>
        <Words text="One platform. [A clearer perspective.]" at={2904} out={2988} size={92} stagger={5} />
      </div>
      <Footnote text="Real Treidify screens · labelled sample data" a={2640} b={3000} />
      {/* soften the bottom of the hero plate */}
      <AbsoluteFill style={{ background: "linear-gradient(0deg, rgba(5,5,12,0.9) 0%, transparent 30%)", opacity: merge, pointerEvents: "none" }} />
    </AbsoluteFill>
  );
};
