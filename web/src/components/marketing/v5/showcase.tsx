"use client";

import { motion, useReducedMotion, useScroll, useSpring, useTransform } from "motion/react";
import { Activity, CalendarClock, ShieldCheck, Target } from "lucide-react";
import { useRef } from "react";
import { DesktopMock } from "../lx/mocks";

const NOTES = [
  { icon: Target, k: "Sell zone · 1H", v: "4,125.34 – 4,120.06", cls: "sc-n1" },
  { icon: Activity, k: "Account Health", v: "83 / 100 · Strong", cls: "sc-n2" },
  { icon: CalendarClock, k: "Next high-impact event", v: "NFP · 15:30", cls: "sc-n3" },
  { icon: ShieldCheck, k: "Structural stop", v: "33 of 50 pips max", cls: "sc-n4" },
];

/**
 * Product showcase (#product): the full dashboard grows into place as it scrolls in (scale and lift, scroll-linked,
 * no scroll-jacking) and four notes about what you are looking at arrive one after another. Phones see the same desktop
 * app, zoomed past the sidebar onto the dashboard, with the notes as a list. Example figures, labelled as such.
 */
export function ProductShowcase() {
  const ref = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "center center"] });
  const p = useSpring(scrollYProgress, { stiffness: 140, damping: 30, mass: 0.4 });
  const scale = useTransform(p, [0, 1], [reduce ? 1 : 0.9, 1]);
  const rotateX = useTransform(p, [0, 1], [reduce ? 0 : 14, 0]);
  const y = useTransform(p, [0, 1], [reduce ? 0 : 60, 0]);

  return (
    <section id="product" className="lx-section sc-root" aria-labelledby="sc-title">
      <div className="sc-head">
        <p className="ed-kicker">The product</p>
        <h2 id="sc-title" className="ts-h2">One workspace for the chart, the macro and your own account.</h2>
        <p className="ts-body sc-lead">The structure on the chart, the event that can move it and what your own trades say about you, side by side.</p>
      </div>

      <div ref={ref} className="sc-stage">
        <motion.div className="sc-desk" style={{ scale, rotateX, y }}>
          <DesktopMock />
        </motion.div>
        <ul className="sc-notes">
          {NOTES.map((n, i) => (
            <motion.li key={n.k} className={`sc-note glass ${n.cls}`}
              initial={reduce ? false : { opacity: 0, y: 14 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-15% 0px" }}
              transition={{ duration: 0.5, delay: 0.25 + i * 0.12, ease: [0.16, 1, 0.3, 1] }}>
              <span className="sc-note-icon" aria-hidden><n.icon /></span>
              <span><span className="sc-note-k">{n.k}</span><span className="sc-note-v num">{n.v}</span></span>
            </motion.li>
          ))}
        </ul>
      </div>
      <p className="sc-caption">Illustrative preview with example figures, not live market or account data.</p>
    </section>
  );
}
