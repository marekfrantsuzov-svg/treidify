"use client";

import { useEffect, useRef } from "react";

/** Flowing strands from lower left to upper right, each a cubic curve offset a little from the last. */
const STRANDS = Array.from({ length: 9 }, (_, i) => {
  const o = i * 12;
  return `M-80 ${700 - o} C 300 ${660 - o * 1.3}, 520 ${430 + o * 0.5}, 820 ${470 - o * 0.4} S 1260 ${170 + o * 0.8}, 1560 ${60 + o * 1.1}`;
});

/**
 * Brand silk light behind the hero: fine violet-to-pink strands with a soft wide glow under them and two slow light
 * pulses travelling along. Pure SVG (no blur filter, no canvas). The animation pauses whenever the hero is off screen
 * and never runs under reduced motion.
 */
export function HeroSilk() {
  const ref = useRef<SVGSVGElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => el.classList.toggle("is-paused", !e?.isIntersecting), { rootMargin: "100px" });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return (
    <div className="gx-silk" aria-hidden>
      <svg ref={ref} viewBox="0 0 1440 720" preserveAspectRatio="xMidYMid slice">
        <defs>
          <linearGradient id="gx-s" x1="0" y1="1" x2="1" y2="0">
            <stop offset="0" stopColor="#5b3fe6" stopOpacity="0" />
            <stop offset="0.3" stopColor="#7b5cff" />
            <stop offset="0.62" stopColor="#c93fe4" />
            <stop offset="0.85" stopColor="#fb8bf3" />
            <stop offset="1" stopColor="#fb8bf3" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="gx-w" x1="0" y1="1" x2="1" y2="0">
            <stop offset="0" stopColor="#6c4cff" stopOpacity="0" />
            <stop offset="0.45" stopColor="#7b5cff" stopOpacity="0.5" />
            <stop offset="0.8" stopColor="#f249ed" stopOpacity="0.35" />
            <stop offset="1" stopColor="#f249ed" stopOpacity="0" />
          </linearGradient>
        </defs>
        <g className="gx-silk-glow">
          <path d={STRANDS[4]} stroke="url(#gx-w)" strokeWidth="120" fill="none" opacity="0.18" />
          <path d={STRANDS[2]} stroke="url(#gx-w)" strokeWidth="44" fill="none" opacity="0.22" />
        </g>
        <g className="gx-silk-a">
          {STRANDS.map((d, i) => <path key={i} d={d} stroke="url(#gx-s)" strokeWidth={i % 3 === 0 ? 1.4 : 0.8} fill="none" opacity={0.25 + (i % 4) * 0.12} />)}
        </g>
        <g className="gx-silk-pulse">
          <path d={STRANDS[3]} pathLength={100} stroke="#fff" strokeWidth="1.6" fill="none" strokeLinecap="round" strokeDasharray="7 93" />
          <path d={STRANDS[6]} pathLength={100} stroke="#f7c4f4" strokeWidth="1.2" fill="none" strokeLinecap="round" strokeDasharray="5 95" />
        </g>
      </svg>
    </div>
  );
}
