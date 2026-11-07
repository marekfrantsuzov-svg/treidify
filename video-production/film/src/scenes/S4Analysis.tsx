import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { Chip, Footnote, Scrim, Screen, Stage, Words, frameOn } from "../components";
import { EASE, IN, OUT, clamp01, ramp, track } from "../lib";

const A = 1180;
const B = 1700;

/** Next analysis layer drawn over the previous one with a scanning edge. */
const Wipe: React.FC<{ name: string; at: number; f: number; dur?: number }> = ({ name, at, f, dur = 44 }) => {
  const p = ramp(f, at, at + dur, EASE);
  if (p <= 0) return null;
  const edge = 297 + (1435 - 297) * p;
  return (
    <>
      <div style={{ position: "absolute", inset: 0, clipPath: p < 1 ? `inset(0 ${1920 - edge}px 0 0)` : undefined }}>
        <Screen name={name} />
      </div>
      {p < 1 && (
        <div style={{ position: "absolute", left: edge - 2, top: 340, width: 4, height: 600, background: "linear-gradient(180deg, transparent, rgba(185,196,255,0.95), transparent)", boxShadow: "0 0 24px 6px rgba(110,130,255,0.6)" }} />
      )}
    </>
  );
};

/** Instant timeframe change with a soft flash, as when the user taps a timeframe. */
const Switch: React.FC<{ name: string; at: number; f: number }> = ({ name, at, f }) => {
  const p = ramp(f, at, at + 12, OUT);
  if (p <= 0) return null;
  return (
    <div style={{ position: "absolute", inset: 0, opacity: p, filter: `blur(${(1 - p) * 6}px)` }}>
      <Screen name={name} />
    </div>
  );
};

const Ring: React.FC<{ x: number; y: number; at: number; f: number }> = ({ x, y, at, f }) => {
  const p = clamp01((f - at) / 34);
  if (f < at || p >= 1) return null;
  const o = Math.sin(Math.PI * p);
  return (
    <div style={{ position: "absolute", left: x - 34, top: y - 22, width: 68, height: 44, borderRadius: 22, border: "2px solid rgba(185,196,255,0.95)", boxShadow: `0 0 ${30 * o}px rgba(110,130,255,0.9)`, opacity: o, transform: `scale(${1 + 0.35 * p})` }} />
  );
};

/** 1180–1700 · XAUUSD chart: zones, structure, Fibonacci and liquidity layers, then a timeframe switch. */
export const S4Analysis: React.FC = () => {
  const f = useCurrentFrame();
  if (f < A || f > B + 10) return null;

  const c0 = frameOn(800, 640, 1.42);
  const c1 = frameOn(1000, 630, 1.5);
  const c2 = frameOn(880, 560, 1.16);
  const c3 = frameOn(980, 600, 0.9);
  const cam = {
    x: track(f, [[1230, c0.x], [1490, c1.x], [1530, c2.x], [1640, c2.x], [1700, c3.x]]),
    y: track(f, [[1230, c0.y], [1490, c1.y], [1530, c2.y], [1640, c2.y], [1700, c3.y]]),
    s: track(f, [[1230, c0.s], [1490, c1.s], [1530, c2.s], [1640, c2.s], [1700, c3.s]]),
  };
  // fly-in of the plate
  const fly = ramp(f, 1182, 1252, OUT);
  const textPhase = Math.min(ramp(f, 1192, 1210), 1 - ramp(f, 1252, 1272));
  const exit = ramp(f, 1668, 1702, IN);

  const legend = [
    { t: "Supply & demand zones", at: 1222 },
    { t: "Market structure", at: 1268 },
    { t: "Fibonacci levels", at: 1358 },
    { t: "Liquidity", at: 1448 },
  ];
  const legendO = Math.min(ramp(f, 1220, 1240), 1 - ramp(f, 1506, 1526));
  const tfO = Math.min(ramp(f, 1530, 1546), 1 - ramp(f, 1660, 1680));

  return (
    <AbsoluteFill style={{ opacity: ramp(f, A, A + 16) * (1 - exit), filter: `blur(${exit * 8}px)` }}>
      <AbsoluteFill style={{ filter: `blur(${textPhase * 8}px) brightness(${1 - textPhase * 0.5})` }}>
        <Stage cam={cam} perspective={2000}>
          <div style={{ position: "absolute", inset: 0, transformStyle: "preserve-3d", transform: `translate3d(${(1 - fly) * 200}px, 0, ${(1 - fly) * -900}px) rotateY(${(1 - fly) * -24}deg)`, opacity: fly }}>
            <Screen name="markets-clean" radius={24} />
            <Wipe name="markets-1h" at={1262} f={f} />
            <Wipe name="markets-fib" at={1352} f={f} />
            <Wipe name="markets-liq" at={1442} f={f} />
            <Switch name="markets-4h" at={1562} f={f} />
            <Switch name="markets-15m" at={1622} f={f} />
            <Ring x={520} y={263} at={1548} f={f} />
            <Ring x={398} y={263} at={1608} f={f} />
          </div>
        </Stage>
      </AbsoluteFill>

      <Scrim o={textPhase} />
      <AbsoluteFill style={{ alignItems: "center", justifyContent: "center" }}>
        <Words text="See the market from a [different perspective.]" at={1194} out={1252} size={96} stagger={4} style={{ maxWidth: 1500 }} />
      </AbsoluteFill>

      {/* layer legend */}
      <Scrim o={legendO * 0.9} shape="bottom" />
      <div style={{ position: "absolute", left: 80, bottom: 76, display: "flex", gap: 14, opacity: legendO }}>
        {legend.map((l, i) => {
          const on = ramp(f, l.at, l.at + 14, OUT);
          const dot = i === 0 ? "#2fd08e" : i === 1 ? "#e9ecff" : "#8b7bff";
          return (
            <div key={l.t} style={{ transform: `translateY(${(1 - ramp(f, 1220 + i * 4, 1244 + i * 4, OUT)) * 20}px)` }}>
              <Chip on={on} dot={dot}>{l.t}</Chip>
            </div>
          );
        })}
      </div>
      <div style={{ position: "absolute", left: 80, bottom: 76, display: "flex", gap: 14, opacity: tfO }}>
        <Chip on={f < 1608 ? 1 : 0.3}>1H → 4H</Chip>
        <Chip on={f >= 1608 ? 1 : 0.3}>4H → 15M</Chip>
        <div style={{ alignSelf: "center", fontFamily: "Inter", fontSize: 20, color: "rgba(220,224,255,0.75)", marginLeft: 8 }}>Zones, structure and levels recalculated per timeframe</div>
      </div>

      <Footnote text="Sample bars, not live prices · analysis is educational, never a guaranteed outcome" a={1230} b={1690} />
    </AbsoluteFill>
  );
};
