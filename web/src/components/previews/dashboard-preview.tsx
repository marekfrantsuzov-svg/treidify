"use client";

import { useMemo } from "react";
import { netProfit } from "@/lib/analytics";
import { sampleTrades } from "@/lib/demo/sample";
import { cn } from "@/lib/cn";
import { HealthRow } from "@/components/app/dashboard/health-row";
import { MacroCard, NewsCard } from "@/components/app/dashboard/cards";
import { appNav } from "@/components/app/nav";
import { GlassIcon, Glyph } from "@/components/icons/glass-icon";
import { WindowChrome } from "./parts";
import { InstrumentCard } from "./zone-explorer";

const START = 25_000;
// Fixed clock so the preview renders identically on server and client.
const NOW = "2026-10-21T14:00:00.000Z";

/** The hero product shot: the real dashboard components from the app, running on labelled sample data. */
export function DashboardPreview() {
  const trades = useMemo(() => {
    const t = sampleTrades(140);
    const shift = Math.floor(new Date(NOW).getTime() / 1000) - 7200 - t.at(-1)!.closeTime;
    return t.map((x) => ({ ...x, openTime: x.openTime + shift, closeTime: x.closeTime + shift }));
  }, []);
  const balance = START + trades.reduce((a, t) => a + netProfit(t), 0);
  return (
    <WindowChrome title="app.treidify.com" className="text-left">
      <div className="flex">
        <aside className="hidden w-[188px] shrink-0 flex-col gap-0.5 border-r border-line p-3 lg:flex" aria-hidden>
          <div className="px-2 pb-4 pt-1 text-lg font-semibold tracking-[-0.04em] text-ink">Treidify<span className="text-accent">.</span></div>
          {appNav.slice(0, 9).map((n, i) => (
            <span key={n.href} className={cn("flex items-center gap-2.5 rounded-xl px-1.5 py-1 text-[12.5px] text-ink-2", i === 0 && "bg-[var(--surface-strong)] font-semibold text-ink shadow-[var(--shadow)]")}>
              <GlassIcon name={n.icon} size={26} active={i === 0} />{n.label}
            </span>
          ))}
        </aside>
        <div className="min-w-0 flex-1 p-3 sm:p-5">
          <div className="mb-4 flex items-center justify-between gap-3" aria-hidden>
            <div className="min-w-0">
              <div className="truncate text-lg font-semibold tracking-[-0.02em] text-ink sm:text-xl">Good afternoon, Alex</div>
              <div className="truncate text-xs text-ink-3">Here’s your market overview. London and New York sessions open.</div>
            </div>
            <div className="hidden items-center gap-2 md:flex">
              <span className="glass flex h-9 w-56 items-center gap-2 rounded-full px-3 text-xs text-ink-3"><Glyph name="search" size={15} /><span className="truncate">Search markets, news, or ask AI…</span></span>
              <span className="glass flex h-9 items-center gap-1.5 rounded-full pl-1.5 pr-3 text-xs font-medium text-ink"><GlassIcon name="calendar" size={24} />Last 30 days</span>
              <span className="glass grid h-9 w-9 place-items-center rounded-full"><Glyph name="bell" size={18} /></span>
            </div>
          </div>
          <div className="grid gap-3">
            <HealthRow label="Sample MT5 account" currency="USD" sample balance={balance} equity={balance + 184.2} floating={184.2} snapshotAt={null} startingEquity={START} trades={trades} timezone="Europe/London" period="30D" nowIso={NOW} />
            <div className="grid gap-3 xl:grid-cols-[1fr_1fr_0.9fr]">
              <InstrumentCard symbol="XAUUSD" tfs={["1M", "5M", "15M", "1H", "4H"]} height={210} showMtf={false} compact />
              <InstrumentCard symbol="DXY" tfs={["1M", "5M", "15M", "1H", "4H"]} height={210} showMtf={false} compact className="hidden md:block" />
              <div className="hidden xl:grid xl:gap-3"><MacroCard /></div>
            </div>
            <div className="hidden lg:block xl:hidden"><NewsCard connected={false} /></div>
          </div>
        </div>
      </div>
    </WindowChrome>
  );
}
