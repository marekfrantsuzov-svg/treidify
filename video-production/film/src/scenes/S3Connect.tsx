import React from "react";
import { AbsoluteFill, Img, staticFile, useCurrentFrame } from "remotion";
import { Card, Footnote, Stage, Words } from "../components";
import { BRAND, DISPLAY, EASE, IN, OUT, clamp01, ramp, track } from "../lib";

const A = 700;
const B = 1220;

const Tile: React.FC<{ children: React.ReactNode; label: string; sub: string; p: number; pulse?: number }> = ({ children, label, sub, p, pulse = 0 }) => (
  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 22, opacity: p, transform: `translateY(${(1 - p) * 40}px) scale(${0.9 + 0.1 * p})`, filter: `blur(${(1 - p) * 10}px)` }}>
    <div
      style={{
        width: 200,
        height: 200,
        borderRadius: 48,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "linear-gradient(160deg, rgba(60,56,110,0.55), rgba(18,16,34,0.85) 60%)",
        border: "1px solid rgba(170,160,255,0.22)",
        boxShadow: `0 40px 80px -30px rgba(0,0,0,0.9), inset 0 1px 0 rgba(255,255,255,0.12), 0 0 ${30 + 90 * pulse}px rgba(83,63,245,${0.25 + 0.5 * pulse})`,
        position: "relative",
      }}
    >
      {children}
      {pulse > 0 && (
        <div style={{ position: "absolute", inset: -24 * pulse, borderRadius: 48 + 24 * pulse, border: `2px solid rgba(139,123,255,${0.8 * (1 - pulse)})` }} />
      )}
    </div>
    <div style={{ textAlign: "center" }}>
      <div style={{ fontFamily: DISPLAY, fontSize: 30, fontWeight: 600, color: BRAND.text, letterSpacing: "-0.02em" }}>{label}</div>
      <div style={{ fontFamily: "Inter", fontSize: 19, color: BRAND.text2, marginTop: 6 }}>{sub}</div>
    </div>
  </div>
);

/** 700–1220 · MetaTrader 5 → Treidify read-only link, the account appears, then analytics and the P&L calendar. */
export const S3Connect: React.FC = () => {
  const f = useCurrentFrame();
  if (f < A || f > B + 10) return null;

  const enter = ramp(f, 730, 770, OUT);
  const flash = Math.max(0, 1 - Math.abs(f - 742) / 22);

  // connection
  const draw = ramp(f, 772, 852, EASE);
  const pulse = f >= 878 ? clamp01((f - 878) / 40) : 0;
  const L = { x: 640, y: 470 };
  const R = { x: 1280, y: 470 };
  const path = `M ${L.x + 110} ${L.y - 30} C ${L.x + 300} ${L.y - 150}, ${R.x - 300} ${L.y + 90}, ${R.x - 110} ${R.y - 30}`;
  const len = 760;
  // particle position along the cubic (approximation by sampling the bezier)
  const bez = (t: number) => {
    const p0 = [L.x + 110, L.y - 30], p1 = [L.x + 300, L.y - 150], p2 = [R.x - 300, L.y + 90], p3 = [R.x - 110, R.y - 30];
    const u = 1 - t;
    return [0, 1].map((i) => u * u * u * p0[i] + 3 * u * u * t * p1[i] + 3 * u * t * t * p2[i] + t * t * t * p3[i]);
  };
  const [px, py] = bez(draw);

  // phase A → B → C
  const linkOut = ramp(f, 905, 945, EASE);
  const acct = ramp(f, 900, 948, OUT);
  const acctOut = ramp(f, 990, 1030, EASE);
  const trk = ramp(f, 990, 1040, OUT);
  const eqReveal = ramp(f, 1000, 1080, EASE);
  const trkOut = ramp(f, 1090, 1130, EASE);
  const und = ramp(f, 1090, 1140, OUT);
  const exit = ramp(f, 1180, 1222, IN);

  const camS = track(f, [[A, 1.05], [900, 1.0], [1220, 1.06]], EASE);
  const camRx = track(f, [[990, 0], [1090, 4], [1220, 2]]);

  return (
    <AbsoluteFill style={{ opacity: 1 - exit * 0.9, filter: `blur(${exit * 10}px)` }}>
      <AbsoluteFill style={{ background: `radial-gradient(50% 50% at 50% 48%, rgba(170,180,255,${0.9 * flash}), rgba(83,63,245,${0.5 * flash}) 40%, transparent 75%)` }} />

      {/* Title row */}
      <div style={{ position: "absolute", top: 92, left: 0, right: 0, display: "flex", justifyContent: "center" }}>
        <Words text="Connect. Track. [Understand.]" at={905} out={1176} size={84} stagger={70} />
      </div>

      <Stage cam={{ s: camS, rx: camRx, y: track(f, [[1180, 0], [1222, -60]]) }} perspective={2200}>
        {/* Phase A: link */}
        <div style={{ position: "absolute", inset: 0, opacity: enter * (1 - linkOut), transform: `translateY(${-linkOut * 180}px) scale(${1 - 0.25 * linkOut})` }}>
          <div style={{ position: "absolute", left: L.x - 100, top: L.y - 130 }}>
            <Tile label="MetaTrader 5" sub="Your trading account" p={ramp(f, 735, 775, OUT)}>
              <div style={{ fontFamily: DISPLAY, fontWeight: 700, fontSize: 64, color: "#e9ecff", letterSpacing: "-0.02em" }}>MT5</div>
            </Tile>
          </div>
          <div style={{ position: "absolute", left: R.x - 100, top: R.y - 130 }}>
            <Tile label="Treidify" sub="Your trading workspace" p={ramp(f, 748, 788, OUT)} pulse={pulse}>
              <Img src={staticFile("brand/treidify-t-512.png")} style={{ width: 112, height: 112 }} />
            </Tile>
          </div>
          <svg width={1920} height={1080} style={{ position: "absolute", inset: 0, overflow: "visible" }}>
            <defs>
              <linearGradient id="ln" x1="0" x2="1">
                <stop offset="0" stopColor="#5a6bff" stopOpacity="0.2" />
                <stop offset="0.5" stopColor="#8b9bff" />
                <stop offset="1" stopColor="#8b7bff" />
              </linearGradient>
              <filter id="gl"><feGaussianBlur stdDeviation="6" /></filter>
            </defs>
            <path d={path} fill="none" stroke="url(#ln)" strokeWidth={10} strokeLinecap="round" strokeDasharray={len} strokeDashoffset={len * (1 - draw)} filter="url(#gl)" opacity={0.7} />
            <path d={path} fill="none" stroke="url(#ln)" strokeWidth={2.5} strokeLinecap="round" strokeDasharray={len} strokeDashoffset={len * (1 - draw)} />
            {/* flowing dashes once linked */}
            {f > 852 && <path d={path} fill="none" stroke="rgba(220,226,255,0.8)" strokeWidth={2} strokeDasharray="6 26" strokeDashoffset={-(f - 852) * 2.2} />}
            {draw > 0 && draw < 1 && (
              <g>
                <circle cx={px} cy={py} r={16} fill="rgba(139,155,255,0.5)" filter="url(#gl)" />
                <circle cx={px} cy={py} r={5} fill="#eef0ff" />
              </g>
            )}
          </svg>
          <div style={{ position: "absolute", top: L.y + 150, left: 0, right: 0, textAlign: "center", fontFamily: "Inter", fontSize: 22, color: BRAND.text2, opacity: ramp(f, 820, 850) }}>
            Read-only · investor password · cannot place trades
          </div>
        </div>

        {/* Phase A→B: the account appears inside the app */}
        <div style={{ position: "absolute", left: 960 - 500, top: 380, opacity: acct * (1 - acctOut), transform: `translateY(${(1 - acct) * 60 - acctOut * 120}px) scale(${0.96 + 0.04 * acct - 0.06 * acctOut})`, filter: `blur(${(1 - acct) * 8 + acctOut * 6}px)` }}>
          <Card name="ac-list-l" w={1000} style={{ position: "relative" }} glow={0.5} />
        </div>

        {/* Phase B: Track — performance KPIs and the equity curve */}
        <div style={{ position: "absolute", inset: 0, opacity: trk * (1 - trkOut * 0.85), transform: `translateZ(${-trkOut * 380}px)`, transformStyle: "preserve-3d", filter: `blur(${trkOut * 5}px)` }}>
          <div style={{ position: "absolute", left: 960 - 760, top: 230, transform: `translateY(${(1 - trk) * 50}px)` }}>
            <Card name="h-kpis" w={1520} style={{ position: "relative" }} />
          </div>
          <div style={{ position: "absolute", left: 960 - 760, top: 455, transform: `translateY(${(1 - trk) * 90}px)` }}>
            <div style={{ position: "relative", clipPath: `inset(0 ${(1 - eqReveal) * 100}% 0 0 round 20px)` }}>
              <Card name="h-equity" w={940} style={{ position: "relative" }} />
            </div>
          </div>
          <div style={{ position: "absolute", left: 960 - 760 + 960, top: 455, transform: `translateY(${(1 - ramp(f, 1020, 1070, OUT)) * 90}px)`, opacity: ramp(f, 1020, 1050) }}>
            <Card name="h-dd" w={560} style={{ position: "relative" }} />
          </div>
        </div>

        {/* Phase C: Understand — the P&L calendar */}
        <div style={{ position: "absolute", left: 960 - 700, top: 220, transformStyle: "preserve-3d", transform: `translate3d(${(1 - und) * 420}px, ${(1 - und) * 20}px, ${(1 - und) * 300}px) rotateY(${(1 - und) * -22}deg)`, opacity: und }}>
          <Card name="j-cal" w={1400} style={{ position: "relative" }} glow={0.4} />
        </div>
      </Stage>

      <Footnote text="Sample MT5 account shown · no real credentials or account numbers" a={900} b={1200} />
    </AbsoluteFill>
  );
};
