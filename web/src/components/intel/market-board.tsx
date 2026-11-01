"use client";

import { Sparkles, WandSparkles } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import type { IntelSnapshot } from "@/server/market/intelligence";
import type { EngineTf, InstrumentIntel } from "@/lib/intelligence";
import { cn } from "@/lib/cn";
import { Card, CardHeader } from "@/components/ui/card";
import { SlidingPill } from "@/components/ui/sliding-pill";
import { RevealItem } from "@/components/motion/reveal";
import { Gauge, biasText, biasTone } from "./gauge";
import { IntelBubbles } from "./bubbles";
import { IntelChart } from "./intel-chart";
import { DataChips, SYMS, outlookLines, useIntel } from "./market-intel";

type Sym = (typeof SYMS)[number]["id"];
const TF_ORDER: EngineTf[] = ["4H", "1H", "15M", "5M"];
const trendCls = { bullish: "bg-up-soft text-up", bearish: "bg-down-soft text-down", none: "bg-inset text-ink-3" } as const;

/**
 * Market intelligence as dashboard grid items: today's read with four gauges, the zone chart, zones with structure and
 * Fibonacci, the AI read, and the news and calendar cards passed in from the server.
 */
export function MarketBoard({ initial, news, calendar }: { initial: IntelSnapshot; news: React.ReactNode; calendar: React.ReactNode }) {
  const s = useIntel(initial);
  const [sym, setSym] = useState<Sym>("XAUUSD");
  const intel: InstrumentIntel = sym === "XAUUSD" ? s.gold : sym === "DXY" ? s.dxy : s.silver;
  const sample = s.mode === "sample";
  const q = s.quotes[sym];
  const outlook = outlookLines(s);

  return (
    <>
      <RevealItem className="span-12">
        <Card aria-labelledby="mi-title" className="relative overflow-hidden p-4 sm:p-6">
          <div aria-hidden className="pointer-events-none absolute -left-24 -top-32 h-80 w-80 rounded-full bg-[radial-gradient(circle,var(--glow-a),transparent_70%)] blur-2xl" />
          <div className="relative flex flex-wrap items-end justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-accent">Market Intelligence Today</p>
              <h2 id="mi-title" className="mt-1 text-[24px] font-semibold leading-tight tracking-[-0.035em] text-ink sm:text-[30px]">
                Gold <span className={biasTone[s.gold.bias]}>{biasText[s.gold.bias]}</span><span className="text-ink-3"> · </span>DXY <span className={biasTone[s.dxy.bias]}>{biasText[s.dxy.bias]}</span>
              </h2>
            </div>
            <DataChips s={s} />
          </div>
          {sample && <p className="relative mt-3 max-w-3xl rounded-2xl bg-warn-soft px-3.5 py-2 text-[12.5px] leading-snug text-ink-2 sm:text-[13px]">{s.message}</p>}
          <div className="relative mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-3">
            {[
              { k: "gold", el: <Gauge title="Gold" subtitle="XAUUSD · multi-timeframe" bias={s.gold.bias} score={s.gold.score} confidence={s.gold.confidence} components={s.gold.components} limitations={s.gold.limitations} invalidation={s.gold.invalidation} asOf={s.asOf} sample={sample} /> },
              { k: "dxy", el: <Gauge title="DXY" subtitle="US Dollar Index" bias={s.dxy.bias} score={s.dxy.score} confidence={s.dxy.confidence} components={s.dxy.components} limitations={s.dxy.limitations} invalidation={s.dxy.invalidation} asOf={s.asOf} sample={sample} /> },
              { k: "silver", el: <Gauge title="Silver" subtitle="XAGUSD · multi-timeframe" bias={s.silver.bias} score={s.silver.score} confidence={s.silver.confidence} components={s.silver.components} limitations={s.silver.limitations} invalidation={s.silver.invalidation} asOf={s.asOf} sample={sample} /> },
              { k: "overall", el: <Gauge title="Overall" subtitle="For Gold, with DXY and event risk" bias={s.overall.bias} score={s.overall.score} detail={s.overall.detail} asOf={s.asOf} sample={sample} /> },
            ].map((g) => <div key={g.k} className="inset min-w-0 rounded-[22px] px-1 pt-2">{g.el}</div>)}
          </div>
        </Card>
      </RevealItem>

      <RevealItem className="span-8">
        <Card aria-labelledby="chart-title" className="h-full">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              <h2 id="chart-title" className="sr-only">Chart</h2>
              <div role="tablist" aria-label="Instrument" className="inset relative flex rounded-full p-1">
                <SlidingPill watch={sym} className="rounded-full bg-[var(--surface-strong)] shadow-[var(--shadow)]" />
                {SYMS.map((x) => <button key={x.id} role="tab" aria-selected={sym === x.id} data-active={sym === x.id} onClick={() => setSym(x.id)} className={cn("relative z-[1] rounded-full px-3.5 py-1.5 text-[13px] font-semibold text-ink-3 transition-colors", sym === x.id && "text-ink")}>{x.label}</button>)}
              </div>
              {q.last !== null && (
                <div className="num leading-tight"><div className="display-num text-[22px] text-ink">{q.last.toFixed(intel.digits)}</div>
                  {q.changePct !== null && <div className={cn("text-[12px] font-medium", q.changePct >= 0 ? "text-up" : "text-down")}>{q.changePct >= 0 ? "+" : "−"}{Math.abs(q.changePct).toFixed(2)}% · 24h</div>}</div>
              )}
            </div>
            <span className={cn("rounded-full px-3 py-1 text-[12px] font-semibold", intel.bias === "bullish" ? "bg-up-soft text-up" : intel.bias === "bearish" ? "bg-down-soft text-down" : "bg-inset text-ink-2")}>{biasText[intel.bias]}{intel.score !== null ? ` ${intel.score > 0 ? "+" : ""}${intel.score}` : ""}</span>
          </div>
          <IntelChart key={sym} symbol={sym} intel={intel} sample={sample} className="mt-4" />
        </Card>
      </RevealItem>

      <RevealItem className="span-4">
        <Card aria-labelledby="zones-title" className="flex h-full flex-col">
          <CardHeader id="zones-title" title="Zones and structure" caption={`${SYMS.find((x) => x.id === sym)!.label} · 1H zones, multi-timeframe structure`} href={`/app/markets?symbol=${sym}`} hrefLabel="Open chart" />
          <div className="mt-4 grid gap-2">
            <p className="card-kicker">Important zones</p>
            {intel.zones.length === 0 ? <p className="inset rounded-2xl px-3.5 py-3 text-[13px] text-ink-3">No qualified buy or sell zone right now.</p> : intel.zones.slice(0, 3).map((z) => (
              <div key={z.id} className="inset flex items-center gap-3 rounded-2xl px-3.5 py-2.5">
                <span className={cn("rounded-full px-2 py-0.5 text-[10.5px] font-bold uppercase tracking-[0.06em]", z.side === "buy" ? "bg-up-soft text-up" : "bg-down-soft text-down")}>{z.side}</span>
                <div className="min-w-0 flex-1">
                  <div className="num truncate text-[13.5px] font-semibold text-ink">{z.lower.toFixed(intel.digits)} – {z.upper.toFixed(intel.digits)}</div>
                  <div className="truncate text-[11.5px] text-ink-3">{z.status === "confirmed" ? "5M confirmed" : z.status === "in-zone" ? "Price in zone" : `${z.distanceATR ?? "—"} ATR away`} · {z.withTrend ? "with 4H trend" : "against 4H trend"}</div>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-4 grid gap-2">
            <p className="card-kicker">Market structure</p>
            <div className="grid grid-cols-4 gap-1.5">
              {TF_ORDER.map((tf) => {
                const t = intel.trends[tf];
                const last = intel.structure.find((x) => x.tf === tf)?.events.at(-1);
                return (
                  <div key={tf} className="inset min-w-0 rounded-2xl px-2 py-2 text-center">
                    <div className="text-[11px] font-semibold text-ink-3">{tf}</div>
                    <div className={cn("mx-auto mt-1 w-fit rounded-full px-1.5 py-0.5 text-[10.5px] font-semibold capitalize", trendCls[t ?? "none"])}>{t === null ? "n/a" : t === "none" ? "Range" : t}</div>
                    <div className="mt-1 truncate text-[10.5px] text-ink-3">{last ? last.kind : "—"}</div>
                  </div>
                );
              })}
            </div>
          </div>
          <div className="mt-4 grid gap-2">
            <p className="card-kicker">Fibonacci{intel.fib ? ` · ${intel.fib.direction === "up" ? "up-leg" : "down-leg"}` : ""}</p>
            {intel.fib ? (
              <div className="flex flex-wrap gap-1.5">
                {intel.fib.levels.map((l) => <span key={l.ratio} className="inset num rounded-full px-2.5 py-1 text-[11.5px] text-ink-2"><b className="font-semibold text-accent">{(l.ratio * 100).toFixed(1)}%</b> {l.price.toFixed(intel.digits)}</span>)}
              </div>
            ) : <p className="text-[12.5px] text-ink-3">No clean structural leg to measure.</p>}
          </div>
        </Card>
      </RevealItem>

      <RevealItem className="span-4">
        <Card aria-labelledby="ai-title" className="flex h-full flex-col">
          <CardHeader id="ai-title" title="AI trading intelligence" caption="Today’s outlook from the engine" icon={<span className="ai-orb h-8 w-8" aria-hidden><Sparkles className="relative z-[1] h-4 w-4 text-white" /></span>} />
          <div className="mt-4 grid gap-1.5 text-[13.5px] leading-relaxed">
            <p className="card-kicker">Today’s outlook</p>
            {outlook.slice(0, 3).map((l, i) => <p key={i} className={i === 0 ? "font-medium text-ink" : "text-ink-2"}>{l}</p>)}
          </div>
          <div className="mt-4 min-w-0">
            <p className="card-kicker mb-2">Intelligence</p>
            <IntelBubbles intel={{ ...intel, bubbles: intel.bubbles.slice(0, 1) }} sample={sample} />
          </div>
          <Link href="/app/ai-analysis" className="press mt-auto inline-flex items-center justify-center gap-2 rounded-full border border-line bg-[var(--surface-inset)] px-4 py-2.5 text-[13px] font-semibold text-ink hover:border-[var(--border-strong)]" style={{ marginTop: 16 }}>
            <WandSparkles className="h-4 w-4 text-accent" />Analyse a chart with AI
          </Link>
        </Card>
      </RevealItem>

      <RevealItem className="span-4">{news}</RevealItem>
      <RevealItem className="span-4">{calendar}</RevealItem>
    </>
  );
}
