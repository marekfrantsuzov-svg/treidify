import { Easing, interpolate } from "remotion";

export const EASE = Easing.bezier(0.65, 0, 0.35, 1); // cinematic in-out
export const OUT = Easing.bezier(0.16, 1, 0.3, 1); // expo-like out, for arrivals
export const IN = Easing.bezier(0.7, 0, 0.84, 0); // for exits
export const SOFT = Easing.bezier(0.45, 0, 0.55, 1);

export type Key = [number, number];

/** Piecewise keyframe track with per-segment easing. Holds the first/last value outside the range. */
export function track(f: number, keys: Key[], ease: (t: number) => number = EASE): number {
  if (f <= keys[0][0]) return keys[0][1];
  for (let i = 0; i < keys.length - 1; i++) {
    const [f0, v0] = keys[i];
    const [f1, v1] = keys[i + 1];
    if (f <= f1) return interpolate(f, [f0, f1], [v0, v1], { easing: ease, extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  }
  return keys[keys.length - 1][1];
}

/** 0→1 over [a,b] with easing, clamped. */
export const ramp = (f: number, a: number, b: number, ease: (t: number) => number = EASE) =>
  interpolate(f, [a, b], [0, 1], { easing: ease, extrapolateLeft: "clamp", extrapolateRight: "clamp" });

/** In over [a, a+inLen], out over [b, b+outLen]. */
export const win = (f: number, a: number, inLen: number, b: number, outLen: number) =>
  Math.min(ramp(f, a, a + inLen, OUT), 1 - ramp(f, b, b + outLen, IN));

/** Critically damped spring-ish arrival (no overshoot) or with slight overshoot when bounce>0. */
export function arrive(f: number, start: number, dur = 40, bounce = 0.06) {
  const t = Math.max(0, Math.min(1, (f - start) / dur));
  const e = 1 - Math.pow(1 - t, 3);
  return e + bounce * Math.sin(Math.PI * t) * (1 - t);
}

export const clamp01 = (x: number) => Math.max(0, Math.min(1, x));

export const BRAND = {
  blue: "#533ff5", // Treidify "Galactic Violet" – the brand's blue-violet accent
  blueLight: "#8b7bff", // dark-theme accent token
  ice: "#b9c4ff",
  bg0: "#07060c",
  bg1: "#0b0a10",
  navy: "#0a0d1f",
  text: "#f5f4f8",
  text2: "#b9b5c6",
  up: "#2fd08e",
  down: "#ff5d6c",
};

export const DISPLAY = "Geist, Inter, system-ui, sans-serif";
export const BODY = "Inter, system-ui, sans-serif";
