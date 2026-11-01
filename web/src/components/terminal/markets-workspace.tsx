"use client";

import { X } from "lucide-react";
import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import type { IntelSnapshot } from "@/server/market/intelligence";
import type { SDZone, TfOverlays } from "@/lib/intelligence/overlays";
import { cn } from "@/lib/cn";
import { Glass } from "@/components/ui/glass";
import { SlidingPill } from "@/components/ui/sliding-pill";
import { AssetMark } from "@/components/ui/flags";
import { Modal } from "@/components/intel/modal";
import { DataChips, useIntel } from "@/components/intel/market-intel";
import { biasText } from "@/components/intel/bias";
import { FibTable, LiquidityList, PanelIcons, PanelSection, StructureTimeline, ZoneList } from "./context-panel";
import { ZoneDetail } from "./zone-detail";
import type { ChartMeta, ChartTf, Layer, Layers } from "./terminal-chart";

const TerminalChart = dynamic(() => import("./terminal-chart").then((m) => m.TerminalChart), { ssr: false, loading: () => <div className="skeleton h-[560px] rounded-2xl" role="status" aria-label="Loading chart" /> });

const SYMS = [{ id: "XAUUSD", label: "Gold", name: "Gold / US Dollar" }, { id: "DXY", label: "DXY", name: "US Dollar Index" }, { id: "XAGUSD", label: "Silver", name: "Silver / US Dollar" }] as const;
type Sym = (typeof SYMS)[number]["id"];

/** Markets: the interactive chart workspace. Chart on the left, what it draws (and why) on the right. */
export function MarketsWorkspace({ initial, initialSym, initialLayers, initialTf }: { initial: IntelSnapshot; initialSym: Sym; initialLayers: Partial<Layers>; initialTf: ChartTf }) {
  const s = useIntel(initial);
  const [sym, setSym] = useState<Sym>(initialSym);
  const [o, setO] = useState<TfOverlays | null>(null);
  const [meta, setMeta] = useState<ChartMeta | null>(null);
  const [sel, setSel] = useState<SDZone | null>(null);
  const [layers, setLayers] = useState<Layers>({ zones: true, fib: false, liquidity: false, structure: false, volume: false, ...initialLayers });
  const [fibSide, setFibSide] = useState<"active" | "bullish" | "bearish">("active");
  const [wide, setWide] = useState(true);
  useEffect(() => { const mq = window.matchMedia("(min-width: 1280px)"); const on = () => setWide(mq.matches); on(); mq.addEventListener("change", on); return () => mq.removeEventListener("change", on); }, []);
  const intel = sym === "XAUUSD" ? s.gold : sym === "DXY" ? s.dxy : s.silver;
  const q = s.quotes[sym];
  const sample = s.mode === "sample";
  const info = SYMS.find((x) => x.id === sym)!;
  const select = (z: SDZone | null) => setSel((cur) => (z && cur?.id === z.id ? null : z));
  const on = (l: Layer) => layers[l];

  return (
    <div className="grid gap-4">
      <Glass className="p-3.5 sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex min-w-0 flex-wrap items-center gap-3">
            <div role="tablist" aria-label="Instrument" className="inset relative flex rounded-full p-1">
              <SlidingPill watch={sym} className="rounded-full bg-[var(--surface-strong)] shadow-[var(--shadow)]" />
              {SYMS.map((x) => <button key={x.id} role="tab" aria-selected={sym === x.id} data-active={sym === x.id} onClick={() => { setSym(x.id); setSel(null); }} className={cn("relative z-[1] min-h-[34px] rounded-full px-4 text-[13px] font-semibold text-ink-3 transition-colors", sym === x.id && "text-ink")}>{x.label}</button>)}
            </div>
            <div className="flex items-center gap-2.5">
              <AssetMark symbol={sym} size={34} />
              <div className="leading-tight">
                <div className="text-[13px] font-semibold text-ink">{sym}</div>
                <div className="text-[11.5px] text-ink-3">{info.name}</div>
              </div>
              {q.last !== null && (
                <div className="num ml-2 leading-tight">
                  <div className="text-[20px] font-semibold tracking-[-0.02em] text-ink">{q.last.toFixed(intel.digits)}</div>
                  {q.changePct !== null && <div className={cn("text-[11.5px] font-semibold", q.changePct >= 0 ? "text-up" : "text-down")}>{q.changePct >= 0 ? "+" : "−"}{Math.abs(q.changePct).toFixed(2)}% · 24h</div>}
                </div>
              )}
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className={cn("rounded-full px-3 py-1 text-[12px] font-semibold", intel.bias === "bullish" ? "bg-up-soft text-up" : intel.bias === "bearish" ? "bg-down-soft text-down" : "bg-inset text-ink-2")}>{biasText[intel.bias]} · 4H {intel.trends["4H"] ?? "n/a"}</span>
            <DataChips s={s} />
          </div>
        </div>

        <div className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
          <TerminalChart
            key={sym} symbol={sym} digits={intel.digits} htfTrend={intel.trends["4H"]} sample={sample} initialTf={initialTf} height={wide ? 600 : 440}
            defaultLayers={layers} onLayers={setLayers} onOverlays={(x, m) => { setO(x); setMeta(m); }}
            selectedZoneId={sel?.id ?? null} onSelectZone={(z) => select(z)} fibSide={fibSide}
          />

          <aside className="grid content-start gap-3 xl:max-h-[700px] xl:overflow-y-auto xl:pr-1" aria-label="Chart context">
            {wide && sel && o ? (
              <div className="cp-section">
                <div className="mb-2 flex items-center justify-between"><h3 className="text-[13px] font-semibold text-ink">Zone explanation</h3><button onClick={() => setSel(null)} aria-label="Close zone explanation" className="grid h-8 w-8 place-items-center rounded-full text-ink-2 hover:bg-inset"><X className="h-4 w-4" /></button></div>
                <ZoneDetail zone={sel} overlays={o} htfTrend={intel.trends["4H"]} sample={meta?.sample || sample} />
              </div>
            ) : o ? (
              <>
                <PanelSection icon={PanelIcons.zones} title={`Supply & demand · ${o.tf}`}><ZoneList o={o} selected={sel?.id} onSelect={select} /></PanelSection>
                {on("fib") && (
                  <PanelSection icon={PanelIcons.fib} title={`Fibonacci · ${o.tf}`} aside={
                    <div role="tablist" aria-label="Fibonacci direction" className="inset flex rounded-full p-0.5 text-[11px] font-semibold">
                      {(["active", "bullish", "bearish"] as const).map((k) => <button key={k} role="tab" aria-selected={fibSide === k} onClick={() => setFibSide(k)} className={cn("rounded-full px-2 py-1 capitalize text-ink-3", fibSide === k && "bg-[var(--surface-strong)] text-ink shadow-[var(--shadow)]")}>{k}</button>)}
                    </div>
                  }><FibTable o={o} side={fibSide} /></PanelSection>
                )}
                {on("liquidity") && <PanelSection icon={PanelIcons.liquidity} title={`Liquidity · ${o.tf}`}><LiquidityList o={o} /><p className="mt-2 text-[11px] text-ink-3">Estimated from swing highs and lows (High / Medium / Low). Not exchange order-book liquidity.</p></PanelSection>}
                {on("structure") && <PanelSection icon={PanelIcons.structure} title={`Market structure · ${o.tf}`}><p className="mb-2 text-[12px] text-ink-2">{o.tf} structure is <b className={o.trend === "bullish" ? "text-up" : o.trend === "bearish" ? "text-down" : "text-ink"}>{o.trend === "none" ? "unconfirmed" : o.trend}</b>. Accent-outlined candles are displacement.</p><StructureTimeline o={o} /></PanelSection>}
                {!on("fib") && !on("liquidity") && !on("structure") && <p className="px-1 text-[12px] text-ink-3">Turn on Fibonacci, Liquidity or Structure above the chart to see their levels here. Click any zone for its full explanation.</p>}
              </>
            ) : <div className="skeleton h-64 rounded-2xl" />}
          </aside>
        </div>
      </Glass>

      {!wide && (
        <Modal open={!!sel && !!o} onClose={() => setSel(null)} title={sel ? `${sel.side === "buy" ? "Buy" : "Sell"} zone · ${sym} ${sel.tf}` : ""} subtitle="Why this zone exists, what confirms it and what invalidates it">
          {sel && o && <ZoneDetail zone={sel} overlays={o} htfTrend={intel.trends["4H"]} sample={meta?.sample || sample} />}
        </Modal>
      )}
    </div>
  );
}
