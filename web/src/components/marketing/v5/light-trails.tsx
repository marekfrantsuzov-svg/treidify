"use client";

import { motion, useReducedMotion, useScroll, useTransform } from "motion/react";

/**
 * Hero light trails: a few long violet, lavender and magenta strokes that flow slowly (stroke-dashoffset, CSS) and
 * drift with scroll (one transform on the whole layer). SVG, not video or WebGL: one composited layer, no JS per frame.
 * Phones draw three trails instead of six; reduced motion keeps them still.
 */
const TRAILS = [
  { d: "M-120 640 C 220 520, 420 700, 760 540 S 1260 300, 1760 380", c: "url(#lt-a)", w: 2.2, t: 22, o: 0.9, mobile: true },
  { d: "M-80 760 C 300 640, 620 820, 980 640 S 1500 460, 1800 520", c: "url(#lt-b)", w: 1.4, t: 28, o: 0.7, mobile: true },
  { d: "M-160 520 C 160 420, 520 600, 860 420 S 1320 180, 1820 240", c: "url(#lt-c)", w: 1.2, t: 34, o: 0.55, mobile: false },
  { d: "M-100 880 C 360 760, 700 900, 1100 760 S 1560 600, 1840 660", c: "url(#lt-a)", w: 3.2, t: 40, o: 0.35, mobile: true },
  { d: "M200 980 C 520 820, 900 960, 1240 780 S 1640 560, 1900 600", c: "url(#lt-b)", w: 1, t: 30, o: 0.5, mobile: false },
  { d: "M-60 420 C 260 340, 600 460, 900 330 S 1380 120, 1860 160", c: "url(#lt-c)", w: 0.9, t: 46, o: 0.4, mobile: false },
];

export function LightTrails() {
  const reduce = useReducedMotion();
  const { scrollY } = useScroll();
  const y = useTransform(scrollY, [0, 900], [0, reduce ? 0 : -120]);
  const op = useTransform(scrollY, [0, 700], [1, 0.35]);
  return (
    <motion.div aria-hidden className="v5-trails" style={{ y, opacity: op }}>
      <svg viewBox="0 0 1700 1000" preserveAspectRatio="xMidYMid slice" width="100%" height="100%">
        <defs>
          <linearGradient id="lt-a" x1="0" x2="1"><stop offset="0" stopColor="#8445e8" stopOpacity="0" /><stop offset="0.35" stopColor="#a85af5" /><stop offset="0.7" stopColor="#d68af3" /><stop offset="1" stopColor="#db6edb" stopOpacity="0" /></linearGradient>
          <linearGradient id="lt-b" x1="0" x2="1"><stop offset="0" stopColor="#db6edb" stopOpacity="0" /><stop offset="0.5" stopColor="#db6edb" /><stop offset="1" stopColor="#a85af5" stopOpacity="0" /></linearGradient>
          <linearGradient id="lt-c" x1="0" x2="1"><stop offset="0" stopColor="#d68af3" stopOpacity="0" /><stop offset="0.45" stopColor="#e9c5fb" /><stop offset="1" stopColor="#8445e8" stopOpacity="0" /></linearGradient>
        </defs>
        {TRAILS.map((t, i) => (
          <g key={i} className={t.mobile ? undefined : "v5-trail-desktop"}>
            <path d={t.d} fill="none" stroke={t.c} strokeWidth={t.w * 6} strokeOpacity={t.o * 0.22} strokeLinecap="round" className="v5-trail-glow" />
            <path d={t.d} fill="none" stroke={t.c} strokeWidth={t.w} strokeOpacity={t.o} strokeLinecap="round" pathLength={100} className="v5-trail" style={{ ["--t" as string]: `${t.t}s`, ["--o" as string]: `${-i * 13}` }} />
          </g>
        ))}
      </svg>
    </motion.div>
  );
}
