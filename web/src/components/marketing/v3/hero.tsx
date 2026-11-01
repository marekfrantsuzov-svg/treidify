"use client";

import { motion, useReducedMotion, useScroll, useTransform } from "motion/react";
import { ArrowRight, ShieldCheck } from "lucide-react";
import Image from "next/image";
import { useRef } from "react";
import { ButtonLink } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import { Laptop, Phone, Shot } from "./shot";

/** Landing hero: logo, promise, two actions, and the real app in a laptop and a phone with a gentle scroll parallax. */
export function HeroV3() {
  const ref = useRef<HTMLElement>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end start"] });
  const tilt = useTransform(scrollYProgress, [0, 0.45], [reduce ? 0 : 10, 0]);
  const lift = useTransform(scrollYProgress, [0, 1], [0, reduce ? 0 : -60]);
  const phoneY = useTransform(scrollYProgress, [0, 1], [0, reduce ? 0 : -130]);
  const chipY = useTransform(scrollYProgress, [0, 1], [0, reduce ? 0 : -190]);

  return (
    <section ref={ref} className="relative overflow-x-clip pb-10 pt-12 sm:pt-16">
      <Container className="text-center">
        <div className="rise flex flex-col items-center">
          <span className="hero-logo"><Image src="/brand/treidify-t-256.webp" alt="" width={72} height={72} priority /></span>
          <span className="glass mt-5 inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-[13px] font-medium text-ink-2">
            <span className="h-1.5 w-1.5 rounded-full bg-accent shadow-[0_0_10px_var(--accent)]" />Treidify · Your Trading Intelligence
          </span>
        </div>
        <h1 style={{ "--d": "0.06s" } as React.CSSProperties} className="rise text-gradient mx-auto mt-6 max-w-5xl text-[2.35rem] font-semibold leading-[1.04] tracking-[-0.045em] sm:text-6xl lg:text-[4.4rem]">
          AI-powered trading intelligence for <span className="text-accent-gradient">gold, the dollar</span> and your own account.
        </h1>
        <p style={{ "--d": "0.12s" } as React.CSSProperties} className="rise mx-auto mt-6 max-w-2xl text-[17px] leading-relaxed text-ink-2 sm:text-xl">
          Market structure on four timeframes, key buy and sell zones with honest risk rules, macro context and a coach that reads your real MT5 trades.
        </p>
        <div style={{ "--d": "0.18s" } as React.CSSProperties} className="rise mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <ButtonLink href="/signup" size="lg">Create free account <ArrowRight className="h-4 w-4" /></ButtonLink>
          <ButtonLink href="/login" size="lg" variant="secondary">Sign in</ButtonLink>
        </div>
        <p style={{ "--d": "0.26s" } as React.CSSProperties} className="rise mt-4 inline-flex items-center gap-1.5 text-sm text-ink-3">
          <ShieldCheck className="h-4 w-4" />Free account, no card. MT5 connects read-only and can never place a trade.
        </p>
      </Container>

      <div className="relative mx-auto mt-12 max-w-[1180px] px-4 sm:px-8 [perspective:1800px]">
        <motion.div style={{ rotateX: tilt, y: lift, transformOrigin: "50% 0%" }} className="rise" >
          <Laptop><Shot name="dash" eager alt="The Treidify dashboard: account health, XAUUSD chart with a buy zone, AI market analysis, macro desk and news impact, shown with sample data." /></Laptop>
        </motion.div>
        <motion.div style={{ y: phoneY }} className="hero-phone"><Phone><Shot name="phone-dash" eager alt="Treidify on iPhone: account health, metrics and the XAUUSD chart, shown with sample data." /></Phone></motion.div>
        <motion.div style={{ y: chipY }} className="hero-chip hero-chip-a glass" aria-hidden>
          <span className="tf-pill is-bullish"><span className="tf-dot" />4H</span><span className="tf-pill is-bullish"><span className="tf-dot" />1H</span><span className="tf-pill is-bearish"><span className="tf-dot" />15M</span>
        </motion.div>
        <motion.div style={{ y: chipY }} className="hero-chip hero-chip-b glass" aria-hidden>
          <span className="ready-pill is-wait">WAIT</span><span className="text-[12px] font-medium text-ink-2">Stop over 50 pips: no trade</span>
        </motion.div>
      </div>
      <p className="mx-auto mt-6 max-w-[1180px] px-4 text-center text-xs text-ink-3">Real Treidify screens, shown with sample data. Values marked “Sample” are not live market or account data.</p>
    </section>
  );
}
