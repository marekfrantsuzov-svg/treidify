"use client";

import { motion, useScroll, useSpring, useTransform } from "motion/react";
import { ArrowRight, CalendarCheck, Play, ShieldCheck, TrendingUp } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef } from "react";
import { ButtonLink } from "@/components/ui/button";
import { DesktopMock, PhoneMock } from "../lx/mocks";
import { LightTrails } from "./light-trails";

// Runs before the hero paints: a hero already seen in this tab (reload, back) skips the entrance.
const SEEN = `try{if(sessionStorage.getItem("tdy-hero"))document.documentElement.dataset.heroSeen="1"}catch(e){}`;

/**
 * v5 hero, composed after Marek's landing reference: copy on the left over a blurred night city interior, the product
 * as a large glass tablet in perspective standing on a dark marble plinth on the right.
 * The entrance is CSS keyframes (v5/landing.css) so it starts at first paint: background, navigation, kicker, headline
 * lines, copy, actions, then the tablet arriving in depth. After hydration one scroll value turns the tablet slightly
 * toward the viewer. Only transform and opacity animate; reduced motion turns all of it off.
 */
export function V5Hero() {
  const stage = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: stage, offset: ["start 0.6", "end start"] });
  const p = useSpring(scrollYProgress, { stiffness: 120, damping: 28, mass: 0.4 });
  const rotateY = useTransform(p, [0, 1], [0, 7]);
  const y = useTransform(p, [0, 1], [0, -40]);

  const d = (ms: number) => ({ ["--d" as string]: `${ms}ms` }) as React.CSSProperties;
  // After the entrance has played once, remember it, so client-side back navigation does not replay it either.
  useEffect(() => {
    const t = setTimeout(() => { try { sessionStorage.setItem("tdy-hero", "1"); } catch { /* private mode */ } document.documentElement.dataset.heroSeen = "1"; }, 1400);
    return () => clearTimeout(t);
  }, []);

  return (
    <section className="v5-hero" aria-labelledby="hero-title">
      <script dangerouslySetInnerHTML={{ __html: SEEN }} />
      <LightTrails />
      <div className="v5-hero-inner">
        <div className="v5-copy">
          <p className="v5-kicker v5-in" style={d(120)}>Trading intelligence for gold, the dollar and your own account</p>
          <h1 id="hero-title" className="v5-title">
            <span className="v5-line"><span className="v5-in-line" style={d(150)}>Know where</span></span>{" "}
            <span className="v5-line"><span className="v5-in-line" style={d(230)}>gold reacts.</span></span>{" "}
            <span className="v5-line v5-title-dim"><span className="v5-in-line" style={d(310)}>Understand why</span></span>{" "}
            <span className="v5-line v5-title-dim"><span className="v5-in-line" style={d(370)}>it moves.</span></span>
          </h1>
          <p className="v5-lead v5-in" style={d(350)}>
            Explore market structure, supply and demand zones, macro events and your own MT5 trading performance in one intelligent workspace.
          </p>
          <div className="v5-actions v5-in" style={d(500)}>
            <ButtonLink href="/signup" size="lg" className="ed-cta v5-cta">Start 3-day trial <ArrowRight className="h-5 w-5" /></ButtonLink>
            <Link href="#product" className="v5-play"><span className="v5-play-dot" aria-hidden><Play /></span>See the product</Link>
          </div>
          <ul className="v5-trust v5-in" style={d(560)}>
            <li><CalendarCheck aria-hidden />3-day trial</li>
            <li aria-hidden className="v5-sep">/</li>
            <li><ShieldCheck aria-hidden />Cancel anytime</li>
            <li aria-hidden className="v5-sep">/</li>
            <li><TrendingUp aria-hidden />MT5 read-only</li>
          </ul>
        </div>

        <div ref={stage} className="v5-stage" role="img" aria-label="Illustrative Treidify dashboard on a tablet">
          <div className="v5-in-stage">
            <motion.div className="v5-tilt" style={{ rotateY, y }}>
              <div className="v5-tablet">
                <div className="v5-screen"><DesktopMock /></div>
              </div>
              <div className="v5-tablet-shadow" aria-hidden />
            </motion.div>
            <div className="v5-phone-only"><PhoneMock /></div>
          </div>
          <div className="v5-plinth" aria-hidden />
        </div>
      </div>
      <p className="v5-caption">Illustrative preview with example figures, not live market or account data.</p>
    </section>
  );
}
