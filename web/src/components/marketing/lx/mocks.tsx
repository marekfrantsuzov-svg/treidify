"use client";

import {
  Bell, BookOpen, CalendarDays, ChartCandlestick, ChartLine, Crown, Globe, Hourglass, House, Menu, Search, Signal, Sparkles, Users, Wifi, BatteryFull, ShieldCheck,
} from "lucide-react";
import Image from "next/image";
import { cn } from "@/lib/cn";
import { SCENES, TFS, fmt } from "./data";
import { GoldChart } from "./gold-chart";
import { Illustrative, Ring, useAutoCycle } from "./primitives";

const NAV = [
  { icon: House, label: "Dashboard" },
  { icon: ChartCandlestick, label: "Markets" },
  { icon: ChartLine, label: "Analysis" },
  { icon: Globe, label: "Macro Desk" },
  { icon: CalendarDays, label: "Calendar" },
  { icon: BookOpen, label: "Journal" },
  { icon: Sparkles, label: "AI Coach" },
  { icon: Users, label: "Community" },
];

const METRICS = [
  { k: "Balance", v: "$24,860.40" },
  { k: "P&L (30D)", v: "+$1,284.60", up: true },
  { k: "Win rate", v: "58.2%" },
  { k: "Profit factor", v: "1.64" },
];

function TfTabs({ active, onPick, className }: { active: number; onPick?: (i: number) => void; className?: string }) {
  return (
    <span className={cn("lx-tabs", className)} role={onPick ? "tablist" : undefined}>
      {TFS.map((tf, i) => (
        <button key={tf} type="button" tabIndex={onPick ? 0 : -1} role={onPick ? "tab" : undefined} aria-selected={onPick ? i === active : undefined} className={cn(i === active && "is-on")} onClick={() => onPick?.(i)}>
          {tf}
        </button>
      ))}
    </span>
  );
}

/**
 * The Treidify dashboard, drawn in code at a 1200px design width and sized in em, so the whole mock scales with
 * its font-size and stays sharp at any width. Values are illustrative; the chart switches timeframe on its own.
 */
export function DesktopMock({ className }: { className?: string }) {
  const cyc = useAutoCycle(TFS, 3800, 1);
  const scene = SCENES[cyc.value!];
  return (
    <div ref={cyc.ref} className={cn("lx-desk", className)}>
      <div className="lx-desk-bar" aria-hidden>
        <i /><i /><i />
        <span className="lx-url"><ShieldCheck />app.treidify.com</span>
      </div>
      <div className="lx-desk-body">
        <aside className="lx-side" aria-hidden>
          <span className="lx-side-logo"><Image src="/brand/treidify-t-64.webp" alt="" width={28} height={28} /><b>Treidify</b></span>
          <nav>
            {NAV.map(({ icon: I, label }, i) => (
              <span key={label} className={cn(i === 0 && "is-on")}><I />{label}</span>
            ))}
          </nav>
          <span className="lx-side-bull"><Image src="/brand/bull.webp" alt="" width={240} height={200} /></span>
          <span className="lx-side-prem"><Crown />Treidify Premium<small>Trial active</small></span>
        </aside>
        <div className="lx-main">
          <div className="lx-main-top">
            <div>
              <b>Good morning, Trader</b>
              <small>London session is open. Here is your trading overview.</small>
            </div>
            <span className="lx-search"><Search />Search pairs, news, macro…</span>
            <span className="lx-icon-btn"><Bell /></span>
            <span className="lx-avatar">TR</span>
          </div>
          <div className="lx-row1">
            <div className="lx-card lx-health">
              <Ring value={82} />
              <div>
                <b>Account Health</b>
                <span className="lx-chip is-up">Strong</span> <Illustrative />
                <small>Consistent risk, steady growth</small>
              </div>
            </div>
            {METRICS.map((m) => (
              <div key={m.k} className="lx-card lx-metric">
                <small>{m.k}</small>
                <b className={cn("num", m.up && "is-up")}>{m.v}</b>
              </div>
            ))}
          </div>
          <div className="lx-row2">
            <div className="lx-card lx-chart-card">
              <div className="lx-chart-head">
                <span className="lx-gold" aria-hidden />
                <span><b>XAUUSD</b><small>Gold / US Dollar</small></span>
                <span className="lx-price num">4,118.40<em className="is-up">+17.20 (+0.42%)</em></span>
                <TfTabs active={cyc.index} />
              </div>
              <GoldChart key={cyc.value} scene={scene} compact />
            </div>
            <div className="lx-col">
              <div className="lx-card lx-ai">
                <b><Sparkles />AI Market Analysis</b>
                <span className={cn("lx-status", scene.setup.eligible ? "is-await" : "is-wait")}><Hourglass />{scene.setup.status}</span>
                <div className="lx-ai-zone">
                  <small>{scene.setup.zone}</small>
                  <span>Structural stop <b className={cn("num", !scene.setup.eligible && "is-down")}>{scene.setup.pips} / 50 pips</b></span>
                </div>
                <p>{scene.read}</p>
              </div>
              <div className="lx-card lx-struct">
                <b>Structure</b>
                {TFS.map((tf) => (
                  <span key={tf} className={cn("lx-trend", SCENES[tf].structure === "Bullish" ? "is-up" : "is-down")}>{tf} · {SCENES[tf].structure.toUpperCase()}</span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/** iPhone frame with the Treidify mobile dashboard, drawn at a 390px design width in em. */
export function PhoneMock({ className }: { className?: string }) {
  const cyc = useAutoCycle(TFS, 4300, 0);
  const scene = SCENES[cyc.value!];
  return (
    <div ref={cyc.ref} className={cn("lx-phone", className)}>
      <div className="lx-phone-screen">
        <span className="lx-island" aria-hidden />
        <div className="lx-status" aria-hidden><b>9:41</b><span><Signal /><Wifi /><BatteryFull /></span></div>
        <div className="lx-phone-top" aria-hidden>
          <Menu />
          <span><Image src="/brand/treidify-t-64.webp" alt="" width={22} height={22} />Treidify</span>
          <Bell />
        </div>
        <div className="lx-phone-body">
          <b className="lx-phone-hi">Good morning, Trader</b>
          <div className="lx-card lx-health is-phone">
            <Ring value={82} />
            <div><b>Account Health</b><span className="lx-chip is-up">Strong</span> <Illustrative /></div>
          </div>
          <div className="lx-phone-metrics">
            {METRICS.map((m) => (
              <div key={m.k} className="lx-card lx-metric"><small>{m.k}</small><b className={cn("num", m.up && "is-up")}>{m.v}</b></div>
            ))}
          </div>
          <div className="lx-card lx-chart-card is-phone">
            <div className="lx-chart-head">
              <span className="lx-gold" aria-hidden />
              <span><b>XAUUSD</b><small className="num">{fmt(4118.4)}</small></span>
              <TfTabs active={cyc.index} />
            </div>
            <GoldChart key={cyc.value} scene={scene} compact />
          </div>
        </div>
        <nav className="lx-phone-nav" aria-hidden>
          {[0, 1, 2, 4, 7].map((n) => NAV[n]!).map(({ icon: I, label }, i) => (
            <span key={label} className={cn(i === 0 && "is-on")}><I />{label}</span>
          ))}
        </nav>
      </div>
    </div>
  );
}
