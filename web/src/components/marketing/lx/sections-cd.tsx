"use client";

import { AnimatePresence, motion, useInView, useReducedMotion } from "motion/react";
import { BookOpen, Sparkles } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Container } from "@/components/ui/container";
import { Reveal } from "@/components/ui/reveal";
import { cn } from "@/lib/cn";
import { EQUITY, JOURNAL_MONTH } from "./data";
import { LxHead } from "./sections-ab";
import { EquityLine, Illustrative } from "./primitives";

const money = (n: number) => `${n < 0 ? "−" : "+"}$${Math.abs(n).toLocaleString("en-US")}`;

/** Section C: P&L calendar, equity curve, statistics and a journal insight. All figures derive from one example month. */
export function JournalSection() {
  const traded = JOURNAL_MONTH.filter((d) => d.pnl !== null) as { day: number; pnl: number; trades: number }[];
  const wins = traded.filter((d) => d.pnl > 0);
  const losses = traded.filter((d) => d.pnl < 0);
  const net = traded.reduce((a, d) => a + d.pnl, 0);
  const gross = wins.reduce((a, d) => a + d.pnl, 0);
  const lost = Math.abs(losses.reduce((a, d) => a + d.pnl, 0));
  const pf = lost ? gross / lost : 0;
  const maxAbs = Math.max(...traded.map((d) => Math.abs(d.pnl)));
  const best = traded.reduce((a, d) => (d.pnl > a.pnl ? d : a), traded[0]!);
  const avgTrades = (xs: { trades: number }[]) => xs.reduce((a, d) => a + d.trades, 0) / (xs.length || 1);
  const lossTrades = avgTrades(losses);
  const winTrades = avgTrades(wins);
  const offset = 5; // the example month starts on a Saturday; the grid starts on Monday
  const [sel, setSel] = useState<number | null>(null);
  const selDay = sel === null ? null : JOURNAL_MONTH[sel - 1];

  return (
    <section id="journal" className="lx-section" aria-labelledby="journal-title">
      <Container>
        <div className="lx-split">
          <LxHead
            id="journal-title"
            eyebrow="Intelligent trading journal"
            title={<>Every trading day, <span className="lx-grad-text">accounted for.</span></>}
            lead="Your MT5 history becomes a P&L calendar, an equity curve and the statistics that matter. Add notes and tags, and the journal finds the patterns behind your best and worst days."
          />
          <Reveal delay={0.05} className="lx-journal-stats">
            {[
              { k: "Net P&L", v: money(net), cls: net >= 0 ? "is-up" : "is-down" },
              { k: "Win rate", v: `${Math.round((wins.length / traded.length) * 100)}%` },
              { k: "Profit factor", v: pf.toFixed(2) },
              { k: "Best day", v: money(best.pnl), cls: "is-up" },
            ].map((s) => (
              <div key={s.k} className="lx-stat"><small>{s.k}</small><b className={cn("num", s.cls)}>{s.v}</b></div>
            ))}
          </Reveal>
        </div>

        <div className="lx-journal mt-10 sm:mt-14">
          <Reveal className="lx-tile lx-cal-tile">
            <div className="lx-tile-head"><span>P&amp;L calendar · example month</span><Illustrative /></div>
            <div className="lx-cal" role="grid" aria-label="Example P&L calendar">
              {["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"].map((d) => <span key={d} className="lx-cal-dow" role="columnheader">{d}</span>)}
              {Array.from({ length: offset }, (_, i) => <span key={`e${i}`} aria-hidden />)}
              {JOURNAL_MONTH.map((d, i) => {
                const tone = d.pnl === null ? "" : d.pnl >= 0 ? "is-win" : "is-loss";
                const a = d.pnl === null ? 0 : 0.18 + (Math.abs(d.pnl) / maxAbs) * 0.62;
                return (
                  <motion.button
                    type="button"
                    key={d.day}
                    role="gridcell"
                    aria-label={d.pnl === null ? `Day ${d.day}: no trades` : `Day ${d.day}: ${money(d.pnl)}, ${d.trades} trades`}
                    onClick={() => setSel(d.pnl === null ? null : d.day)}
                    className={cn("lx-day", tone, sel === d.day && "is-sel")}
                    style={{ ["--a" as string]: a }}
                    initial={{ opacity: 0, scale: 0.8 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.4, delay: 0.1 + i * 0.018 }}
                  >
                    <span className="lx-day-n">{d.day}</span>
                    {d.pnl !== null && <span className="lx-day-v num">{money(d.pnl)}</span>}
                  </motion.button>
                );
              })}
            </div>
            <p className="lx-tile-foot" aria-live="polite">
              {selDay && selDay.pnl !== null ? <>Day {selDay.day}: <b className={selDay.pnl >= 0 ? "is-up" : "is-down"}>{money(selDay.pnl)}</b> across {selDay.trades} trade{selDay.trades > 1 ? "s" : ""}. In the app this opens the trades and your notes.</> : "Tap a day to see its trades. Green days are profitable, red days are losses, the deeper the colour the bigger the move."}
            </p>
          </Reveal>
          <div className="lx-journal-side">
            <Reveal delay={0.08} className="lx-tile">
              <div className="lx-tile-head"><span>Equity curve</span><Illustrative /></div>
              <div className="lx-eq-big"><EquityLine values={EQUITY} /></div>
            </Reveal>
            <Reveal delay={0.14} className="lx-tile lx-tile-glow">
              <div className="lx-tile-head"><span className="inline-flex items-center gap-2"><BookOpen className="h-4 w-4 text-accent" />Journal insight</span><Illustrative /></div>
              <p className="mt-3 text-[16px] font-medium leading-snug text-ink">
                {lossTrades > winTrades ? "You trade more on the days you lose." : "Your losing days are not overtrading days."}
              </p>
              <p className="mt-2 text-[14px] leading-relaxed text-ink-2">In this example month, losing days averaged {lossTrades.toFixed(1)} trades and winning days {winTrades.toFixed(1)}. Treidify finds patterns like this in your own history and notes.</p>
            </Reveal>
          </div>
        </div>
      </Container>
    </section>
  );
}

const COACH = [
  { tone: "warn", title: "Revenge trading after a loss", body: "After a losing trade you re-entered within 10 minutes on 6 occasions. 5 of those also lost. Consider a 30-minute pause rule." },
  { tone: "good", title: "Risk management is on point", body: "Your structural stops average 38 pips ($3.80) and none exceeded the 50-pip limit. Position size stayed within 1% risk on 40 of 42 trades." },
  { tone: "info", title: "London is your best session", body: "62% win rate and a 1.9 profit factor in London, against 41% in the New York afternoon. Your edge is strongest before 12:00 UTC." },
];

const SESSIONS = [
  { k: "Asia", v: 0.42, pf: "0.9" },
  { k: "London", v: 0.62, pf: "1.9" },
  { k: "New York AM", v: 0.55, pf: "1.4" },
  { k: "New York PM", v: 0.41, pf: "0.8" },
];

const STOPS = [12, 18, 22, 26, 28, 31, 33, 35, 36, 38, 38, 40, 41, 43, 44, 46, 47, 49];

/** Section D: the AI coach as a conversation that plays in, beside the evidence it is built on. */
export function CoachSection() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-120px" });
  const reduce = useReducedMotion();
  const [shown, setShown] = useState(0);
  useEffect(() => {
    if (!inView) return;
    if (reduce) { setShown(COACH.length); return; }
    let n = 0;
    const t = window.setInterval(() => { n += 1; setShown(n); if (n >= COACH.length) window.clearInterval(t); }, 1100);
    return () => window.clearInterval(t);
  }, [inView, reduce]);

  return (
    <section id="coach" className="lx-section" aria-labelledby="coach-title">
      <Container>
        <div className="lx-coach">
          <div className="lx-coach-glow" aria-hidden />
          <div className="lx-coach-grid">
            <div>
              <LxHead
                id="coach-title"
                eyebrow="AI trading coach"
                title={<>A coach that has read <span className="lx-grad-text">every trade you took.</span></>}
                lead="Weekly reviews built on measurable patterns in your own MT5 history: the mistakes that cost you, the risk habits that protect you, and the sessions where your edge is real. Every insight shows its evidence."
              />
              <div className="lx-coach-evidence mt-8">
                <Reveal className="lx-tile">
                  <div className="lx-tile-head"><span>Win rate by session</span><Illustrative /></div>
                  <ul className="lx-bars mt-3">
                    {SESSIONS.map((s, i) => (
                      <li key={s.k}>
                        <span>{s.k}</span>
                        <b className="num">{Math.round(s.v * 100)}%</b>
                        <i><motion.em className={s.v >= 0.5 ? "is-good" : "is-bad"} initial={{ scaleX: 0 }} whileInView={{ scaleX: s.v }} viewport={{ once: true }} transition={{ duration: 1, delay: 0.1 + i * 0.08, ease: [0.22, 1, 0.36, 1] }} /></i>
                      </li>
                    ))}
                  </ul>
                </Reveal>
                <Reveal className="lx-tile" delay={0.08}>
                  <div className="lx-tile-head"><span>Stop size, last 18 trades</span><Illustrative /></div>
                  <div className="lx-stops mt-3" aria-label="Every stop was under the 50-pip limit">
                    {STOPS.map((p, i) => (
                      <motion.i key={i} style={{ height: `${(p / 56) * 100}%` }} initial={{ scaleY: 0 }} whileInView={{ scaleY: 1 }} viewport={{ once: true }} transition={{ duration: 0.6, delay: i * 0.03 }} />
                    ))}
                    <span className="lx-stops-limit" style={{ bottom: `${(50 / 56) * 100}%` }}>50-pip limit</span>
                  </div>
                </Reveal>
              </div>
            </div>
            <div ref={ref} className="lx-chat" aria-live="polite">
              <div className="lx-chat-head">
                <span className="lx-coach-ico"><Sparkles /></span>
                <div><b>Treidify Coach</b><small>Weekly review · example</small></div>
                <Illustrative className="ml-auto" />
              </div>
              <div className="lx-chat-body">
                {COACH.slice(0, shown).map((m) => (
                  <motion.div key={m.title} className={cn("lx-msg", `is-${m.tone}`)} initial={{ opacity: 0, y: 14, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}>
                    <b>{m.title}</b>
                    <p>{m.body}</p>
                  </motion.div>
                ))}
                <AnimatePresence>
                  {shown < COACH.length && inView && (
                    <motion.span className="lx-typing" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} aria-label="Coach is writing"><i /><i /><i /></motion.span>
                  )}
                </AnimatePresence>
              </div>
              <p className="lx-chat-foot">AI explains patterns found in your data. It does not give financial advice or place trades.</p>
            </div>
          </div>
        </div>
      </Container>
    </section>
  );
}
