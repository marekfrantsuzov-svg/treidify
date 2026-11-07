import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { LightSweep, Lockup, Words } from "../components";
import { BRAND, DISPLAY, EASE, OUT, ramp, track } from "../lib";

/** 2980–3360 · Clean dark field, logo, "Trade with clarity.", Treidify.com, light pass, fade to black. */
export const S8Finale: React.FC = () => {
  const f = useCurrentFrame();
  if (f < 2980) return null;
  const mark = ramp(f, 2996, 3040, OUT);
  const word = ramp(f, 3010, 3056, OUT);
  const push = track(f, [[2996, 0.94], [3360, 1.03]], EASE);
  const url = ramp(f, 3150, 3184, OUT);
  const black = ramp(f, 3286, 3352, EASE);
  const glow = ramp(f, 3000, 3100);
  return (
    <AbsoluteFill>
      <AbsoluteFill style={{ background: `radial-gradient(40% 35% at 50% 46%, rgba(83,63,245,${0.22 * glow}), transparent 70%)` }} />
      <LightSweep a={3056} b={3150} angle={16} strength={0.35} width={20} />
      <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", transform: `scale(${push})` }}>
        <div style={{ transform: "translateY(-70px)" }}>
          <Lockup mark={150} word={124} markReveal={mark} wordReveal={word} light={track(f, [[3064, 0], [3132, 1]], EASE)} />
        </div>
        <div style={{ position: "absolute", top: 600 }}>
          <Words text="Trade with [clarity.]" at={3084} size={64} weight={500} tracking="-0.025em" color={BRAND.text} />
        </div>
        <div
          style={{
            position: "absolute",
            top: 700,
            fontFamily: DISPLAY,
            fontSize: 30,
            fontWeight: 500,
            letterSpacing: "0.24em",
            color: "rgba(201,210,255,0.9)",
            opacity: url,
            filter: `blur(${(1 - url) * 8}px)`,
            transform: `translateY(${(1 - url) * 14}px)`,
          }}
        >
          TREIDIFY.COM
        </div>
      </AbsoluteFill>
      <AbsoluteFill style={{ background: "#000", opacity: black }} />
    </AbsoluteFill>
  );
};
