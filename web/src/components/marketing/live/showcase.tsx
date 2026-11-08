"use client";

import { motion, useMotionValue, useScroll, useTransform } from "motion/react";
import { BookOpen, CalendarClock, Check, Pause, Play, ShieldCheck, Sparkles, TrendingDown, TrendingUp } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { cn } from "@/lib/cn";
import { ACCOUNT, BEAR, BULL, SCENES, fmt, type SceneId } from "./data";
import { AppFrame, type Layer } from "./views";
import "./showcase.css";

type Slot = "lt" | "lm" | "lb" | "rt" | "rb";
interface Float { id: string; scene: SceneId; slot: Slot; delay: number; depth: number; body: React.ReactNode; beam?: boolean }

/** A neutral MT5 mark. Not the MetaQuotes logo: no licence to use the official icon on our site has been confirmed. */
function Mt5Glyph() {
  return <span className="sx-mt5-glyph" aria-hidden><b>MT5</b></span>;
}

/**
 * Floating glass panels. Each belongs to one scene and points at the part of the app it explains; they arrive a
 * beat after that part animates in the window. All are mounted so they can fade out as smoothly as they fade in.
 */
const FLOATS: Float[] = [
  {
    id: "mt5", scene: "connect", slot: "lb", delay: 150, depth: 1.2, beam: true,
    body: (
      <>
        <Mt5Glyph />
        <span className="sx-fc-txt">
          <small>MetaTrader 5 · read-only</small>
          <span className="sx-swap is-fc">
            <span className="sx-s1">Connecting…</span>
            <span className="sx-s2">Syncing trades</span>
            <span className="sx-s3 is-up"><Check />Account connected</span>
          </span>
        </span>
      </>
    ),
  },
  {
    id: "health", scene: "connect", slot: "rt", delay: 3400, depth: 0.8,
    body: (
      <>
        <span className="sx-fc-ring" aria-hidden><b>{ACCOUNT.health}</b></span>
        <span className="sx-fc-txt"><small>Account Health</small><b>{ACCOUNT.health} / 100 · <em className="is-up">Strong</em></b></span>
      </>
    ),
  },
  {
    id: "bull", scene: "bull", slot: "rt", delay: 2700, depth: 0.9,
    body: (
      <>
        <span className="sx-fc-ic is-up"><TrendingUp /></span>
        <span className="sx-fc-txt"><small>Illustrative example</small><b>XAUUSD — <em className="is-up">BULLISH 4H</em></b></span>
      </>
    ),
  },
  {
    id: "bull-watch", scene: "bull", slot: "lb", delay: 3800, depth: 1.3,
    body: (
      <>
        <span className="sx-fc-ic"><ShieldCheck /></span>
        <span className="sx-fc-txt"><small>Watch for confirmation</small><b>5M change of character in the zone</b><small className="num">Stop {BULL.pips} / 50 pips · {fmt(BULL.zone.lo)} – {fmt(BULL.zone.hi)}</small></span>
      </>
    ),
  },
  {
    id: "bear", scene: "bear", slot: "rt", delay: 2500, depth: 0.9,
    body: (
      <>
        <span className="sx-fc-ic is-down"><TrendingDown /></span>
        <span className="sx-fc-txt"><small>Illustrative example</small><b>XAUUSD — <em className="is-down">BEARISH 1H</em></b></span>
      </>
    ),
  },
  {
    id: "bear-rule", scene: "bear", slot: "lb", delay: 3300, depth: 1.3,
    body: (
      <>
        <span className="sx-fc-ic"><ShieldCheck /></span>
        <span className="sx-fc-txt"><small>50-pip stop rule</small><b className="num">Structural stop {BEAR.pips} / 50 pips</b><small>Over 50 pips the answer is WAIT</small></span>
      </>
    ),
  },
  {
    id: "journal", scene: "journal", slot: "lt", delay: 500, depth: 1.2,
    body: (
      <>
        <span className="sx-fc-ic"><BookOpen /></span>
        <span className="sx-fc-txt"><small>Trading Journal</small><b>6 trades logged automatically</b></span>
      </>
    ),
  },
  {
    id: "winrate", scene: "journal", slot: "rb", delay: 1900, depth: 0.8,
    body: (
      <>
        <span className="sx-fc-ring is-sm" aria-hidden><b>%</b></span>
        <span className="sx-fc-txt"><small>Win rate · Profit factor</small><b className="num">{ACCOUNT.winRate}% · {ACCOUNT.profitFactor}</b></span>
      </>
    ),
  },
  {
    id: "calendar", scene: "macro", slot: "lm", delay: 900, depth: 1.2,
    body: (
      <>
        <span className="sx-fc-ic"><CalendarClock /></span>
        <span className="sx-fc-txt"><small>Economic Calendar</small><b>USD CPI · <em className="is-hi">High impact</em></b></span>
      </>
    ),
  },
  {
    id: "insight", scene: "macro", slot: "rb", delay: 2300, depth: 0.9,
    body: (
      <>
        <span className="sx-fc-ic is-ai"><Sparkles /></span>
        <span className="sx-fc-txt"><small>AI Market Insight · example</small><b>Hot CPI → firmer dollar → pressure on gold</b></span>
      </>
    ),
  },
];

/**
 * The animated product showcase under the hero copy: the Treidify desktop app, drawn in code, plays one connected
 * story (MT5 connects, XAUUSD bullish then bearish analysis, the journal, the Macro Desk and AI) in about 28 seconds
 * and loops with crossfades. Floating glass panels around the window explain each step.
 *
 * Isolation: every figure is illustrative (./data.ts); nothing here reads an account, a broker, a market feed or an
 * AI model. Performance: one timer drives the story; everything else is CSS transforms and opacity, paused when the
 * showcase is off screen or the tab is hidden. Reduced motion: no autoplay, no movement, scenes stay on the buttons.
 */
export function LiveShowcase() {
  const root = useRef<HTMLDivElement>(null);
  const [idx, setIdx] = useState(0);
  const [gen, setGen] = useState(0);
  const [prev, setPrev] = useState<Layer | null>(null);
  const [inView, setInView] = useState(false);
  const [started, setStarted] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [userPaused, setUserPaused] = useState(false);
  const [reduce, setReduce] = useState(false);
  const remaining = useRef<number>(SCENES[0].ms);
  const version = useRef(0); // bumped on every scene change, so a stopped timer only books time against its own scene
  const bar = useRef<HTMLDivElement>(null);
  const seenAtLoad = useRef<boolean | null>(null); // was the showcase on screen at the first visibility check?

  const scene = SCENES[idx]!;
  // Generation at which each scene last started, so a panel keeps its content while it fades out.
  const sceneGen = useRef<Partial<Record<SceneId, number>>>({});
  sceneGen.current[scene.id] = gen;
  const cur: Layer = { id: scene.id, key: `${scene.id}-${gen}` };
  const playing = started && inView && !hidden && !userPaused && !reduce;

  // Reduced motion and page visibility.
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const onMq = () => setReduce(mq.matches);
    const onVis = () => setHidden(document.visibilityState === "hidden");
    onMq(); onVis();
    mq.addEventListener("change", onMq);
    document.addEventListener("visibilitychange", onVis);
    return () => { mq.removeEventListener("change", onMq); document.removeEventListener("visibilitychange", onVis); };
  }, []);

  // On screen? The story starts the first time it is seen, from the beginning.
  useEffect(() => {
    const el = root.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => { if (seenAtLoad.current === null) seenAtLoad.current = !!e?.isIntersecting; setInView(!!e?.isIntersecting); }, { threshold: 0.12 });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  // Already on screen when the page opens: the server-rendered first scene is the beginning, so it keeps playing
  // instead of being rebuilt (rebuilding it right after load cost a second full render and delayed the largest paint).
  useEffect(() => {
    if (inView && !started) {
      setStarted(true);
      if (!seenAtLoad.current) { setGen((g) => g + 1); version.current++; remaining.current = SCENES[0].ms; }
    }
  }, [inView, started]);

  const go = useCallback((next: number) => {
    setPrev({ id: SCENES[idx]!.id, key: `${SCENES[idx]!.id}-${gen}` });
    setIdx(next);
    setGen((g) => g + 1);
    version.current++;
    remaining.current = SCENES[next]!.ms;
  }, [idx, gen]);

  // One timer drives the story; it keeps its place while paused.
  useEffect(() => {
    if (!playing) return;
    const t0 = performance.now();
    const v = version.current;
    const t = window.setTimeout(() => go((idx + 1) % SCENES.length), remaining.current);
    return () => {
      window.clearTimeout(t);
      if (version.current === v) remaining.current = Math.max(0, remaining.current - (performance.now() - t0));
    };
  }, [playing, idx, gen, go]);

  // Keep the active step visible in the scrollable step bar on phones (scrolls the bar only, never the page).
  useEffect(() => {
    const el = bar.current;
    const btn = el?.children[idx] as HTMLElement | undefined;
    if (!el || !btn || el.scrollWidth <= el.clientWidth) return;
    el.scrollTo({ left: btn.offsetLeft - (el.clientWidth - btn.offsetWidth) / 2, behavior: reduce ? "auto" : "smooth" });
  }, [idx, reduce]);

  // The leaving view is dropped once its fade has finished.
  useEffect(() => {
    if (!prev) return;
    const t = window.setTimeout(() => setPrev(null), 900);
    return () => window.clearTimeout(t);
  }, [prev]);

  // Depth: the window settles flat as the page scrolls, panels drift at their own depth.
  const { scrollY } = useScroll();
  const amp = useMotionValue(1);
  useEffect(() => { amp.set(reduce ? 0 : 1); }, [reduce, amp]);
  const tilt = useTransform(() => amp.get() * Math.max(0, 6 - scrollY.get() / 70));
  const lift = useTransform(() => amp.get() * -Math.min(60, scrollY.get() / 12));

  // Pointer parallax on devices with a fine pointer, one write per frame.
  const raf = useRef(0);
  const onMove = (e: React.PointerEvent) => {
    if (reduce || e.pointerType !== "mouse") return;
    const el = root.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const px = ((e.clientX - r.left) / r.width - 0.5) * 2;
    const py = ((e.clientY - r.top) / r.height - 0.5) * 2;
    cancelAnimationFrame(raf.current);
    raf.current = requestAnimationFrame(() => { el.style.setProperty("--px", px.toFixed(3)); el.style.setProperty("--py", py.toFixed(3)); });
  };
  const onLeave = () => { const el = root.current; if (el) { el.style.setProperty("--px", "0"); el.style.setProperty("--py", "0"); } };

  return (
    <div
      ref={root}
      className="sx-root"
      data-scene={scene.id}
      data-paused={playing ? undefined : ""}
      data-reduce={reduce ? "" : undefined}
      onPointerMove={onMove}
      onPointerLeave={onLeave}
      role="group"
      aria-roledescription="product demonstration"
      aria-label="Illustrative Treidify product demonstration"
    >
      <p className="sr-only">
        An illustrative walk-through of the Treidify web app with example figures: a MetaTrader 5 account connects and its
        statistics fill the dashboard, an example XAUUSD chart shows a bullish 4H and a bearish 1H structure with zones and
        what to watch for confirmation, the journal fills with trades, and the Macro Desk shows example US events, an AI
        insight and the AI Coach. None of it is live market or account data.
      </p>
      <div className="sx-stage" aria-hidden>
        <div className="sx-aura" />
        <motion.div className="sx-tilt" style={{ rotateX: tilt, y: lift }}>
          <div className="sx-window">
            <div className="sx-cam">
              <AppFrame cur={cur} prev={prev} nav={scene.nav} reduce={reduce} />
            </div>
          </div>
        </motion.div>
        <div className="sx-floats">
          {FLOATS.map((f) => {
            const on = started && f.scene === scene.id;
            return (
              <div key={f.id} className={cn("sx-fc-pos", `is-${f.slot}`)} style={{ ["--z" as string]: f.depth }}>
                <div className="sx-fc-on" data-on={on ? "" : undefined} style={{ ["--in" as string]: `${f.delay}ms` }}>
                  <div className={cn("sx-fc", f.beam && "has-beam")} key={`${f.id}-${sceneGen.current[f.scene] ?? 0}`}>
                    {f.body}
                    {f.beam && <span className="sx-beam"><i /></span>}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="sx-controls">
        <div ref={bar} className="sx-tabs-bar" role="group" aria-label="Demonstration steps">
          {SCENES.map((s, i) => (
            <button key={s.id} type="button" className={cn("sx-step", i === idx && "is-on")} aria-pressed={i === idx} onClick={() => go(i)}>
              <span>{s.label}</span>
              <i className="sx-prog" aria-hidden><i key={i === idx ? `p${gen}` : "p"} style={{ ["--ms" as string]: `${s.ms}ms` }} /></i>
            </button>
          ))}
        </div>
        <button type="button" className="sx-pause" onClick={() => setUserPaused((p) => !p)} aria-label={userPaused ? "Play the demonstration" : "Pause the demonstration"}>
          {userPaused ? <Play /> : <Pause />}
        </button>
      </div>
    </div>
  );
}
