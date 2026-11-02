"use client";

import { motion } from "motion/react";
import { ArrowDown, ArrowRight } from "lucide-react";
import Link from "next/link";
import { ButtonLink } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import { DesktopMock, PhoneMock } from "../lx/mocks";

const ease = [0.2, 0, 0, 1] as const;
const rise = (delay: number) => ({ initial: { opacity: 0, y: 12 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.6, ease, delay } });

/**
 * Hero, scene one. The headline carries the page: ink for the promise, secondary ink for its consequence. One primary
 * action. Below it the product itself, flat and square to the viewer: no tilt, no floating widgets, no glow.
 */
export function EdHero() {
  return (
    <section className="ed-hero" aria-labelledby="hero-title">
      <Container>
        <motion.p {...rise(0)} className="ed-kicker">Trading intelligence for gold, the dollar and your own account</motion.p>
        <div className="ed-hero-grid">
          <motion.h1 {...rise(0.05)} id="hero-title" className="ts-display ed-hero-title">
            Know where gold reacts. <span className="ed-quiet">Before you trade.</span>
          </motion.h1>
          <motion.div {...rise(0.14)} className="ed-hero-side">
            <p className="ts-lead">
              Supply and demand zones on 15M, 1H and 4H. A 50-pip structural stop on every setup. The macro picture behind gold, and a coach that reads your real MT5 trades.
            </p>
            <div className="ed-hero-actions">
              <ButtonLink href="/signup" size="lg" className="ed-cta">Create free account <ArrowRight className="h-4 w-4" /></ButtonLink>
              <Link href="#product" className="ed-textlink">See the product <ArrowDown className="h-4 w-4" /></Link>
            </div>
            <p className="ed-fine">72 hours of Premium, no card. MT5 connects read-only.</p>
          </motion.div>
        </div>
      </Container>

      <motion.div
        className="ed-hero-stage"
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease, delay: 0.25 }}
      >
        <div className="lx-stage">
          <div className="lx-stage-desk"><DesktopMock /></div>
          <div className="lx-stage-phone"><PhoneMock /></div>
        </div>
        <p className="ed-caption">Illustrative product preview. Prices, zones and account figures are examples, not live market or account data.</p>
      </motion.div>
    </section>
  );
}
