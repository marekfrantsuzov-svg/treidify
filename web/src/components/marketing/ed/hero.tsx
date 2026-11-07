"use client";

import { motion, useMotionValue, useScroll, useSpring, useTransform } from "motion/react";
import { ArrowDown, ArrowRight, Link2, ShieldCheck, TrendingDown } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef } from "react";
import { ButtonLink } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import { DesktopMock, PhoneMock } from "../lx/mocks";
import { HeroSilk } from "./silk";

const ease = [0.22, 1, 0.36, 1] as const;
const rise = (delay: number) => ({ initial: { opacity: 0, y: 18, filter: "blur(8px)" }, animate: { opacity: 1, y: 0, filter: "blur(0px)" }, transition: { duration: 0.8, ease, delay } });

/**
 * Hero, scene one: the promise over brand silk light, then the product itself on a floating glass stage. The stage
 * settles from a slight tilt as it scrolls in and leans a few degrees toward the pointer on desktop. The copy is
 * unchanged from the editorial version; only the presentation moved on.
 */
export function EdHero() {
  const stage = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: stage, offset: ["start end", "start 0.25"] });
  const tiltIn = useTransform(scrollYProgress, [0, 1], [16, 0]);
  const scaleIn = useTransform(scrollYProgress, [0, 1], [0.94, 1]);
  const px = useMotionValue(0), py = useMotionValue(0);
  const rx = useSpring(useTransform(py, [-1, 1], [3, -3]), { stiffness: 120, damping: 20 });
  const ry = useSpring(useTransform(px, [-1, 1], [-4, 4]), { stiffness: 120, damping: 20 });
  const rotateX = useTransform(() => tiltIn.get() + rx.get());
  const chipY = useTransform(scrollYProgress, [0, 1], [40, 0]);

  useEffect(() => {
    const el = stage.current;
    if (!el || !matchMedia("(hover: hover) and (pointer: fine)").matches || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const on = (e: PointerEvent) => {
      const r = el.getBoundingClientRect();
      px.set(Math.max(-1, Math.min(1, ((e.clientX - r.left) / r.width) * 2 - 1)));
      py.set(Math.max(-1, Math.min(1, ((e.clientY - r.top) / r.height) * 2 - 1)));
    };
    const off = () => { px.set(0); py.set(0); };
    el.addEventListener("pointermove", on); el.addEventListener("pointerleave", off);
    return () => { el.removeEventListener("pointermove", on); el.removeEventListener("pointerleave", off); };
  }, [px, py]);

  return (
    <section className="ed-hero gx-hero" aria-labelledby="hero-title">
      <HeroSilk />
      <Container>
        <motion.p {...rise(0)} className="ed-kicker gx-kicker"><span className="gx-kicker-dot" aria-hidden />Trading intelligence for gold, the dollar and your own account</motion.p>
        <div className="ed-hero-grid">
          <motion.h1 {...rise(0.06)} id="hero-title" className="ts-display ed-hero-title">
            Know where gold reacts. <span className="gx-hero-accent">Before you trade.</span>
          </motion.h1>
          <motion.div {...rise(0.16)} className="ed-hero-side">
            <p className="ts-lead">
              Supply and demand zones on 15M, 1H and 4H. A 50-pip structural stop on every setup. The macro picture behind gold, and a coach that reads your real MT5 trades.
            </p>
            <div className="ed-hero-actions">
              <ButtonLink href="/signup" size="lg" className="ed-cta gx-cta">Create free account <ArrowRight className="h-4 w-4" /></ButtonLink>
              <Link href="#product" className="ed-textlink">See the product <ArrowDown className="h-4 w-4" /></Link>
            </div>
            <p className="ed-fine">72 hours of Premium, no card. MT5 connects read-only.</p>
          </motion.div>
        </div>
      </Container>

      <motion.div className="ed-hero-stage gx-stage-wrap" initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 1, ease, delay: 0.3 }}>
        <div ref={stage} className="gx-stage-persp">
          <motion.div className="gx-stage" style={{ rotateX, rotateY: ry, scale: scaleIn }}>
            <div className="gx-stage-glow" aria-hidden />
            <div className="lx-stage">
              <div className="lx-stage-desk gx-frame"><DesktopMock /></div>
              <div className="lx-stage-phone gx-phone"><PhoneMock /></div>
              <motion.div className="lx-float lx-float-a" style={{ y: chipY }}>
                <div className="gx-chip"><span className="gx-chip-ico is-down" aria-hidden><TrendingDown /></span><span><b>Sell zone · 1H</b><small>Waiting for 5M confirmation</small></span></div>
              </motion.div>
              <motion.div className="lx-float lx-float-c" style={{ y: chipY }}>
                <div className="gx-chip"><span className="gx-chip-ico" aria-hidden><ShieldCheck /></span><span><b>Structural stop ≤ 50 pips</b><small>Wider means no valid setup</small></span></div>
              </motion.div>
              <motion.div className="lx-float lx-float-b" style={{ y: chipY }}>
                <div className="gx-chip"><span className="gx-chip-ico is-up" aria-hidden><Link2 /></span><span><b>MT5 · read-only</b><small>Synced history, never places trades</small></span></div>
              </motion.div>
            </div>
          </motion.div>
        </div>
        <p className="ed-caption">Illustrative product preview. Prices, zones and account figures are examples, not live market or account data.</p>
      </motion.div>
    </section>
  );
}
