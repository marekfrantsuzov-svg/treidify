"use client";

import { motion, useReducedMotion, useScroll, useTransform } from "motion/react";
import { ArrowRight } from "lucide-react";
import { useRef } from "react";
import { ButtonLink } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import { DashboardPreview } from "@/components/previews/dashboard-preview";

export function Hero() {
  const ref = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end start"] });
  const rotateX = useTransform(scrollYProgress, [0, 0.5], [reduce ? 0 : 14, 0]);
  const scale = useTransform(scrollYProgress, [0, 0.5], [reduce ? 1 : 0.94, 1]);

  return (
    <section ref={ref} className="relative overflow-hidden pb-16 pt-14 sm:pt-20">
      <Container className="text-center">
        <div className="rise">
          <span className="glass inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-[13px] text-ink-2">
            <span className="h-1.5 w-1.5 rounded-full bg-accent shadow-[0_0_10px_var(--accent)]" />
            Account health, markets, news and AI in one place
          </span>
        </div>
        <h1
          style={{ "--d": "0.06s" } as React.CSSProperties}
          className="rise text-gradient mx-auto mt-7 max-w-5xl text-[2.6rem] font-semibold leading-[1.02] tracking-[-0.045em] sm:text-7xl lg:text-[5.5rem]"
        >
          Your Trading
          <br />
          <span className="text-accent-gradient">Intelligence.</span>
        </h1>
        <p
          style={{ "--d": "0.12s" } as React.CSSProperties}
          className="rise mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-ink-2 sm:text-xl"
        >
          Understand your performance. Analyze global markets. Find important price levels. Improve every trading decision with intelligent insights.
        </p>
        <div style={{ "--d": "0.18s" } as React.CSSProperties} className="rise mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <ButtonLink href="/signup" size="lg">Get Started Free <ArrowRight className="h-4 w-4" /></ButtonLink>
          <ButtonLink href="/features" size="lg" variant="secondary">Explore Features</ButtonLink>
        </div>
        <p style={{ "--d": "0.3s" } as React.CSSProperties} className="rise mt-4 text-sm text-ink-3">
          Free account, no card. 72-hour Premium trial, no automatic billing.
        </p>
      </Container>
      <div className="mt-14 px-3 sm:px-6 [perspective:1600px]">
        <motion.div style={{ rotateX, scale, transformOrigin: "50% 0%", "--d": "0.24s" } as never} className="rise mx-auto max-w-[1240px]">
          <DashboardPreview />
        </motion.div>
        <p className="mx-auto mt-4 max-w-[1240px] text-center text-xs text-ink-3">
          The real Treidify dashboard, shown with generated sample data. Every value marked “Illustrative” or “Sample” is not live.
        </p>
      </div>
    </section>
  );
}
