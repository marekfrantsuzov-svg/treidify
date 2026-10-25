"use client";

import { Bell, BookOpen, Brain, Globe2, LayoutDashboard, LineChart, Newspaper, Search, Settings, Users } from "lucide-react";
import { useMemo } from "react";
import { activeSessions, SESSIONS } from "@/lib/analytics";
import { MTF, sampleAnalysis } from "@/lib/demo/markets";
import { fmtNumber, fmtPct } from "@/lib/format";
import { cn } from "@/lib/cn";
import { Sparkline } from "@/components/charts/sparkline";
import { Glass } from "@/components/ui/glass";
import { Pill, SampleBadge } from "@/components/ui/pill";
import { AccountHealthPreview } from "./account-health-preview";
import { BiasChip, InstrumentIcon, WindowChrome } from "./parts";
import { InstrumentCard } from "./zone-explorer";

const nav = [LayoutDashboard, LineChart, Globe2, Newspaper, BookOpen, Brain, Users, Settings];
const events = [
  { time: "12:30", name: "US CPI (MoM)", impact: "High" },
  { time: "14:00", name: "Fed Chair speech", impact: "High" },
  { time: "14:30", name: "Crude oil inventories", impact: "Medium" },
] as const;

function MiniInstrument({ symbol }: { symbol: "DXY" | "XAGUSD" }) {
  const a = useMemo(() => sampleAnalysis(symbol, "4H"), [symbol]);
  const up = a.change >= 0;
  return (
    <Glass className="p-4">
      <div className="flex items-center gap-2">
        <InstrumentIcon symbol={symbol} />
        <span className="text-sm font-semibold text-ink">{symbol}</span>
        <Pill tone={a.bias.bias === "bullish" ? "up" : a.bias.bias === "bearish" ? "down" : "neutral"} className="ml-auto capitalize">{a.bias.bias === "insufficientData" ? "No data" : a.bias.bias}</Pill>
      </div>
      <div className="mt-2">
        <div>
          <div className="num text-xl font-semibold text-ink">{fmtNumber(a.last, 3)}</div>
          <div className={cn("num text-xs font-medium", up ? "text-up" : "text-down")}>{fmtPct(a.changePct, 2, true)}</div>
        </div>
              </div>
      <Sparkline values={a.candles.slice(-60).map((c) => c.c)} up={up} className="mt-3 h-20 w-full" width={320} height={80} />
      <div className="mt-3 grid grid-cols-5 gap-1">
        {MTF.map((m) => <BiasChip key={m.tf} tf={m.tf} bias={sampleAnalysis(symbol, m.tf).bias.bias} />)}
      </div>
    </Glass>
  );
}

/** The hero product shot: the real dashboard layout and components, running on labelled sample data. */
export function DashboardPreview() {
  const sessions = activeSessions(new Date("2026-10-21T13:00:00Z"));
  return (
    <WindowChrome title="app.treidify.com/dashboard" className="text-left">
      <div className="flex">
        <aside className="hidden w-16 shrink-0 flex-col items-center gap-2 border-r border-line py-4 md:flex" aria-hidden>
          {nav.map((Icon, i) => (
            <span key={i} className={cn("grid h-10 w-10 place-items-center rounded-2xl text-ink-3", i === 0 && "bg-accent text-white shadow-[0_8px_20px_-8px_var(--accent)]")}>
              <Icon className="h-[18px] w-[18px]" />
            </span>
          ))}
        </aside>
        <div className="min-w-0 flex-1 p-3 sm:p-5">
          <div className="flex flex-wrap items-center gap-3">
            <div className="mr-auto">
              <div className="text-xl font-semibold tracking-[-0.02em] text-ink">Good afternoon</div>
              <div className="hidden text-xs text-ink-3 sm:block">Here is your account and the market right now.</div>
            </div>
            <div className="inset hidden h-9 w-64 items-center gap-2 rounded-full px-3 text-xs text-ink-3 lg:flex"><Search className="h-3.5 w-3.5 shrink-0" /> <span className="truncate">Search symbols, news or ask AI</span> <kbd className="ml-auto rounded bg-surface px-1.5">⌘K</kbd></div>
            <div className="hidden gap-1 sm:flex">
              {SESSIONS.map((s) => <Pill key={s.id} tone={sessions.includes(s.id) ? "up" : "neutral"}>{s.name}</Pill>)}
            </div>
            <span className="inset hidden h-9 items-center rounded-full px-3 text-xs text-ink-2 md:flex">MT5 · Sample account ▾</span>
            <span className="inset hidden h-9 w-9 place-items-center rounded-full text-ink-2 sm:grid"><Bell className="h-4 w-4" /></span>
            <span className="hidden h-9 w-9 sm:grid place-items-center rounded-full bg-[linear-gradient(135deg,var(--accent-2),var(--accent))] text-xs font-bold text-white">TR</span>
          </div>
          <div className="mt-4">
            <AccountHealthPreview />
          </div>
          <div className="mt-3 grid gap-3 xl:grid-cols-[1.6fr_1fr]">
            <InstrumentCard symbol="XAUUSD" height={260} showMtf />
            <div className="grid gap-3">
              <MiniInstrument symbol="DXY" />
              <Glass className="p-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-ink">Key events today</span>
                  <SampleBadge label="Example" />
                </div>
                <ul className="mt-2 grid gap-1.5">
                  {events.map((e) => (
                    <li key={e.name} className="flex items-center gap-3 text-[13px]">
                      <span className="num w-11 text-ink-3">{e.time}</span>
                      <span className="flex-1 truncate text-ink">{e.name}</span>
                      <Pill tone={e.impact === "High" ? "down" : "warn"}>{e.impact}</Pill>
                    </li>
                  ))}
                </ul>
              </Glass>
            </div>
          </div>
        </div>
      </div>
    </WindowChrome>
  );
}
