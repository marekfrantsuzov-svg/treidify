"use client";

import { useEffect, useMemo, useState } from "react";
import { activeSessions, marketStatus, coachObservations, netProfit, performanceMetrics, SESSIONS, type TradingSession } from "@/lib/analytics";
import { sampleAnalysis, sampleSeries, digitsFor, type SampleSymbol } from "@/lib/demo/markets";
import { cn } from "@/lib/cn";
import { GlassIcon, type GlassIconName } from "@/components/icons/glass-icon";
import { BiasChip, InstrumentIcon } from "@/components/previews/parts";
import { PREVIEW_NOW, PREVIEW_START, previewTrades } from "@/components/previews/dashboard-preview";

const DAY = 86_400;
const money = (v: number) => `${v < 0 ? "−" : "+"}$${Math.abs(v).toLocaleString("en-US", { maximumFractionDigits: 0 })}`;

function Widget({ icon, title, tag = "Demo", children, className }: { icon: GlassIconName; title: string; tag?: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("glass glass-float w-[236px] shrink-0 snap-start rounded-[22px] p-3.5 text-left shadow-[var(--shadow-lg)]", className)}>
      <div className="mb-2.5 flex items-center gap-2">
        <GlassIcon name={icon} size={26} />
        <span className="min-w-0 flex-1 text-[12.5px] font-semibold leading-tight text-ink">{title}</span>
        <span className={cn("shrink-0 rounded-full px-1.5 py-0.5 text-[9.5px] font-bold uppercase tracking-wider", tag === "Demo" ? "bg-warn-soft text-warn" : "bg-up-soft text-up")}>{tag}</span>
      </div>
      {children}
    </div>
  );
}

function Spark({ values, className }: { values: number[]; className?: string }) {
  const min = Math.min(...values), max = Math.max(...values);
  const pts = values.map((v, i) => `${(i / (values.length - 1)) * 100},${30 - ((v - min) / (max - min || 1)) * 28 - 1}`).join(" ");
  const up = values.at(-1)! >= values[0]!;
  return (
    <svg viewBox="0 0 100 30" preserveAspectRatio="none" className={cn("h-7 w-16", className)} aria-hidden>
      <polyline points={pts} fill="none" stroke={up ? "var(--up)" : "var(--down)"} strokeWidth="1.8" vectorEffect="non-scaling-stroke" strokeLinejoin="round" />
    </svg>
  );
}

/** Live session clock: computed from the visitor's real time after mount, so it never needs market data. */
function SessionsWidget({ className }: { className?: string }) {
  const [open, setOpen] = useState<TradingSession[] | null>(null);
  const [status, setStatus] = useState<ReturnType<typeof marketStatus> | null>(null);
  useEffect(() => {
    const tick = () => { const now = new Date(); setOpen(activeSessions(now)); setStatus(marketStatus(now)); };
    tick();
    const id = setInterval(tick, 60_000);
    return () => clearInterval(id);
  }, []);
  return (
    <Widget icon="calendar" title="Market sessions" tag="Live clock" className={className}>
      <div className="grid gap-1.5">
        {SESSIONS.map((s) => {
          const on = open?.includes(s.id);
          return (
            <div key={s.id} className="flex items-center gap-2 text-[11.5px]">
              <span className={cn("h-2 w-2 rounded-full", on ? "bg-up shadow-[0_0_8px_var(--up)]" : "bg-[var(--border-strong)]")} />
              <span className="flex-1 text-ink-2">{s.name}</span>
              <span className={cn("font-medium", on ? "text-up" : "text-ink-3")}>{open === null ? "…" : on ? "Open" : "Closed"}</span>
            </div>
          );
        })}
      </div>
      {status && status !== "open" && <p className="mt-2 text-[10.5px] text-ink-3">{status === "weekendClosed" ? "Gold and FX are closed for the weekend." : "Daily gold and FX break."}</p>}
    </Widget>
  );
}

function useWidgetData() {
  return useMemo(() => {
    const trades = previewTrades();
    const now = Math.floor(new Date(PREVIEW_NOW).getTime() / 1000);
    const recent = trades.filter((t) => t.closeTime >= now - 30 * DAY);
    const m = performanceMetrics(recent, PREVIEW_START);
    const daily = Array.from({ length: 14 }, (_, i) => {
      const from = now - (14 - i) * DAY;
      return trades.filter((t) => t.closeTime >= from && t.closeTime < from + DAY).reduce((a, t) => a + netProfit(t), 0);
    });
    const obs = coachObservations(trades);
    const insight = obs.find((o) => o.kind === "strengthSession") ?? obs.find((o) => o.severity === "strength") ?? obs[0];
    const behaviour = obs.find((o) => ["riskAfterLosses", "holdingLosers", "inconsistentSizing", "strengthConsistency", "tradeFrequency"].includes(o.kind));
    const inst = (["XAUUSD", "DXY"] as SampleSymbol[]).map((s) => {
      const a = sampleAnalysis(s, "1H");
      return { symbol: s, last: a.last, pct: a.changePct, digits: digitsFor(s), spark: sampleSeries(s, "1H").slice(-40).map((c) => c.c), bias4h: sampleAnalysis(s, "4H").bias.bias, bias1h: a.bias.bias };
    });
    return { m, daily, insight, behaviour, inst, sampleSize: trades.length };
  }, []);
}

/** Eight floating glass widgets around the hero dashboard. Every value is generated sample data, labelled “Demo”, except the session clock. */
export function HeroWidgets() {
  const d = useWidgetData();
  const [gold, dxy] = d.inst;
  const maxDay = Math.max(...d.daily.map(Math.abs)) || 1;
  const win = d.m.winRate ?? 0;

  const widgets = [
    <Widget key="outlook" icon="spark" title="Today’s market outlook">
      <div className="grid grid-cols-2 gap-1.5">
        <BiasChip tf="Gold 4H" bias={gold!.bias4h} />
        <BiasChip tf="DXY 4H" bias={dxy!.bias4h} />
      </div>
      <p className="mt-2 text-[11px] leading-snug text-ink-3">Structure-based bias, with invalidation levels on the desk.</p>
    </Widget>,
    <Widget key="instruments" icon="gold" title="XAUUSD & DXY">
      <div className="grid gap-2">
        {d.inst.map((x) => (
          <div key={x.symbol} className="flex items-center gap-2">
            <InstrumentIcon symbol={x.symbol} className="h-6 w-6 text-[10px]" />
            <div className="min-w-0 flex-1">
              <div className="text-[11px] font-semibold text-ink">{x.symbol}</div>
              <div className="num text-[11px] text-ink-3">{x.last.toFixed(x.digits)} <span className={x.pct >= 0 ? "text-up" : "text-down"}>{x.pct >= 0 ? "+" : "−"}{Math.abs(x.pct).toFixed(2)}%</span></div>
            </div>
            <Spark values={x.spark} />
          </div>
        ))}
      </div>
    </Widget>,
    <Widget key="performance" icon="markets" title="Trading performance">
      <div className={cn("num text-xl font-semibold tracking-[-0.02em]", d.m.netProfit >= 0 ? "text-up" : "text-down")}>{money(d.m.netProfit)}</div>
      <div className="text-[11px] text-ink-3">Net P&L, last 30 days</div>
      <div className="mt-2 flex h-10 gap-[3px]" aria-hidden>
        {d.daily.map((v, i) => (
          <div key={i} className="grid flex-1 grid-rows-2">
            <div className="flex items-end">{v > 0 && <div className="w-full rounded-t-[2px] bg-up" style={{ height: `${Math.max(8, (v / maxDay) * 100)}%` }} />}</div>
            <div className="flex items-start border-t border-line">{v < 0 && <div className="w-full rounded-b-[2px] bg-down" style={{ height: `${Math.max(8, (-v / maxDay) * 100)}%` }} />}</div>
          </div>
        ))}
      </div>
    </Widget>,
    <Widget key="winrate" icon="dashboard" title="Win rate & P&L">
      <div className="flex items-center gap-3">
        <svg viewBox="0 0 36 36" className="h-14 w-14 -rotate-90" aria-hidden>
          <circle cx="18" cy="18" r="15" fill="none" stroke="var(--surface-inset)" strokeWidth="4" />
          <circle cx="18" cy="18" r="15" fill="none" stroke="var(--accent)" strokeWidth="4" strokeLinecap="round" strokeDasharray={`${win * 94.2} 94.2`} />
        </svg>
        <div className="min-w-0 text-[11px] text-ink-3">
          <div className="num text-lg font-semibold text-ink">{(win * 100).toFixed(1)}%</div>
          <div className="num">{d.m.wins}W · {d.m.losses}L</div>
          <div className="num">PF {d.m.profitFactor?.toFixed(2) ?? "n/a"}</div>
        </div>
      </div>
    </Widget>,
    <Widget key="ai" icon="ai" title="AI trading insight">
      <div className="text-[12px] font-semibold leading-snug text-ink">{d.insight?.title ?? "Not enough trades yet"}</div>
      <p className="mt-1 line-clamp-2 text-[11px] leading-snug text-ink-3">{d.insight?.evidence[0]}</p>
    </Widget>,
    <Widget key="news" icon="news" title="Economic calendar">
      <div className="grid gap-1.5">
        {[{ t: "US CPI m/m", i: 3 }, { t: "FOMC minutes", i: 3 }, { t: "ECB speech", i: 2 }].map((e) => (
          <div key={e.t} className="flex items-center gap-2 text-[11.5px]">
            <span className="flex gap-0.5" role="img" aria-label={`Impact ${e.i} of 3`}>
              {[1, 2, 3].map((n) => <span key={n} className={cn("h-2.5 w-1 rounded-full", n <= e.i ? (e.i === 3 ? "bg-down" : "bg-warn") : "bg-[var(--border-strong)]")} />)}
            </span>
            <span className="flex-1 truncate text-ink-2">{e.t}</span>
          </div>
        ))}
      </div>
      <p className="mt-2 text-[10.5px] text-ink-3">Example schedule, not this week’s events.</p>
    </Widget>,
    <SessionsWidget key="sessions" />,
    <Widget key="behaviour" icon="coach" title="Trading psychology">
      <div className="text-[12px] font-semibold leading-snug text-ink">{d.behaviour?.title ?? "Consistent behaviour"}</div>
      <p className="mt-1 line-clamp-2 text-[11px] leading-snug text-ink-3">{d.behaviour?.evidence[0]}</p>
      <p className="mt-1.5 text-[10px] text-ink-3">Measured from {d.sampleSize} trades. No emotion detection.</p>
    </Widget>,
  ];

  // Desktop: four widgets float on each side of the product shot. Smaller screens: a swipeable strip.
  const spots = ["top-[6%]", "top-[30%]", "top-[54%]", "top-[78%]"];
  return (
    <>
      <div aria-hidden className="pointer-events-none absolute inset-0 hidden xl:block">
        {widgets.map((w, i) => {
          const left = i % 2 === 0;
          const row = Math.floor(i / 2);
          return (
            <div
              key={i}
              className={cn("float-y absolute", spots[row], left ? (row % 2 ? "-left-6 min-[1400px]:-left-14" : "-left-14 min-[1400px]:-left-28") : row % 2 ? "-right-14 min-[1400px]:-right-28" : "-right-6 min-[1400px]:-right-14")}
              style={{ "--fd": `${-i * 1.3}s` } as React.CSSProperties}
            >
              {w}
            </div>
          );
        })}
      </div>
      <div className="-mx-3 mt-5 flex snap-x gap-3 overflow-x-auto px-3 pb-3 [scrollbar-width:none] sm:-mx-6 sm:px-6 xl:hidden" aria-label="Dashboard widgets, demo data">
        {widgets}
      </div>
    </>
  );
}
