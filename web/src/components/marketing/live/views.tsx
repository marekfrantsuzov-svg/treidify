"use client";

import {
  Bell, BookOpen, CalendarDays, ChartCandlestick, ChartLine, Check, Crown, Eye, Globe, Hourglass, House, Link2, Percent, Scale, Search, Sparkles, Users, Wallet,
} from "lucide-react";
import Image from "next/image";
import { useEffect, useId, useState } from "react";
import { cn } from "@/lib/cn";
import { ScenarioChart } from "./chart";
import { ACCOUNT, BEAR, BULL, COACH, EQUITY, EVENTS, INSIGHT, JOURNAL_MONTH, TRADES, fmt, type Scenario, type SceneId } from "./data";

export const NAV = [
  { icon: House, label: "Dashboard" },
  { icon: ChartCandlestick, label: "Markets" },
  { icon: ChartLine, label: "Analysis" },
  { icon: Globe, label: "Macro Desk" },
  { icon: CalendarDays, label: "Economic Calendar" },
  { icon: Link2, label: "Account (MT5)" },
  { icon: BookOpen, label: "Journal" },
  { icon: Sparkles, label: "AI Coach" },
  { icon: Users, label: "Community" },
];

const TITLES: Record<SceneId, [string, string]> = {
  connect: ["Good morning, Trader", "London session is open. Here is your trading overview."],
  bull: ["XAUUSD analysis", "Structure, zones and what to watch on the selected timeframe."],
  bear: ["XAUUSD analysis", "Structure, zones and what to watch on the selected timeframe."],
  journal: ["Trading journal", "Every synced trade, your equity curve and your trading days."],
  macro: ["Macro Desk", "The events that can move gold this week, read for you."],
};

/** Counts to `to` once, `delay` ms after the scene starts. Shows the final value at once under reduced motion. */
function useCount(to: number, delay: number, dur: number, reduce: boolean) {
  const [v, setV] = useState<number | null>(reduce ? to : null);
  useEffect(() => {
    if (reduce) { setV(to); return; }
    setV(null);
    let raf = 0;
    const t = window.setTimeout(() => {
      const t0 = performance.now();
      const tick = (now: number) => {
        const p = Math.min(1, (now - t0) / dur);
        setV(to * (1 - Math.pow(1 - p, 3)));
        if (p < 1) raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
    }, delay);
    return () => { window.clearTimeout(t); cancelAnimationFrame(raf); };
  }, [to, delay, dur, reduce]);
  return v;
}

function Num({ to, delay = 0, dur = 1200, dp = 2, pre = "", suf = "", sign, reduce, className }: { to: number; delay?: number; dur?: number; dp?: number; pre?: string; suf?: string; sign?: boolean; reduce: boolean; className?: string }) {
  const v = useCount(to, delay, dur, reduce);
  if (v === null) return <span className={cn("num sx-dash", className)}>—</span>;
  const s = Math.abs(v).toLocaleString("en-US", { minimumFractionDigits: dp, maximumFractionDigits: dp });
  return <span className={cn("num", className)}>{sign ? (v < 0 ? "−" : "+") : ""}{pre}{s}{suf}</span>;
}

function Ring({ value, delay, reduce }: { value: number; delay: number; reduce: boolean }) {
  const id = useId();
  const r = 42;
  const c = 2 * Math.PI * r;
  return (
    <span className="sx-ring" style={{ ["--d" as string]: `${delay}ms` }}>
      <svg viewBox="0 0 100 100" aria-hidden>
        <defs>
          <linearGradient id={`sxr${id}`} x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#a85af5" /><stop offset="1" stopColor="#eb76fa" /></linearGradient>
        </defs>
        <circle cx="50" cy="50" r={r} className="sx-ring-track" />
        <circle cx="50" cy="50" r={r} className="sx-ring-bar" stroke={`url(#sxr${id})`} strokeDasharray={c} style={{ ["--off" as string]: c * (1 - value / 100), ["--len" as string]: c }} />
      </svg>
      <span className="sx-ring-num"><Num to={value} dp={0} delay={delay} dur={1300} reduce={reduce} /><small>/100</small></span>
    </span>
  );
}

function Card({ className, children, style }: { className?: string; children: React.ReactNode; style?: React.CSSProperties }) {
  return <div className={cn("sx-card", className)} style={style}>{children}</div>;
}

function CardTitle({ icon: I, children, extra }: { icon: React.ComponentType<{ className?: string }>; children: React.ReactNode; extra?: React.ReactNode }) {
  return <div className="sx-card-t"><I className="sx-ic" /><b>{children}</b>{extra}</div>;
}

/* ───────────────────────────── Scene A: dashboard, MT5 connects, statistics count in ───────────────────────────── */

const SYNC = 3000; // ms into the scene when the account reports connected

function DashboardView({ reduce }: { reduce: boolean }) {
  return (
    <div className="sx-view sx-dash">
      <div className="sx-row1">
        <Card className="sx-health sx-in" style={{ ["--d" as string]: "0ms" }}>
          <Ring value={ACCOUNT.health} delay={SYNC + 200} reduce={reduce} />
          <div>
            <b className="sx-h">Account Health</b>
            <span className="sx-chip is-up sx-late" style={{ ["--d" as string]: `${SYNC + 900}ms` }}>Strong</span> <span className="sx-illus">Illustrative</span>
            <small>Consistent risk, steady growth</small>
          </div>
        </Card>
        {[
          { icon: Wallet, k: "Balance", el: <Num to={ACCOUNT.balance} pre="$" delay={SYNC} reduce={reduce} />, sub: "Example account" },
          { icon: Hourglass, k: "P&L (30D)", el: <Num to={ACCOUNT.pnl30} pre="$" sign delay={SYNC + 120} reduce={reduce} className="is-up" />, sub: "34 trades synced" },
          { icon: Percent, k: "Win rate", el: <Num to={ACCOUNT.winRate} dp={1} suf="%" delay={SYNC + 240} reduce={reduce} />, sub: "20 of 34 trades" },
          { icon: Scale, k: "Profit factor", el: <Num to={ACCOUNT.profitFactor} delay={SYNC + 360} reduce={reduce} />, sub: "Last 30 days" },
        ].map((m, i) => (
          <Card key={m.k} className="sx-metric sx-in" style={{ ["--d" as string]: `${80 + i * 70}ms` }}>
            <span className="sx-metric-k"><m.icon className="sx-ic" />{m.k}</span>
            <b className="sx-metric-v">{m.el}</b>
            <small>{m.sub}</small>
          </Card>
        ))}
      </div>
      <div className="sx-row2">
        <Card className="sx-chart-card sx-in" style={{ ["--d" as string]: "200ms" }}>
          <ChartHead s={BULL} />
          <ScenarioChart s={BULL} still />
        </Card>
        <div className="sx-col">
          <Card className="sx-mt5 sx-in" style={{ ["--d" as string]: "260ms" }}>
            <CardTitle icon={Link2}>Account (MT5)</CardTitle>
            <div className="sx-mt5-state">
              <span className="sx-swap">
                <span className="sx-s1">Connecting…</span>
                <span className="sx-s2">Syncing trades</span>
                <span className="sx-s3"><Check />Connected</span>
              </span>
            </div>
            <span className="sx-bar"><i /></span>
            <ul className="sx-steps">
              <li style={{ ["--d" as string]: "700ms" }}><Check />Read-only access verified</li>
              <li style={{ ["--d" as string]: "1900ms" }}><Check />34 trades and open positions synced</li>
              <li style={{ ["--d" as string]: `${SYNC}ms` }}><Check />Statistics updated</li>
            </ul>
          </Card>
          <Card className="sx-ai-mini sx-in" style={{ ["--d" as string]: "320ms" }}>
            <CardTitle icon={Sparkles}>AI Market Analysis</CardTitle>
            <span className="sx-status is-await"><Hourglass />Awaiting 5M confirmation</span>
            <p>{BULL.read}</p>
          </Card>
        </div>
      </div>
    </div>
  );
}

/* ───────────────────────────── Scene B: XAUUSD analysis, bullish then bearish ───────────────────────────── */

function ChartHead({ s }: { s: Scenario }) {
  const last = s.candles[s.candles.length - 1]!.c;
  const first = s.candles[0]!.o;
  const ch = last - first;
  return (
    <div className="sx-chart-head">
      <span className="sx-gold" aria-hidden />
      <span className="sx-sym"><b>XAUUSD</b><small>Gold / US Dollar</small></span>
      <span className="sx-px num">{fmt(last)}<em className={ch >= 0 ? "is-up" : "is-down"}>{ch >= 0 ? "+" : "−"}{fmt(Math.abs(ch))}</em></span>
      <span className="sx-illus">Illustrative</span>
      <span className="sx-tabs">
        {(["15M", "1H", "4H"] as const).map((tf) => <i key={tf} className={cn(tf === s.tf && "is-on")}>{tf}</i>)}
      </span>
    </div>
  );
}

function AnalysisView({ s }: { s: Scenario }) {
  const bull = s.id === "bull";
  return (
    <div className="sx-view sx-analysis">
      <Card className="sx-chart-card is-big sx-in" style={{ ["--d" as string]: "0ms" }}>
        <ChartHead s={s} />
        <ScenarioChart s={s} />
      </Card>
      <div className="sx-col">
        <Card className="sx-ai sx-in" style={{ ["--d" as string]: "120ms" }}>
          <CardTitle icon={Sparkles}>AI Market Analysis</CardTitle>
          <span className={cn("sx-bias sx-late", bull ? "is-up" : "is-down")} style={{ ["--d" as string]: "2600ms" }}>XAUUSD · {s.bias} {s.tf}</span>
          <div className="sx-ai-zone sx-late" style={{ ["--d" as string]: "2900ms" }}>
            <small>{bull ? "Buy" : "Sell"} zone {fmt(s.zone.lo)} – {fmt(s.zone.hi)}</small>
            <span>Structural stop <b className="num">{s.pips} / 50 pips</b></span>
          </div>
          <p className="sx-late" style={{ ["--d" as string]: "3200ms" }}>{s.read}</p>
          <span className="sx-status is-await sx-late" style={{ ["--d" as string]: "3400ms" }}><Hourglass />Awaiting 5M confirmation</span>
        </Card>
        <Card className="sx-watch sx-in" style={{ ["--d" as string]: "200ms" }}>
          <CardTitle icon={Eye}>What to watch</CardTitle>
          <ul>
            {s.watch.map((w, i) => <li key={w} className="sx-late" style={{ ["--d" as string]: `${3600 + i * 280}ms` }}><Check />{w}</li>)}
          </ul>
          <small className="sx-note">Example setup for illustration. Not a signal or a recommendation.</small>
        </Card>
      </div>
    </div>
  );
}

/* ───────────────────────────── Scene C: journal ───────────────────────────── */

function equityPath() {
  const w = 300, h = 100;
  const lo = Math.min(...EQUITY), hi = Math.max(...EQUITY);
  const pts = EQUITY.map((v, i) => [(i / (EQUITY.length - 1)) * w, h - 8 - ((v - lo) / (hi - lo || 1)) * (h - 16)] as const);
  const d = pts.reduce((acc, [x, y], i) => {
    if (i === 0) return `M${x},${y}`;
    const [px, py] = pts[i - 1]!;
    const cx = (px + x) / 2;
    return `${acc} C${cx},${py} ${cx},${y} ${x},${y}`;
  }, "");
  return { d, area: `${d} L${w},${h} L0,${h} Z` };
}

function JournalView({ reduce }: { reduce: boolean }) {
  const eq = equityPath();
  const net = EQUITY[EQUITY.length - 1]! - EQUITY[0]!;
  const days = JOURNAL_MONTH.filter((d) => d.pnl !== null);
  const wins = days.filter((d) => (d.pnl as number) > 0).length;
  let lit = 0;
  return (
    <div className="sx-view sx-journal">
      <div className="sx-row1 is-4">
        {[
          { k: "Net P&L", el: <Num to={net} pre="$" sign delay={300} reduce={reduce} className={net >= 0 ? "is-up" : "is-down"} /> },
          { k: "Win rate", el: <Num to={ACCOUNT.winRate} dp={1} suf="%" delay={420} reduce={reduce} /> },
          { k: "Profit factor", el: <Num to={ACCOUNT.profitFactor} delay={540} reduce={reduce} /> },
          { k: "Green days", el: <><Num to={wins} dp={0} delay={660} reduce={reduce} /><small className="sx-of"> / {days.length}</small></> },
        ].map((m, i) => (
          <Card key={m.k} className="sx-metric sx-in" style={{ ["--d" as string]: `${i * 70}ms` }}>
            <span className="sx-metric-k">{m.k}</span>
            <b className="sx-metric-v">{m.el}</b>
          </Card>
        ))}
      </div>
      <div className="sx-row2 is-journal">
        <Card className="sx-trades sx-in" style={{ ["--d" as string]: "120ms" }}>
          <CardTitle icon={BookOpen} extra={<span className="sx-illus">Illustrative</span>}>Recent trades</CardTitle>
          <div className="sx-table">
            <span className="sx-tr is-head"><i>Opened</i><i>Symbol</i><i>Side</i><i>Lots</i><i>Pips</i><i>P&amp;L</i></span>
            {TRADES.map((t, i) => (
              <span key={t.d} className="sx-tr sx-row-in" style={{ ["--d" as string]: `${400 + i * 230}ms` }}>
                <i>{t.d}</i><i><b>{t.s}</b></i><i className={t.side === "Buy" ? "is-up" : "is-down"}>{t.side}</i><i className="num">{t.lots}</i><i className="num">{t.pips}</i>
                <i className={cn("num", t.pnl >= 0 ? "is-up" : "is-down")}>{t.pnl >= 0 ? "+" : "−"}${Math.abs(t.pnl).toFixed(2)}</i>
              </span>
            ))}
          </div>
        </Card>
        <div className="sx-col">
          <Card className="sx-equity sx-in" style={{ ["--d" as string]: "200ms" }}>
            <CardTitle icon={ChartLine}>Performance</CardTitle>
            <svg viewBox="0 0 300 100" preserveAspectRatio="none" className="sx-eq-svg" aria-hidden>
              <defs><linearGradient id="sx-eq" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#a85af5" stopOpacity="0.35" /><stop offset="1" stopColor="#a85af5" stopOpacity="0" /></linearGradient></defs>
              <path d={eq.area} fill="url(#sx-eq)" className="sx-eq-area" />
              <path d={eq.d} fill="none" stroke="#c98cf7" strokeWidth="2.2" pathLength={1} className="sx-eq-line" vectorEffect="non-scaling-stroke" />
            </svg>
          </Card>
          <Card className="sx-cal sx-in" style={{ ["--d" as string]: "260ms" }}>
            <CardTitle icon={CalendarDays}>P&amp;L calendar</CardTitle>
            <div className="sx-cal-grid">
              {["M", "T", "W", "T", "F", "S", "S"].map((d, i) => <small key={i}>{d}</small>)}
              {Array.from({ length: 2 }, (_, i) => <span key={`pad${i}`} className="is-pad" />)}
              {JOURNAL_MONTH.slice(0, 26).map((d) => {
                const on = d.pnl !== null;
                const k = on ? lit++ : 0;
                return (
                  <span key={d.day} className={cn(on && ((d.pnl as number) > 0 ? "is-win" : "is-loss"))} style={on ? { ["--d" as string]: `${1300 + k * 70}ms` } : undefined}>
                    {d.day}
                  </span>
                );
              })}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

/* ───────────────────────────── Scene D: Macro Desk and AI ───────────────────────────── */

function MacroView() {
  const words = INSIGHT.split(" ");
  return (
    <div className="sx-view sx-macro">
      <Card className="sx-events sx-in" style={{ ["--d" as string]: "0ms" }}>
        <CardTitle icon={CalendarDays} extra={<span className="sx-illus">Example week</span>}>Economic calendar</CardTitle>
        <ul>
          {EVENTS.map((e, i) => (
            <li key={e.t} className={cn("sx-ev sx-slide", e.usd && "is-usd")} style={{ ["--d" as string]: `${250 + i * 200}ms` }}>
              <span className="sx-ev-cur">{e.c}</span>
              <span className="sx-ev-t"><b>{e.t}</b><small>{e.when}</small></span>
              <span className={cn("sx-ev-imp", e.impact === "High" ? "is-high" : "is-med")}>{e.impact}</span>
            </li>
          ))}
        </ul>
        <div className="sx-gauges">
          {["Rates", "Inflation", "Dollar"].map((g, i) => (
            <span key={g} className="sx-in" style={{ ["--d" as string]: `${1200 + i * 120}ms` }}><small>{g}</small><b>{i === 2 ? "Firm" : i === 1 ? "Sticky" : "On hold"}</b></span>
          ))}
        </div>
      </Card>
      <div className="sx-col">
        <Card className="sx-insight sx-late" style={{ ["--d" as string]: "1700ms" }}>
          <CardTitle icon={Sparkles} extra={<span className="sx-ai-tag">AI · example</span>}>AI Market Insight</CardTitle>
          <span className="sx-insight-h">USD CPI: possible implications for gold</span>
          <p>{words.map((w, i) => <span key={i} className="sx-w" style={{ ["--d" as string]: `${2000 + i * 32}ms` }}>{w} </span>)}</p>
        </Card>
        <Card className="sx-coach sx-late" style={{ ["--d" as string]: "3300ms" }}>
          <CardTitle icon={Sparkles} extra={<span className="sx-ai-tag">AI Coach</span>}>AI Coach</CardTitle>
          <span className="sx-msg is-me sx-late" style={{ ["--d" as string]: "3500ms" }}>{COACH.q}</span>
          <span className="sx-typing" style={{ ["--d" as string]: "3900ms" }}><i /><i /><i /></span>
          <span className="sx-msg is-ai sx-late" style={{ ["--d" as string]: "4600ms" }}>{COACH.a}</span>
        </Card>
      </div>
    </div>
  );
}

/* ───────────────────────────── The app frame ───────────────────────────── */

export interface Layer { id: SceneId; key: string }

export function AppFrame({ cur, prev, nav, reduce }: { cur: Layer; prev: Layer | null; nav: number; reduce: boolean }) {
  const scene = cur.id;
  const [title, sub] = TITLES[scene];
  const view = (id: SceneId) =>
    id === "connect" ? <DashboardView reduce={reduce} /> : id === "bull" ? <AnalysisView s={BULL} /> : id === "bear" ? <AnalysisView s={BEAR} /> : id === "journal" ? <JournalView reduce={reduce} /> : <MacroView />;
  return (
    <div className="sx-app">
      <aside className="sx-side">
        <span className="sx-logo">
          <Image src="/brand/treidify-t-64.webp" alt="" width={32} height={32} />
          <span><b>Treidify</b><small>Your Trading Intelligence</small></span>
        </span>
        <nav style={{ ["--nav" as string]: nav }}>
          <span className="sx-pill" aria-hidden />
          {NAV.map(({ icon: I, label }, i) => (
            <span key={label} className={cn("sx-nav", i === nav && "is-on", i === 5 && "is-mt5")}>
              <I />{label}{i === 5 && <i className="sx-dot" />}
            </span>
          ))}
        </nav>
        <span className="sx-prem"><Crown /><span><b>Treidify Premium</b><small>Full access</small></span></span>
      </aside>
      <div className="sx-main">
        <div className="sx-top">
          <div key={`t${scene}`} className="sx-title"><b>{title}</b><small>{sub}</small></div>
          <span className="sx-search"><Search />Search pairs, news, macro…</span>
          <span className="sx-icon"><Bell /></span>
          <span className="sx-avatar">TR</span>
        </div>
        <div className="sx-stagearea">
          {[prev, cur].filter((l): l is Layer => !!l && (l === cur || l.key !== cur.key)).map((l) => (
            <div key={l.key} className={cn("sx-layer", l === cur ? "is-on" : "is-leaving")}>{view(l.id)}</div>
          ))}
        </div>
      </div>
    </div>
  );
}
