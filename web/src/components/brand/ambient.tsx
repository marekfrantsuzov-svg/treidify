"use client";

import { useEffect, useRef } from "react";

/**
 * The ambient brand light behind every page: soft violet and pink lights on two depth layers (styles in
 * app/glass.css). It also owns two small pointer effects, both rAF-throttled and limited to fine pointers with motion
 * allowed: a few pixels of parallax on the light layers, and the light that follows the pointer across glass cards
 * (it writes --mx/--my on the hovered card only). Nothing renders continuously in JS.
 */
export function Ambient() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fine = matchMedia("(hover: hover) and (pointer: fine)");
    const still = matchMedia("(prefers-reduced-motion: reduce)");
    if (!fine.matches) return;
    let raf = 0;
    let last: PointerEvent | null = null;
    const frame = () => {
      raf = 0;
      const e = last;
      if (!e) return;
      if (!still.matches && ref.current) {
        ref.current.style.setProperty("--px", ((e.clientX / innerWidth) * 2 - 1).toFixed(3));
        ref.current.style.setProperty("--py", ((e.clientY / innerHeight) * 2 - 1).toFixed(3));
      }
      const card = (e.target as Element | null)?.closest?.<HTMLElement>(".dcard, .glass-hover, .lx-card");
      if (card) {
        const r = card.getBoundingClientRect();
        card.style.setProperty("--mx", `${Math.round(e.clientX - r.left)}px`);
        card.style.setProperty("--my", `${Math.round(e.clientY - r.top)}px`);
      }
    };
    const onMove = (e: PointerEvent) => { last = e; if (!raf) raf = requestAnimationFrame(frame); };
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => { window.removeEventListener("pointermove", onMove); cancelAnimationFrame(raf); };
  }, []);

  return (
    <>
      <div ref={ref} className="ambient" aria-hidden>
        <div className="amb-layer amb-far">
          <i className="amb-orb amb-o1" />
          <i className="amb-orb amb-o2" />
          <i className="amb-orb amb-o3" />
          <span className="amb-sheen" />
        </div>
        <div className="amb-layer amb-near">
          <i className="amb-orb amb-o4" />
          <i className="amb-orb amb-o5" />
        </div>
        <div className="amb-grain" />
        <div className="amb-vignette" />
      </div>
      {/* The logo gradient as a stroke paint, for icons in section titles and active navigation (stroke: url(#tdy-stroke)). */}
      <svg width="0" height="0" aria-hidden focusable="false" style={{ position: "absolute" }}>
        <defs>
          <linearGradient id="tdy-stroke" gradientUnits="userSpaceOnUse" x1="2" y1="3" x2="22" y2="21">
            <stop offset="0" stopColor="#8f78ff" />
            <stop offset="0.55" stopColor="#b84ef0" />
            <stop offset="1" stopColor="#f27be9" />
          </linearGradient>
        </defs>
      </svg>
    </>
  );
}
