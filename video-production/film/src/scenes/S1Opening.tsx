import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { LightSweep, Lockup, Screen, Slats, Stage, Words } from "../components";
import { EASE, IN, OUT, ramp, track } from "../lib";

/** 0–380 · Black → blue light → logo reveal → "Meet Treidify." → "Your trading workspace. Reimagined." → the app emerges. */
export const S1Opening: React.FC = () => {
  const f = useCurrentFrame();
  if (f > 400) return null;

  // Lockup: reveal 40-130, hold, then lift away as the headline arrives.
  const markReveal = ramp(f, 40, 95, OUT);
  const wordReveal = ramp(f, 78, 132, OUT);
  const lift = ramp(f, 150, 186, EASE);
  const lockupOut = ramp(f, 228, 250, IN);
  const lockY = track(f, [[150, 0], [186, -230]]);
  const lockS = track(f, [[150, 1], [186, 0.52]]);
  const drift = 1 + f * 0.0004; // slow push-in on the whole opening

  // The app rising out of the darkness behind the type (250-400), handing off to the dashboard scene.
  const appO = track(f, [[250, 0], [330, 0.5], [380, 1]], EASE);
  const appZ = track(f, [[250, -1800], [400, -260]], EASE);
  const appRx = track(f, [[250, 34], [400, 16]], EASE);
  const appBlur = track(f, [[250, 14], [370, 3]], EASE);

  return (
    <AbsoluteFill>
      {/* light that "finds" the brand */}
      <LightSweep a={8} b={150} angle={14} strength={0.65} width={30} />
      <Slats a={30} b={130} strength={0.55} />

      {/* app plate emerging (behind type) */}
      {f > 245 && (
        <Stage cam={{ s: 1 }} perspective={1800}>
          <div
            style={{
              position: "absolute",
              inset: 0,
              transformStyle: "preserve-3d",
              transform: `translate3d(0, 80px, ${appZ}px) rotateX(${appRx}deg)`,
              opacity: appO,
              filter: `blur(${appBlur}px) brightness(${0.55 + 0.25 * appO})`,
            }}
          >
            <Screen name="dashboard" radius={28} style={{ boxShadow: "0 80px 200px -40px rgba(0,0,0,0.9), 0 0 0 1px rgba(150,140,255,0.12), 0 0 160px rgba(83,63,245,0.25)" }} />
          </div>
        </Stage>
      )}

      <AbsoluteFill style={{ transform: `scale(${drift})` }}>
        {/* Lockup */}
        <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", opacity: 1 - lockupOut, filter: `blur(${lockupOut * 10}px)` }}>
          <div style={{ transform: `translateY(${lockY}px) scale(${lockS})` }}>
            <Lockup mark={136} word={112} markReveal={markReveal} wordReveal={wordReveal} light={track(f, [[100, 0], [150, 1]], EASE)} />
          </div>
        </AbsoluteFill>

        {/* Meet Treidify. */}
        <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", opacity: lift > 0 ? 1 : 0 }}>
          <Words text="Meet [Treidify.]" at={168} out={226} size={128} stagger={7} />
        </AbsoluteFill>

        {/* Your trading workspace. Reimagined. */}
        <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 10 }}>
          <Words text="Your trading workspace." at={240} out={338} size={104} stagger={5} />
          <Words text="[Reimagined.]" at={270} out={342} size={104} />
        </AbsoluteFill>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
