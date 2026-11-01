"use client";

import { ArrowDownRight, ArrowRight, ArrowUpRight, CircleCheck, CircleDashed, Clock3, Expand, Hourglass, Minimize, Sparkles } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import type { IntelSnapshot } from "@/server/market/intelligence";
import { tradeSetup, type TradeSetup } from "@/lib/intelligence";
import { cn } from "@/lib/cn";
import { formatPips } from "@/lib/trading/pips";
import { AssetMark } from "@/components/ui/flags";
import dynamic from "next/dynamic";
import { useIntel } from "@/components/intel/market-intel";

// The chart library loads after first paint, so the dashboard text is interactive sooner.
const TerminalChart = dynamic(() => import("@/components/terminal/terminal-chart").then((m) => m.TerminalChart), {
  ssr: false,
  loading: () => <div className="skeleton h-[392px] flex-1 rounded-2xl sm:h-auto sm:min-h-[372px]" role="status" aria-label="Loading chart" />,
});

const fmt = (v: number, d = 2) => v.toLocaleString("en-US", { minimumFractionDigits: d, maximumFractionDigits: d });
function ago(iso: string, now: number) {
  const m = Math.max(0, Math.round((now - Date.parse(iso)) / 60000));
  return m < 1 ? "just now" : m < 60 ? `${m} min ago` : m < 1440 ? `${Math.round(m / 60)} h ago` : `${Math.round(m / 1440)} d ago`;
}
function useClock() {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => { setNow(Date.now()); const id = setInterval(() => setNow(Date.now()), 30_000); return () => clearInterval(id); }, []);
  return now;
}

/** Signal quality: three segments (low, medium, high). Not a probability, so no percentage. */
function QualityRing({ quality }: { quality: TradeSetup["quality"] }) {
  const n = quality === "high" ? 3 : quality === "medium" ? 2 : quality === "low" ? 1 : 0;
  const r = 13, c = 2 * Math.PI * r, seg = c / 3;
  return (
    <svg width="34" height="34" viewBox="0 0 34 34" aria-hidden className="shrink-0">
      {[0, 1, 2].map((i) => <circle key={i} cx="17" cy="17" r={r} fill="none" strokeWidth="4.5" strokeLinecap="round" stroke={i < n ? "var(--accent)" : "var(--surface-inset)"} strokeDasharray={`${seg - 5} ${c - seg + 5}`} strokeDashoffset={-i * seg} transform="rotate(-90 17 17)" />)}
    </svg>
  );
}

/**
 * The XAUUSD chart card and the AI Market Analysis card (reference 1, second row). Both read one polled intelligence
 * snapshot; the setup comes from the engine's tradeSetup(), which enforces the 50-pip stop rule.
 */
export function GoldDesk({ initial }: { initial: IntelSnapshot }) {
  const s = useIntel(initial);
  const g = s.gold;
  const q = s.quotes.XAUUSD;
  const sample = s.mode === "sample";
  const setup = useMemo(() => tradeSetup(g), [g]);
  const now = useClock();
  const card = useRef<HTMLElement>(null);
  const [full, setFull] = useState(false);
  const [vh, setVh] = useState(800);
  useEffect(() => {
    const on = () => { setFull(document.fullscreenElement === card.current); setVh(window.innerHeight); };
    document.addEventListener("fullscreenchange", on);
    return () => document.removeEventListener("fullscreenchange", on);
  }, []);
  const toggleFull = () => { if (document.fullscreenElement) void document.exitFullscreen(); else void card.current?.requestFullscreen?.(); };
  const [narrow, setNarrow] = useState(false);
  useEffect(() => { const mq = window.matchMedia("(max-width: 639px)"); const on = () => setNarrow(mq.matches); on(); mq.addEventListener("change", on); return () => mq.removeEventListener("change", on); }, []);

  const valid = setup.status === "valid";
  const why = valid
    ? `Why ${setup.side === "buy" ? "BUY" : "SELL"} here?`
    : "Why WAIT?";

  return (
    <>
      <section ref={card} aria-labelledby="xau-title" className="dcard dcard-pad d-chart chart-full flex flex-col">
        <TerminalChart
          symbol="XAUUSD" digits={g.digits} htfTrend={g.trends["4H"]} sample={sample} initialTf="1H" showToggles={full} defaultLayers={{ zones: true }}
          fill={!narrow && !full} height={full ? Math.max(360, vh - 260) : 330}
          lead={
            <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1.5 max-sm:w-full">
              <AssetMark symbol="XAUUSD" size={narrow ? 34 : 42} />
              <div className="min-w-0 leading-tight">
                <h2 id="xau-title" className="text-[18px] font-semibold tracking-[-0.015em] text-ink sm:text-[20px]">XAUUSD</h2>
                <p className="whitespace-nowrap text-[12.5px] text-ink-2">Gold / US Dollar</p>
              </div>
              {q.last !== null && (
                <div className="num flex items-baseline gap-2 leading-tight max-sm:basis-full sm:ml-3 sm:block">
                  <div className="text-[24px] font-semibold tracking-[-0.02em] text-ink sm:text-[26px]">{fmt(q.last, g.digits)}</div>
                  {q.changePct !== null && (
                    <div className={cn("text-[13px] font-semibold", q.changePct >= 0 ? "text-up" : "text-down")}>
                      {q.changePct >= 0 ? "+" : "−"}{fmt(Math.abs((q.last * q.changePct) / (100 + q.changePct)), g.digits)} ({q.changePct >= 0 ? "+" : "−"}{Math.abs(q.changePct).toFixed(2)}%){sample && <span className="ml-1.5 rounded-md bg-warn-soft px-1.5 py-px text-[10.5px] font-semibold text-warn">Sample</span>}
                    </div>
                  )}
                </div>
              )}
            </div>
          }
          actions={<button onClick={toggleFull} aria-label={full ? "Exit full screen" : "Full screen chart"} title={full ? "Exit full screen" : "Full screen"} className="grid h-8 w-8 place-items-center rounded-full text-ink-2 transition-colors hover:bg-[var(--surface-inset)] hover:text-ink">{full ? <Minimize className="h-[18px] w-[18px]" /> : <Expand className="h-[18px] w-[18px]" />}</button>}
          className="flex-1"
        />
        <div className="mt-2.5 grid gap-2.5 border-t border-line pt-2.5 sm:grid-cols-[auto_minmax(0,1fr)_auto] sm:items-center">
          <div className="flex items-center gap-2.5">
            <span className="grid h-9 w-9 place-items-center rounded-full bg-accent-soft text-accent"><Sparkles className="h-[18px] w-[18px]" /></span>
            <div className="leading-tight"><div className="text-[14.5px] font-semibold text-ink">AI Analysis</div><div className="text-[12px] text-ink-3" suppressHydrationWarning>{now ? `Updated ${ago(s.asOf, now)}` : " "}</div></div>
          </div>
          <div className="min-w-0 sm:border-l sm:border-line sm:pl-4">
            <div className="text-[14px] font-semibold text-ink">{why}</div>
            <p className="line-clamp-2 text-[12px] leading-snug text-ink-2">{setup.reasons.slice(0, 2).join(" ")}</p>
          </div>
          <Link href="/app/intelligence" className="press inline-flex h-9 items-center justify-center gap-1.5 justify-self-start rounded-full bg-accent-soft px-4 text-[13px] font-semibold text-accent hover:brightness-105 sm:justify-self-end">Full Analysis<ArrowRight className="h-4 w-4" /></Link>
        </div>
      </section>

      <section aria-labelledby="ai-title" className="dcard dcard-pad d-ai flex flex-col">
        <h2 id="ai-title" className="dcard-title"><Sparkles />AI Market Analysis</h2>
        <div className="mt-3">
          {valid ? (
            <span className={cn("inline-flex items-center gap-1.5 rounded-xl px-2.5 py-1.5 text-[12.5px] font-bold tracking-[0.02em] text-white", setup.side === "buy" ? "bg-up" : "bg-down")}>
              {setup.side === "buy" ? <ArrowUpRight className="h-4 w-4" /> : <ArrowDownRight className="h-4 w-4" />}{setup.side === "buy" ? "BUY SETUP" : "SELL SETUP"}
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 rounded-xl bg-warn-soft px-2.5 py-1.5 text-[12px] font-bold tracking-[0.02em] text-warn"><Hourglass className="h-4 w-4 shrink-0" />WAIT · NO VALID SETUP</span>
          )}
        </div>
        {valid ? (
          <dl className="num mt-3 grid gap-1.5 text-[13.5px]">
            <Row k="Entry" v={`${fmt(setup.entry!.lower, g.digits)} – ${fmt(setup.entry!.upper, g.digits)}`} />
            {setup.targets.map((t, i) => <Row key={t} k={`TP${i + 1}`} v={fmt(t, g.digits)} />)}
            <Row k="SL" v={`${fmt(setup.stop!, g.digits)}`} note={formatPips("XAUUSD", setup.stopPips!)} />
          </dl>
        ) : (
          <div className="mt-2.5 grid gap-2 text-[12px] leading-snug text-ink-2">
            {setup.entry && setup.stop !== null && (
              <dl className="num grid gap-1 rounded-xl bg-[var(--surface-inset)] px-2.5 py-2 text-[12px] text-ink-2 [&>div]:flex [&>div]:flex-wrap [&>div]:justify-between [&>div]:gap-x-2 [&_dd]:whitespace-nowrap [&_dd]:font-semibold [&_dd]:text-ink">
                <div><dt className="capitalize">{setup.side} zone</dt><dd>{fmt(setup.entry.lower, g.digits)} – {fmt(setup.entry.upper, g.digits)}</dd></div>

                <div className={cn("font-semibold", setup.stopPips !== null && setup.maxStopPips !== null && setup.stopPips > setup.maxStopPips && "[&_dd]:!text-[var(--down-ink,var(--down))]")}><dt>Structural stop</dt><dd>{setup.stopPips} / {setup.maxStopPips} pips</dd></div>
              </dl>
            )}
            <p className="line-clamp-3 text-[11.5px] min-[1360px]:hidden">{setup.stopPips !== null && setup.maxStopPips !== null && setup.stopPips > setup.maxStopPips
              ? `Stop at ${fmt(setup.stop!, g.digits)} is beyond the ${setup.maxStopPips}-pip limit. No trade; the stop is never tightened.`
              : setup.reasons[0]}</p>
          </div>
        )}
        <div className="mt-auto flex flex-wrap items-center gap-x-2.5 gap-y-1 pt-2.5" title="XAUUSD: 1 pip = $0.10 of price movement (10 pips = $1.00). Setups needing a structural stop over 50 pips ($5.00) are shown as WAIT. Analysis, not advice.">
          <QualityRing quality={setup.quality} />
          <div className="min-w-0 leading-tight">
            <div className="text-[12px] text-ink-2">Signal quality</div>
            <div className="text-[14px] font-semibold capitalize text-ink">{setup.quality ?? "None"}</div>
          </div>
          <div className="ml-auto text-right text-[11px] leading-tight text-ink-3"><div>1H zone · 5M confirm</div><div className="inline-flex items-center gap-1" suppressHydrationWarning><Clock3 className="h-3 w-3" />{now ? ago(setup.asOf, now) : ""}</div></div>
        </div>
        
      </section>
    </>
  );
}

function Row({ k, v, note }: { k: string; v: string; note?: string }) {
  return (
    <div className="flex items-center gap-2">
      <CircleCheck className="h-[18px] w-[18px] shrink-0 text-up" aria-hidden />
      <dt className="w-12 text-ink-2">{k}:</dt>
      <dd className="ml-auto font-semibold text-ink">{v}{note && <span className="ml-1.5 text-[11.5px] font-medium text-ink-3">({note})</span>}</dd>
    </div>
  );
}
