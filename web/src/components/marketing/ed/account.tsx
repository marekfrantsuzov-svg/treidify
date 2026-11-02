"use client";

import { motion } from "motion/react";
import { Container } from "@/components/ui/container";
import { Reveal } from "@/components/ui/reveal";
import { cn } from "@/lib/cn";
import { EQUITY } from "../lx/data";
import { EquityLine, Illustrative } from "../lx/primitives";

/* One illustrative account, the same one the hero preview shows. */
const SCORE = 82;
const FACTORS = [
  { k: "Risk discipline", v: 88 },
  { k: "Consistency", v: 79 },
  { k: "Drawdown control", v: 84 },
  { k: "Win and loss balance", v: 71 },
];
const STATS = [
  { k: "Balance", v: "$24,860.40" },
  { k: "Net P&L, 30 days", v: "+$1,284.60", tone: "up" },
  { k: "Win rate", v: "58.2%" },
  { k: "Profit factor", v: "1.64" },
];
const POINTS = [
  { t: "One score, with its reasons", b: "Account Health weighs risk per trade, stop discipline, drawdown and consistency, and shows each factor." },
  { t: "Computed from your trades", b: "Every figure comes from your synced MT5 history. With no account connected, the dashboard says so instead of guessing." },
  { t: "Any period you choose", b: "Today, this week, 30 days or a custom range. The numbers and the calendar follow the same period." },
];

/** Scene three: account intelligence. Text on the left, one dominant figure on the right, detail beneath it. */
export function EdAccount() {
  return (
    <section id="product" className="ed-section" aria-labelledby="account-title">
      <Container>
        <div className="ed-split">
          <Reveal className="ed-split-text">
            <p className="ed-kicker">Account intelligence</p>
            <h2 id="account-title" className="ts-h2 ed-head-title">Your account, read the way a risk manager would.</h2>
            <ul className="ed-points">
              {POINTS.map((p) => (
                <li key={p.t}><b>{p.t}</b><span>{p.b}</span></li>
              ))}
            </ul>
          </Reveal>

          <Reveal delay={0.08} className="ed-panel ed-health">
            <div className="ed-panel-head">
              <span>Account health</span>
              <Illustrative />
            </div>
            <div className="ed-health-main">
              <p className="ed-health-score num" aria-label={`Health score ${SCORE} out of 100`}>
                {SCORE}<span>/100</span>
              </p>
              <p className="ed-health-grade"><b>Strong</b> · up 6 points this month</p>
              <span className="ed-meter" aria-hidden>
                <motion.i initial={{ scaleX: 0 }} whileInView={{ scaleX: SCORE / 100 }} viewport={{ once: true }} transition={{ duration: 0.9, ease: [0.2, 0, 0, 1], delay: 0.2 }} />
              </span>
            </div>
            <ul className="ed-factors">
              {FACTORS.map((f) => (
                <li key={f.k}><span>{f.k}</span><b className="num">{f.v}</b></li>
              ))}
            </ul>
            <dl className="ed-stats">
              {STATS.map((s) => (
                <div key={s.k}>
                  <dt>{s.k}</dt>
                  <dd className={cn("num", s.tone === "up" && "is-up")}>{s.v}</dd>
                </div>
              ))}
            </dl>
            <div className="ed-equity">
              <span className="ed-equity-label">Equity, 30 days</span>
              <EquityLine values={EQUITY} stroke="var(--up)" />
            </div>
          </Reveal>
        </div>
      </Container>
    </section>
  );
}
