"use client";

import { motion } from "motion/react";
import { Activity, ArrowUpRight, Droplets, Hourglass, Layers, Waypoints } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Container } from "@/components/ui/container";
import { Reveal } from "@/components/ui/reveal";
import { cn } from "@/lib/cn";
import { SCENES, TFS, type Tf } from "./data";
import { GoldChart, type Layers as ChartLayers } from "./gold-chart";
import { Illustrative } from "./primitives";

export function LxHead({ eyebrow, title, lead, align = "left", id }: { eyebrow: string; title: React.ReactNode; lead?: React.ReactNode; align?: "left" | "center"; id?: string }) {
  return (
    <Reveal className={cn("max-w-3xl", align === "center" && "mx-auto text-center")}>
      <p className="lx-eyebrow">{eyebrow}</p>
      <h2 id={id} className="lx-h2 mt-4">{title}</h2>
      {lead && <p className="lx-sub mt-5 sm:text-lg">{lead}</p>}
    </Reveal>
  );
}

const STEPS: { tf: Tf; title: string; body: string }[] = [
  { tf: "4H", title: "Start with the big picture.", body: "The 4H shows who is in control. Treidify marks the major demand and supply, the Fibonacci retracement of the last leg, and where liquidity is resting." },
  { tf: "1H", title: "Find the zone that matters.", body: "The 1H narrows it down to the zone price is most likely to react from, with equal highs and lows marked as liquidity targets." },
  { tf: "15M", title: "Time the entry, or wait.", body: "The 15M shows the pullback in detail. A setup only appears after a 5M change of character, and only if the structural stop fits inside 50 pips." },
];

/** Section B: sticky chart on desktop that follows the timeframe story; tabs and layer toggles are interactive. */
export function AnalysisSection() {
  const [tf, setTf] = useState<Tf>("4H");
  const [layers, setLayers] = useState<ChartLayers>({ zones: true, fib: true, liquidity: true });
  const stepRefs = useRef<(HTMLLIElement | null)[]>([]);

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px)");
    if (!mq.matches) return;
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) if (e.isIntersecting) setTf((e.target as HTMLElement).dataset.tf as Tf);
      },
      { rootMargin: "-45% 0px -45% 0px" },
    );
    stepRefs.current.forEach((el) => el && io.observe(el));
    return () => io.disconnect();
  }, []);

  const scene = SCENES[tf];
  const toggle = (k: keyof ChartLayers) => setLayers((l) => ({ ...l, [k]: !l[k] }));
  const LAYER_BTNS: { k: keyof ChartLayers; label: string; icon: React.ElementType }[] = [
    { k: "zones", label: "Zones", icon: Layers },
    { k: "fib", label: "Fibonacci", icon: Waypoints },
    { k: "liquidity", label: "Liquidity", icon: Droplets },
  ];

  return (
    <section id="analysis" className="lx-section lx-analysis" aria-labelledby="analysis-title">
      <Container>
        <LxHead
          id="analysis-title"
          eyebrow="Advanced market analysis"
          title={<>Analysis that changes <span className="lx-grad-text">with the timeframe.</span></>}
          lead="Zones, Fibonacci and liquidity are computed separately for 15M, 1H and 4H. Switch the timeframe and the whole read changes with it, just as it does in the app."
        />
        <div className="lx-story mt-12 sm:mt-16">
          <div className="lx-story-stick">
            <motion.div className="lx-tile lx-story-card" initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-60px" }} transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}>
              <div className="lx-story-top">
                <span className="inline-flex items-center gap-2 font-semibold text-ink"><span className="lx-gold" />XAUUSD</span>
                <span className="lx-tabs lx-tabs-lg" role="tablist" aria-label="Timeframe">
                  {TFS.map((t) => (
                    <button key={t} type="button" role="tab" aria-selected={t === tf} className={cn(t === tf && "is-on")} onClick={() => setTf(t)}>{t}</button>
                  ))}
                </span>
              </div>
              <div className="lx-layers" role="group" aria-label="Chart layers">
                {LAYER_BTNS.map(({ k, label, icon: I }) => (
                  <button key={k} type="button" aria-pressed={layers[k]} onClick={() => toggle(k)} className={cn("lx-layer", layers[k] && "is-on")}><I className="h-3.5 w-3.5" />{label}</button>
                ))}
                <Illustrative className="ml-auto" />
              </div>
              <GoldChart key={tf} scene={scene} layers={layers} className="lx-story-chart" />
              <div className="lx-story-foot" key={`f-${tf}`}>
                <span className={cn("lx-status", scene.setup.eligible ? "is-await" : "is-wait")}><Hourglass />{scene.setup.status}</span>
                <span className="lx-story-meta"><small>{scene.setup.zone}</small><b className={cn("num", !scene.setup.eligible && "is-down")}>Structural stop {scene.setup.text}</b></span>
                <span className={cn("lx-trend", scene.structure === "Bullish" ? "is-up" : "is-down")}>{tf} · {scene.structure.toUpperCase()}</span>
              </div>
            </motion.div>
          </div>
          <ol className="lx-steps">
            {STEPS.map((s, i) => (
              <li key={s.tf} ref={(el) => { stepRefs.current[i] = el; }} data-tf={s.tf} className={cn("lx-step", s.tf === tf && "is-active")}>
                <button type="button" onClick={() => setTf(s.tf)} className="lx-step-btn" aria-pressed={s.tf === tf}>
                  <span className="lx-step-tf">{s.tf}</span>
                  <span className="block">
                    <span className="lx-step-title">{s.title}</span>
                    <span className="lx-step-body">{s.body}</span>
                    <span className="lx-step-read"><Activity className="h-4 w-4" />{SCENES[s.tf].read}</span>
                  </span>
                </button>
              </li>
            ))}
            <li className="lx-step-note">
              <ArrowUpRight className="h-4 w-4" />
              <span>The 50-pip rule is enforced in the engine: on the 4H above, the stop would need {SCENES["4H"].setup.pips} pips, so the answer is WAIT. Gold: 1 pip = $0.10, so 50 pips = $5.00 of price movement.</span>
            </li>
          </ol>
        </div>
      </Container>
    </section>
  );
}
