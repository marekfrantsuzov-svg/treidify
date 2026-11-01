"use client";

import { motion, useMotionValue, useReducedMotion, useScroll, useSpring, useTransform } from "motion/react";
import { ArrowRight, CircleCheck, Play, ShieldCheck, Sparkles } from "lucide-react";
import { useEffect, useRef } from "react";
import { ButtonLink } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import { DesktopMock, PhoneMock } from "./mocks";
import { Ring } from "./primitives";

const ease = [0.22, 1, 0.36, 1] as const;

/**
 * Landing hero: one promise, two actions, then the product. The desktop and phone mockups share one stage whose
 * geometry is in container units, so the phone is anchored to the stage's bottom edge and is always shown whole.
 */
export function HeroLx() {
  const ref = useRef<HTMLElement>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end start"] });
  // Motion strength: 1 by default, 0 under reduced motion. A motion value (not render-time state) keeps SSR and
  // hydration markup identical.
  const k = useMotionValue(1);
  useEffect(() => { k.set(reduce ? 0 : 1); }, [reduce, k]);
  const tilt = useTransform(() => k.get() * 14 * Math.max(0, 1 - scrollYProgress.get() / 0.4));
  const lift = useTransform(() => k.get() * -50 * scrollYProgress.get());
  const phoneY = useTransform(() => k.get() * -90 * scrollYProgress.get());
  const cardY = useTransform(() => k.get() * -150 * scrollYProgress.get());

  // Subtle pointer tilt on fine pointers.
  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const rx = useSpring(useTransform(my, [-0.5, 0.5], [3, -3]), { stiffness: 120, damping: 20 });
  const ry = useSpring(useTransform(mx, [-0.5, 0.5], [-4, 4]), { stiffness: 120, damping: 20 });
  const onMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (reduce || e.pointerType !== "mouse") return;
    const r = e.currentTarget.getBoundingClientRect();
    mx.set((e.clientX - r.left) / r.width - 0.5);
    my.set((e.clientY - r.top) / r.height - 0.5);
  };
  const onLeave = () => { mx.set(0); my.set(0); };

  const words = ["Know", "where", "gold", "reacts"];
  const words2 = ["before", "you", "trade."];

  return (
    <section ref={ref} className="lx-hero relative overflow-x-clip pb-8 pt-10 sm:pt-16" aria-labelledby="hero-title">
      <div className="lx-hero-bg" aria-hidden><i /><i /><i /></div>
      <Container className="relative text-center">
        <motion.a
          href="#analysis"
          initial={{ opacity: 0, y: 10, filter: "blur(6px)" }}
          animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          transition={{ duration: 0.7, ease }}
          className="lx-announce"
        >
          <span className="lx-announce-new">New</span><span className="max-[399px]:hidden">Timeframe zone engine: 15M, 1H and 4H</span><span className="min-[400px]:hidden">Zone engine: 15M, 1H, 4H</span><ArrowRight className="h-3.5 w-3.5" />
        </motion.a>
        <h1 id="hero-title" className="lx-h1 mx-auto mt-6 max-w-[15ch] sm:max-w-[17ch]">
          {words.map((w, i) => (
            <motion.span key={w} className="lx-word" initial={{ opacity: 0, y: "0.5em", filter: "blur(10px)" }} animate={{ opacity: 1, y: 0, filter: "blur(0px)" }} transition={{ duration: 0.8, ease, delay: 0.08 + i * 0.06 }}>{w}</motion.span>
          )).flatMap((el) => [el, " "])}
          {words2.map((w, i) => (
            <motion.span key={w} className="lx-word lx-grad-text" initial={{ opacity: 0, y: "0.5em", filter: "blur(10px)" }} animate={{ opacity: 1, y: 0, filter: "blur(0px)" }} transition={{ duration: 0.8, ease, delay: 0.32 + i * 0.06 }}>{w}</motion.span>
          )).flatMap((el, i, a) => (i < a.length - 1 ? [el, " "] : [el]))}
        </h1>
        <motion.p initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, ease, delay: 0.5 }} className="lx-lead mx-auto mt-6 max-w-[40rem]">
          Treidify maps XAUUSD supply and demand zones on 15M, 1H and 4H, holds every setup to a 50-pip structural stop, adds the macro picture, and coaches you on your real MT5 trades.
        </motion.p>
        <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, ease, delay: 0.6 }} className="mt-8 flex flex-col items-stretch justify-center gap-3 px-2 sm:flex-row sm:items-center sm:px-0">
          <ButtonLink href="/signup" size="lg" className="lx-cta">Create free account <ArrowRight className="h-4 w-4" /></ButtonLink>
          <ButtonLink href="#intelligence" size="lg" variant="secondary"><Play className="h-4 w-4" />Take the tour</ButtonLink>
          <ButtonLink href="/login" size="lg" variant="ghost" className="sm:hidden">Sign in</ButtonLink>
        </motion.div>
        <motion.ul initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.8, delay: 0.75 }} className="lx-trust mt-5">
          <li><CircleCheck />72 hours of Premium, no card</li>
          <li><ShieldCheck />MT5 connects read-only</li>
          <li className="max-sm:hidden"><Sparkles />Light and dark</li>
        </motion.ul>
      </Container>

      <div className="relative mx-auto mt-12 max-w-[1240px] px-4 sm:mt-16 sm:px-8 [perspective:2000px]">
        <motion.div
          className="lx-stage"
          onPointerMove={onMove}
          onPointerLeave={onLeave}
          initial={{ opacity: 0, y: 60 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1.1, ease, delay: 0.55 }}
        >
          <motion.div className="lx-stage-desk" style={{ rotateX: tilt, y: lift, transformOrigin: "50% 0%" }}>
            <motion.div style={{ rotateX: rx, rotateY: ry }}>
              <DesktopMock />
            </motion.div>
          </motion.div>
          <motion.div className="lx-stage-phone" style={{ y: phoneY }}>
            <motion.div initial={{ opacity: 0, x: 40, rotate: 4 }} animate={{ opacity: 1, x: 0, rotate: 0 }} transition={{ duration: 1, ease, delay: 1 }}>
              <PhoneMock />
            </motion.div>
          </motion.div>

          <motion.div style={{ y: cardY }} className="lx-float lx-float-a" aria-hidden>
            <motion.div className="lx-glass-card" initial={{ opacity: 0, scale: 0.9, y: 16 }} animate={{ opacity: 1, scale: 1, y: 0 }} transition={{ duration: 0.8, ease, delay: 1.25 }}>
              <span className="lx-dot is-down" />
              <div><small>Sell zone · 1H</small><b className="num">4,129.40 – 4,132.60</b></div>
            </motion.div>
          </motion.div>
          <motion.div style={{ y: cardY }} className="lx-float lx-float-b" aria-hidden>
            <motion.div className="lx-glass-card" initial={{ opacity: 0, scale: 0.9, y: 16 }} animate={{ opacity: 1, scale: 1, y: 0 }} transition={{ duration: 0.8, ease, delay: 1.4 }}>
              <Ring value={82} label={false} className="lx-ring-sm" />
              <div><small>Account Health</small><b>82 · Strong</b></div>
            </motion.div>
          </motion.div>
          <motion.div style={{ y: cardY }} className="lx-float lx-float-c" aria-hidden>
            <motion.div className="lx-glass-card is-wide" initial={{ opacity: 0, scale: 0.9, y: 16 }} animate={{ opacity: 1, scale: 1, y: 0 }} transition={{ duration: 0.8, ease, delay: 1.55 }}>
              <span className="lx-coach-ico"><Sparkles /></span>
              <div><small>AI Coach</small><b>Your stops average 38 pips, inside the 50-pip rule.</b></div>
            </motion.div>
          </motion.div>
        </motion.div>
      </div>
      <p className="mx-auto mt-6 max-w-[1180px] px-4 text-center text-xs text-ink-3">Illustrative product preview. Prices, zones and account figures are examples, not live market or account data.</p>
    </section>
  );
}
