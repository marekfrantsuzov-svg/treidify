"use client";

import { motion } from "motion/react";
import { useEffect, useState } from "react";
import { Container } from "@/components/ui/container";
import { Reveal } from "@/components/ui/reveal";
import { cn } from "@/lib/cn";
import { LxHead } from "./sections-ab";
import { Illustrative } from "./primitives";

/** Approximate session hours in UTC (they shift by an hour with daylight saving). */
const SESSIONS = [
  { k: "Sydney", from: 21, to: 6 },
  { k: "Tokyo", from: 0, to: 9 },
  { k: "London", from: 7, to: 16 },
  { k: "New York", from: 12, to: 21 },
];
const isOpen = (s: { from: number; to: number }, h: number) => (s.from < s.to ? h >= s.from && h < s.to : h >= s.from || h < s.to);

const MARKETS = [
  { sym: "XAUUSD", name: "Gold", price: "4,118.40", trend: "BULLISH (4H)", up: true, note: "Gold usually moves against the dollar. With DXY structure bearish, the macro backdrop supports buyers." },
  { sym: "DXY", name: "US Dollar Index", price: "98.74", trend: "BEARISH (4H)", up: false, note: "Treidify computes DXY from its six component currencies, so the dollar read is always available beside gold." },
  { sym: "XAGUSD", name: "Silver", price: "48.62", trend: "BULLISH (1H)", up: true, note: "Silver confirming gold's direction strengthens the read; divergence between the two is flagged as a warning." },
];

const EVENTS = [
  { k: "US CPI", impact: "High", why: "Hotter inflation lifts rate expectations and the dollar, which usually weighs on gold. Treidify widens the event-risk window around it." },
  { k: "FOMC rate decision", impact: "High", why: "The single biggest scheduled driver of the dollar and gold. Setups near the release are marked as event risk." },
  { k: "Non-farm payrolls", impact: "High", why: "Jobs data moves rate expectations quickly. Gold often spikes both ways in the first minutes." },
  { k: "ECB press conference", impact: "Medium", why: "Moves EURUSD, which is the largest weight in the dollar index, and so feeds into DXY." },
];

/** Section E: markets, sessions (live from the visitor's clock) and event risk, as an interactive desk. */
export function MacroSection() {
  const [hour, setHour] = useState<number | null>(null);
  const [mk, setMk] = useState(0);
  const [ev, setEv] = useState(0);
  useEffect(() => {
    const tick = () => { const d = new Date(); setHour(d.getUTCHours() + d.getUTCMinutes() / 60); };
    tick();
    const t = window.setInterval(tick, 60_000);
    return () => window.clearInterval(t);
  }, []);
  const m = MARKETS[mk]!;
  const e = EVENTS[ev]!;

  return (
    <section id="macro" className="lx-section" aria-labelledby="macro-title">
      <Container>
        <LxHead
          id="macro-title"
          align="center"
          eyebrow="Macro intelligence"
          title={<>The forces behind gold, <span className="lx-grad-text">in one desk.</span></>}
          lead="The dollar, silver, the trading sessions and the events that move them, connected to the gold read instead of scattered across ten tabs."
        />
        <div className="lx-macro mt-12 sm:mt-16">
          <Reveal className="lx-tile lx-macro-markets">
            <div className="lx-tile-head"><span>Markets</span><Illustrative /></div>
            <div className="lx-mk-list mt-3" role="tablist" aria-label="Markets">
              {MARKETS.map((x, i) => (
                <button key={x.sym} type="button" role="tab" aria-selected={i === mk} onClick={() => setMk(i)} className={cn("lx-mk", i === mk && "is-on")}>
                  <span><b>{x.sym}</b><small>{x.name}</small></span>
                  <span className="text-right"><b className="num">{x.price}</b><span className={cn("lx-trend", x.up ? "is-up" : "is-down")}>{x.trend}</span></span>
                </button>
              ))}
            </div>
            <motion.p key={m.sym} className="lx-mk-note" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}>{m.note}</motion.p>
          </Reveal>

          <Reveal delay={0.06} className="lx-tile lx-macro-sessions">
            <div className="lx-tile-head"><span>Trading sessions</span><span className="lx-live">Your clock</span></div>
            <div className="lx-sess mt-4">
              {SESSIONS.map((s) => {
                const open = hour !== null && isOpen(s, Math.floor(hour));
                const segs = s.from < s.to ? [[s.from, s.to]] : [[s.from, 24], [0, s.to]];
                return (
                  <div key={s.k} className={cn("lx-sess-row", open && "is-open")}>
                    <span className="lx-sess-k">{s.k}{open && <em>Open</em>}</span>
                    <span className="lx-sess-track">
                      {segs.map(([a, b]) => <i key={a} style={{ left: `${(a! / 24) * 100}%`, width: `${((b! - a!) / 24) * 100}%` }} />)}
                    </span>
                  </div>
                );
              })}
              {hour !== null && <span className="lx-sess-now" style={{ left: `calc(var(--sess-k) + (100% - var(--sess-k)) * ${hour / 24})` }} aria-hidden />}
              <div className="lx-sess-axis" aria-hidden><span>00</span><span>06</span><span>12</span><span>18</span><span>24 UTC</span></div>
            </div>
            <p className="lx-tile-foot">Session hours are approximate and shift with daylight saving. The marker is the current time on your device.</p>
          </Reveal>

          <Reveal delay={0.1} className="lx-tile lx-macro-events">
            <div className="lx-tile-head"><span>Event risk for gold</span><Illustrative>Example events</Illustrative></div>
            <div className="lx-ev-list mt-3" role="tablist" aria-label="Events">
              {EVENTS.map((x, i) => (
                <button key={x.k} type="button" role="tab" aria-selected={i === ev} onClick={() => setEv(i)} className={cn("lx-ev", i === ev && "is-on")}>
                  <span className={cn("lx-impact", x.impact === "High" ? "is-high" : "is-med")}>{x.impact}</span>
                  <b>{x.k}</b>
                </button>
              ))}
            </div>
            <motion.p key={e.k} className="lx-mk-note" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}><b className="text-ink">Why it matters: </b>{e.why}</motion.p>
          </Reveal>
        </div>
      </Container>
    </section>
  );
}
