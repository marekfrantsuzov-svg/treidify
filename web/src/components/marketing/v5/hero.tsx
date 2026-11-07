"use client";

import { motion, useScroll, useSpring, useTransform } from "motion/react";
import { ArrowRight, Clock3, Link2, Play, ShieldCheck, TrendingDown } from "lucide-react";
import Link from "next/link";
import { useRef } from "react";
import { ButtonLink } from "@/components/ui/button";
import { DesktopMock, PhoneMock } from "../lx/mocks";

/**
 * v5 hero (master spec §4.2 and §5). The entrance is pure CSS keyframes with staggered delays (v5/landing.css), so it
 * starts at first paint, before hydration, and never hides content from a slow device: background, navigation,
 * headline lines, supporting copy, actions, then the product stage arriving in depth and settling.
 * After hydration one scroll-linked value drives the stage: it eases from its presentation angle toward the viewer and
 * the light floor below it flattens and fades. Only transform and opacity animate; reduced motion turns it all off.
 */
export function V5Hero() {
  const stage = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: stage, offset: ["start 0.85", "end 0.2"] });
  const p = useSpring(scrollYProgress, { stiffness: 140, damping: 30, mass: 0.4 });
  const rotateY = useTransform(p, [0, 1], [-15, -4]);
  const rotateX = useTransform(p, [0, 1], [7, 1]);
  const scale = useTransform(p, [0, 1], [1, 1.04]);
  const floorScale = useTransform(p, [0, 0.8], [1, 0.62]);
  const floorOpacity = useTransform(p, [0, 0.8], [1, 0]);
  const chipsY = useTransform(p, [0, 1], [0, -36]);

  return (
    <section className="v5-hero" aria-labelledby="hero-title">
      <div className="v5-floor" aria-hidden>
        <motion.div className="v5-floor-grid" style={{ scaleY: floorScale, opacity: floorOpacity }} />
        <div className="v5-horizon" />
      </div>

      <div className="v5-hero-inner">
        <div className="v5-copy">
          <p className="v5-kicker v5-in" style={{ ["--d" as string]: "160ms" }}>Trading intelligence for gold, the dollar and your own account</p>
          <h1 id="hero-title" className="v5-title">
            <span className="v5-line"><span className="v5-in-line" style={{ ["--d" as string]: "220ms" }}>Know where</span></span>
            <span className="v5-line"><span className="v5-in-line" style={{ ["--d" as string]: "300ms" }}>gold reacts.</span></span>
            <span className="v5-line v5-title-dim"><span className="v5-in-line" style={{ ["--d" as string]: "380ms" }}>Before you trade.</span></span>
          </h1>
          <p className="v5-lead v5-in" style={{ ["--d" as string]: "480ms" }}>
            Supply and demand zones on 15M, 1H and 4H. A 50-pip structural stop on every setup. The macro picture behind gold, and a coach that reads your real MT5 trades.
          </p>
          <div className="v5-actions v5-in" style={{ ["--d" as string]: "580ms" }}>
            <ButtonLink href="/signup" size="lg" className="ed-cta v5-cta">Start free trial <ArrowRight className="h-4 w-4" /></ButtonLink>
            <Link href="#product" className="v5-play"><span className="v5-play-dot" aria-hidden><Play /></span>See the product</Link>
          </div>
          <ul className="v5-trust v5-in" style={{ ["--d" as string]: "660ms" }}>
            <li><Clock3 aria-hidden />72 hours of Premium</li>
            <li><Link2 aria-hidden />MT5 read-only</li>
            <li><ShieldCheck aria-hidden />50-pip stop rule</li>
          </ul>
        </div>

        <div ref={stage} className="v5-stage v5-in-stage" aria-label="Illustrative Treidify dashboard preview" role="img">
          <motion.div className="v5-device-wrap" style={{ rotateY, rotateX, scale }}>
            <div className="v5-device g3">
              <DesktopMock />
            </div>
            <div className="v5-device-phone"><PhoneMock /></div>
            <motion.div className="v5-chip-pos v5-chip-a" style={{ y: chipsY }}>
              <div className="v5-chip"><span className="v5-chip-ico is-down" aria-hidden><TrendingDown /></span><span><b>Sell zone · 1H</b><small>Waiting for 5M confirmation</small></span></div>
            </motion.div>
            <motion.div className="v5-chip-pos v5-chip-b" style={{ y: chipsY }}>
              <div className="v5-chip"><span className="v5-chip-ico" aria-hidden><ShieldCheck /></span><span><b>Structural stop ≤ 50 pips</b><small>Wider means no valid setup</small></span></div>
            </motion.div>
          </motion.div>
          <div className="v5-pedestal" aria-hidden />
        </div>
      </div>
      <p className="v5-caption">Illustrative preview with example figures. Not live market or account data.</p>
    </section>
  );
}
