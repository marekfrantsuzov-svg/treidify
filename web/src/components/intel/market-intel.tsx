"use client";

import { Activity, AlertTriangle, Clock3, Database } from "lucide-react";
import { useEffect, useState } from "react";
import type { IntelSnapshot } from "@/server/market/intelligence";
import type { InstrumentIntel } from "@/lib/intelligence";
import { cn } from "@/lib/cn";
import { Glass } from "@/components/ui/glass";
import { SlidingPill } from "@/components/ui/sliding-pill";
import { Gauge, biasText, biasTone } from "./gauge";
import { IntelBubbles } from "./bubbles";
import { IntelChart } from "./intel-chart";
import { setFreshness } from "./freshness-store";

const fresh: Record<string, { label: string; cls: string }> = {
  live: { label: "Up to date", cls: "bg-up-soft text-up" },
  delayed: { label: "Delayed", cls: "bg-warn-soft text-warn" },
  stale: { label: "Stale data", cls: "bg-down-soft text-down" },
  closed: { label: "Market closed", cls: "bg-inset text-ink-2" },
};

/** Polls the intelligence endpoint once a minute while the tab is visible (live data only). */
export function useIntel(initial: IntelSnapshot) {
  const [snap, setSnap] = useState(initial);
  useEffect(() => {
    setFreshness({ mode: snap.mode, freshness: snap.freshness, asOf: snap.asOf, vendor: snap.vendor });
  }, [snap]);
  useEffect(() => {
    if (initial.mode === "sample") return;
    let stop = false;
    const tick = async () => {
      if (document.visibilityState !== "visible") return;
      try { const r = await fetch("/api/market/intel", { cache: "no-store" }); if (r.ok && !stop) setSnap(await r.json()); } catch { /* keep the last good snapshot; freshness will show it ageing */ }
    };
    const id = setInterval(tick, 60_000);
    return () => { stop = true; clearInterval(id); };
  }, [initial.mode]);
  return snap;
}

export function DataChips({ s }: { s: IntelSnapshot }) {
  const time = new Date(s.asOf).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  return (
    <div className="flex flex-wrap items-center gap-1.5 text-[11.5px] font-medium">
      {s.mode === "sample" ? (
        <span className="inline-flex items-center gap-1 rounded-full bg-warn-soft px-2.5 py-1 text-warn"><AlertTriangle className="h-3.5 w-3.5" />Sample bars · market data not connected</span>
      ) : (
        <>
          <span className="inline-flex items-center gap-1 rounded-full bg-inset px-2.5 py-1 text-ink-2"><Database className="h-3.5 w-3.5" />{s.vendor === "twelvedata" ? "Twelve Data" : s.vendor}{s.dxyMethod === "computed-ice" ? " · DXY computed (ICE formula)" : ""}</span>
          {s.freshness && <span className={cn("inline-flex items-center gap-1 rounded-full px-2.5 py-1", fresh[s.freshness]?.cls)}><Activity className="h-3.5 w-3.5" />{fresh[s.freshness]?.label}</span>}
        </>
      )}
      <span className="inline-flex items-center gap-1 rounded-full bg-inset px-2.5 py-1 text-ink-3"><Clock3 className="h-3.5 w-3.5" />Calculated {time}</span>
    </div>
  );
}

export function outlookLines(s: IntelSnapshot): string[] {
  const g = s.gold, d = s.dxy;
  const out: string[] = [];
  if (g.bias === "insufficient") return ["Not enough verified data to form an outlook. Treidify shows nothing rather than a guess."];
  const s4 = g.components.find((c) => c.id === "structure4h")?.detail;
  out.push(`Gold is ${biasText[g.bias].toLowerCase()}${g.score !== null ? ` (${g.score > 0 ? "+" : ""}${g.score})` : ""}. ${s4 ?? ""}`);
  if (d.bias !== "insufficient") out.push(`DXY is ${biasText[d.bias].toLowerCase()}${d.score !== null ? ` (${d.score > 0 ? "+" : ""}${d.score})` : ""}${d.bias === "bearish" ? ", which may support Gold" : d.bias === "bullish" ? ", which may weigh on Gold" : ""}.`);
  const z = g.zones.find((x) => x.withTrend) ?? g.zones[0];
  if (z) out.push(`Wait for: ${z.confirmation}`);
  if (g.invalidation) out.push(g.invalidation);
  const risk = g.limitations.find((l) => l.startsWith("High-impact"));
  if (risk) out.push(risk);
  return out;
}

export const SYMS = [{ id: "XAUUSD", label: "Gold" }, { id: "DXY", label: "DXY" }, { id: "XAGUSD", label: "Silver" }] as const;

export function MarketIntel({ initial }: { initial: IntelSnapshot }) {
  const s = useIntel(initial);
  const [sym, setSym] = useState<(typeof SYMS)[number]["id"]>("XAUUSD");
  const intel: InstrumentIntel = sym === "XAUUSD" ? s.gold : sym === "DXY" ? s.dxy : s.silver;
  const sample = s.mode === "sample";
  const q = s.quotes[sym];
  return (
    <div className="grid gap-4">
      <section aria-labelledby="mi-title" className="relative">
        <Glass strong className="relative overflow-hidden p-4 sm:p-7">
          <div aria-hidden className="pointer-events-none absolute -left-24 -top-32 h-80 w-80 rounded-full bg-[radial-gradient(circle,var(--glow-a),transparent_70%)] blur-2xl" />
          <div aria-hidden className="pointer-events-none absolute -bottom-36 right-0 h-80 w-96 rounded-full bg-[radial-gradient(circle,var(--glow-b),transparent_70%)] blur-2xl" />
          <div className="relative flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-accent">Market Intelligence Today</p>
              <h2 id="mi-title" className="mt-1 text-[24px] font-semibold leading-tight tracking-[-0.03em] text-ink sm:text-[30px]">
                Gold <span className={biasTone[s.gold.bias]}>{biasText[s.gold.bias]}</span><span className="text-ink-3"> · </span>DXY <span className={biasTone[s.dxy.bias]}>{biasText[s.dxy.bias]}</span>
              </h2>
            </div>
            <DataChips s={s} />
          </div>
          {sample && <p className="relative mt-3 max-w-3xl rounded-2xl bg-warn-soft px-3.5 py-2 text-[12.5px] leading-snug text-ink-2 sm:px-4 sm:py-2.5 sm:text-[13px]">{s.message}</p>}
          <div className="relative mt-5 grid grid-cols-3 gap-1 sm:gap-2">
            <Gauge title="Gold" subtitle="XAUUSD · multi-timeframe" bias={s.gold.bias} score={s.gold.score} confidence={s.gold.confidence} components={s.gold.components} limitations={s.gold.limitations} invalidation={s.gold.invalidation} asOf={s.asOf} sample={sample} />
            <Gauge title="DXY" subtitle="US Dollar Index" bias={s.dxy.bias} score={s.dxy.score} confidence={s.dxy.confidence} components={s.dxy.components} limitations={s.dxy.limitations} invalidation={s.dxy.invalidation} asOf={s.asOf} sample={sample} />
            <Gauge title="Overall" subtitle="For Gold, with DXY and event risk" bias={s.overall.bias} score={s.overall.score} detail={s.overall.detail} asOf={s.asOf} sample={sample} />
          </div>
          <div className="relative mt-4 grid gap-1.5 rounded-3xl bg-inset p-4 text-[14px] leading-relaxed text-ink sm:p-5">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-3">Today’s outlook</p>
            {outlookLines(s).map((l, i) => <p key={i} className={i === 0 ? "font-medium" : "text-ink-2"}>{l}</p>)}
          </div>
        </Glass>
      </section>

      <section aria-labelledby="chart-title">
        <Glass className="p-4 sm:p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <h2 id="chart-title" className="sr-only">Chart</h2>
              <div role="tablist" aria-label="Instrument" className="inset relative flex rounded-full p-1">
                <SlidingPill watch={sym} className="rounded-full bg-[var(--surface-strong)] shadow-[var(--shadow)]" />
                {SYMS.map((x) => <button key={x.id} role="tab" aria-selected={sym === x.id} data-active={sym === x.id} onClick={() => setSym(x.id)} className={cn("relative z-[1] rounded-full px-3.5 py-1.5 text-[13px] font-semibold text-ink-3 transition-colors", sym === x.id && "text-ink")}>{x.label}</button>)}
              </div>
              {q.last !== null && (
                <div className="num leading-tight"><div className="text-[22px] font-semibold tracking-[-0.02em] text-ink">{q.last.toFixed(intel.digits)}</div>
                  {q.changePct !== null && <div className={cn("text-[12px] font-medium", q.changePct >= 0 ? "text-up" : "text-down")}>{q.changePct >= 0 ? "+" : "−"}{Math.abs(q.changePct).toFixed(2)}% · 24h</div>}</div>
              )}
            </div>
            <span className={cn("rounded-full px-3 py-1 text-[12px] font-semibold", intel.bias === "bullish" ? "bg-up-soft text-up" : intel.bias === "bearish" ? "bg-down-soft text-down" : "bg-inset text-ink-2")}>{biasText[intel.bias]}{intel.score !== null ? ` ${intel.score > 0 ? "+" : ""}${intel.score}` : ""}</span>
          </div>
          <div className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1fr)_340px]">
            <IntelChart key={sym} symbol={sym} intel={intel} sample={sample} />
            <div className="min-w-0">
              <p className="mb-2 px-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-3">Intelligence</p>
              <IntelBubbles intel={intel} sample={sample} className="xl:max-h-[470px] xl:overflow-y-auto xl:pr-1" />
            </div>
          </div>
        </Glass>
      </section>
    </div>
  );
}
