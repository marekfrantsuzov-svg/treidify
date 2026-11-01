"use client";

import { CandlestickSeries, ColorType, CrosshairMode, HistogramSeries, LineStyle, createChart, createSeriesMarkers, type IChartApi, type IPriceLine, type ISeriesApi, type ISeriesMarkersPluginApi, type SeriesMarker, type Time, type UTCTimestamp } from "lightweight-charts";
import { useTheme } from "next-themes";
import { useCallback, useEffect, useRef, useState } from "react";
import type { Candle } from "@/lib/analytics/types";
import type { InstrumentIntel } from "@/lib/intelligence";
import { cn } from "@/lib/cn";
import { SlidingPill } from "@/components/ui/sliding-pill";

type Tf = "1M" | "5M" | "15M" | "1H" | "4H" | "1D";
const TFS: Tf[] = ["1M", "5M", "15M", "1H", "4H", "1D"];
type Layer = "zones" | "fib" | "liquidity" | "structure" | "volume";
const LAYERS: { id: Layer; label: string }[] = [{ id: "zones", label: "Zones" }, { id: "fib", label: "Fibonacci" }, { id: "liquidity", label: "Liquidity" }, { id: "structure", label: "Structure" }, { id: "volume", label: "Volume" }];

const css = (name: string) => getComputedStyle(document.documentElement).getPropertyValue(name).trim() || "#888";

interface Band { id: string; top: number; height: number; side: "buy" | "sell"; label: string }

/**
 * Interactive candlestick chart (TradingView Lightweight Charts, Apache-2.0, attribution kept on).
 * Overlays come only from the engine output passed in; zones are drawn as glass bands between their exact prices.
 */
export function IntelChart({ symbol, intel, initial, initialTf = "1H", sample, height = 420, className }: { symbol: string; intel: InstrumentIntel; initial?: Candle[]; initialTf?: Tf; sample?: boolean; height?: number; className?: string }) {
  const box = useRef<HTMLDivElement>(null);
  const chart = useRef<IChartApi | null>(null);
  const series = useRef<ISeriesApi<"Candlestick"> | null>(null);
  const vol = useRef<ISeriesApi<"Histogram"> | null>(null);
  const markers = useRef<ISeriesMarkersPluginApi<Time> | null>(null);
  const lines = useRef<IPriceLine[]>([]);
  const [tf, setTf] = useState<Tf>(initialTf);
  const [candles, setCandles] = useState<Candle[]>(initial ?? []);
  const [state, setState] = useState<"ready" | "loading" | "error">(initial?.length ? "ready" : "loading");
  const [err, setErr] = useState<string | null>(null);
  const [meta, setMeta] = useState<{ sample: boolean; freshness: string | null; method: string | null }>({ sample: !!sample, freshness: null, method: null });
  const [layers, setLayers] = useState<Record<Layer, boolean>>({ zones: true, fib: true, liquidity: true, structure: true, volume: false });
  const [bands, setBands] = useState<Band[]>([]);
  const { resolvedTheme } = useTheme();
  // Phone widths: axis labels only (no stacked titles), Fibonacci off by default, a legend under the chart instead.
  const [narrow, setNarrow] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 639px)");
    const on = () => setNarrow(mq.matches);
    on();
    if (mq.matches) setLayers((x) => ({ ...x, fib: false }));
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, []);

  // Create the chart once.
  useEffect(() => {
    if (!box.current) return;
    const c = createChart(box.current, {
      autoSize: true,
      layout: { background: { type: ColorType.Solid, color: "transparent" }, textColor: css("--text-3"), fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Inter Variable', sans-serif", fontSize: 11, attributionLogo: true },
      grid: { vertLines: { color: css("--chart-grid") }, horzLines: { color: css("--chart-grid") } },
      rightPriceScale: { borderVisible: false, scaleMargins: { top: 0.12, bottom: 0.12 } },
      timeScale: { borderVisible: false, timeVisible: true, secondsVisible: false, rightOffset: 6 },
      crosshair: { mode: CrosshairMode.Normal },
      handleScroll: true, handleScale: true,
    });
    series.current = c.addSeries(CandlestickSeries, { priceLineVisible: true, borderVisible: false });
    vol.current = c.addSeries(HistogramSeries, { priceScaleId: "vol", priceFormat: { type: "volume" }, visible: false });
    c.priceScale("vol").applyOptions({ scaleMargins: { top: 0.82, bottom: 0 } });
    markers.current = createSeriesMarkers(series.current, []);
    chart.current = c;
    return () => { c.remove(); chart.current = null; series.current = null; vol.current = null; };
  }, []);

  // Theme colours.
  useEffect(() => {
    const c = chart.current; if (!c) return;
    const up = css("--up"), down = css("--down");
    c.applyOptions({ layout: { textColor: css("--text-3") }, grid: { vertLines: { color: css("--chart-grid") }, horzLines: { color: css("--chart-grid") } }, crosshair: { vertLine: { color: css("--accent"), labelBackgroundColor: css("--accent") }, horzLine: { color: css("--accent"), labelBackgroundColor: css("--accent") } } });
    series.current?.applyOptions({ upColor: up, downColor: down, wickUpColor: up, wickDownColor: down, priceFormat: { type: "price", precision: intel.digits, minMove: 1 / 10 ** intel.digits } });
  }, [resolvedTheme, intel.digits]);

  // Load candles when the timeframe changes.
  useEffect(() => {
    if (tf === initialTf && initial?.length) { setCandles(initial); setState("ready"); return; }
    let live = true;
    setState("loading");
    fetch(`/api/market/candles?symbol=${symbol}&tf=${tf}`, { cache: "no-store" })
      .then(async (r) => ({ ok: r.ok, body: await r.json() }))
      .then(({ ok, body }) => {
        if (!live) return;
        if (!ok || !body.candles) { setErr(body.message ?? "Data unavailable."); setState("error"); return; }
        setCandles(body.candles); setMeta({ sample: !!body.sample, freshness: body.freshness ?? null, method: body.method ?? null }); setState("ready");
      })
      .catch(() => { if (live) { setErr("Data unavailable."); setState("error"); } });
    return () => { live = false; };
  }, [tf, symbol, initial, initialTf]);

  // Data.
  useEffect(() => {
    if (!series.current || !candles.length) return;
    series.current.setData(candles.map((c) => ({ time: c.t as UTCTimestamp, open: c.o, high: c.h, low: c.l, close: c.c })));
    const hasVol = candles.some((c) => c.v);
    vol.current?.setData(hasVol ? candles.map((c) => ({ time: c.t as UTCTimestamp, value: c.v ?? 0, color: c.c >= c.o ? css("--up-soft") : css("--down-soft") })) : []);
    chart.current?.timeScale().fitContent();
  }, [candles, resolvedTheme]);

  // Overlays.
  useEffect(() => {
    const s = series.current; if (!s) return;
    for (const l of lines.current) s.removePriceLine(l);
    lines.current = [];
    // Axis labels only: line titles pile up where levels cluster, so the legend under the chart names them instead.
    const add = (price: number, color: string, _title: string, style = LineStyle.Dashed) => lines.current.push(s.createPriceLine({ price, color, lineWidth: 1, lineStyle: style, axisLabelVisible: true, title: "" }));
    if (layers.fib && intel.fib) for (const l of intel.fib.levels) add(l.price, css("--accent-ice"), `Fib ${(l.ratio * 100).toFixed(1)}%`, LineStyle.Dotted);
    if (layers.liquidity) for (const p of intel.liquidity) add(p.price, css("--brand-pink") || "#ed74ce", p.side === "buy" ? "Equal highs" : "Equal lows", LineStyle.SparseDotted);
    vol.current?.applyOptions({ visible: layers.volume });
    const evs = layers.structure ? intel.structure.find((x) => x.tf === tf)?.events ?? [] : [];
    const m: SeriesMarker<Time>[] = evs.filter((e) => candles.some((c) => c.t === e.t)).map((e) => ({ time: e.t as UTCTimestamp, position: e.direction === "bullish" ? "belowBar" : "aboveBar", shape: e.direction === "bullish" ? "arrowUp" : "arrowDown", color: e.direction === "bullish" ? css("--up") : css("--down"), text: narrow ? undefined : e.kind }));
    markers.current?.setMarkers(m);
  }, [intel, layers, tf, candles, resolvedTheme, narrow]);

  // Zone bands follow the price scale.
  const measure = useCallback(() => {
    const s = series.current; if (!s || !layers.zones) { setBands((b) => (b.length ? [] : b)); return; }
    const next = intel.zones.flatMap((z) => {
      const a = s.priceToCoordinate(z.upper), b = s.priceToCoordinate(z.lower);
      if (a === null || b === null) return [];
      return [{ id: z.id, top: Math.min(a, b), height: Math.max(3, Math.abs(b - a)), side: z.side, label: narrow ? `${z.side === "buy" ? "BUY" : "SELL"} zone · 1H` : `${z.side === "buy" ? "Potential BUY" : "Potential SELL"} · 1H · ${z.lower.toFixed(intel.digits)}–${z.upper.toFixed(intel.digits)}` }];
    });
    setBands((prev) => (JSON.stringify(prev) === JSON.stringify(next) ? prev : next));
  }, [intel, layers.zones, narrow]);
  useEffect(() => {
    const c = chart.current; if (!c) return;
    let raf = 0;
    const tick = () => { cancelAnimationFrame(raf); raf = requestAnimationFrame(measure); };
    c.timeScale().subscribeVisibleLogicalRangeChange(tick);
    c.timeScale().subscribeSizeChange(tick);
    const t = setTimeout(tick, 60);
    const onWheel = () => tick();
    box.current?.addEventListener("wheel", onWheel, { passive: true });
    box.current?.addEventListener("pointermove", onWheel, { passive: true });
    const el = box.current;
    return () => { c.timeScale().unsubscribeVisibleLogicalRangeChange(tick); c.timeScale().unsubscribeSizeChange(tick); clearTimeout(t); cancelAnimationFrame(raf); el?.removeEventListener("wheel", onWheel); el?.removeEventListener("pointermove", onWheel); };
  }, [measure, candles]);

  return (
    <div className={cn("flex min-w-0 flex-col", className)}>
      <div className="flex flex-wrap items-center gap-2">
        <div role="tablist" aria-label="Timeframe" className="inset relative flex rounded-full p-0.5">
          <SlidingPill watch={tf} className="bg-brand rounded-full shadow-[0_4px_12px_-4px_var(--accent-glow)]" />
          {TFS.map((t) => (
            <button key={t} role="tab" aria-selected={tf === t} data-active={tf === t} onClick={() => setTf(t)} className={cn("relative z-[1] rounded-full px-2.5 py-1 text-[12px] font-medium text-ink-3 transition-colors hover:text-ink", tf === t && "text-white hover:text-white")}>{t}</button>
          ))}
        </div>
        <div className="flex flex-wrap gap-1" aria-label="Overlays">
          {LAYERS.map((l) => (
            <button key={l.id} aria-pressed={layers[l.id]} onClick={() => setLayers((x) => ({ ...x, [l.id]: !x[l.id] }))} className={cn("press rounded-full border px-2.5 py-1 text-[11.5px] font-medium transition-colors", layers[l.id] ? "border-transparent bg-accent-soft text-accent" : "border-line text-ink-3 hover:text-ink")}>{l.label}</button>
          ))}
        </div>
        <span className="ml-auto text-[11px] text-ink-3">{(meta.sample || sample) ? <span className="font-semibold text-warn">SAMPLE BARS</span> : meta.method === "computed-ice" || (symbol === "DXY" && !meta.sample) ? "DXY computed from ICE weights" : null}</span>
      </div>
      <div className="relative mt-3 overflow-hidden rounded-3xl" style={{ height }}>
        <div ref={box} className="absolute inset-0" />
        {bands.map((b) => (
          <div key={b.id} className={cn("pointer-events-none absolute left-0 right-[64px] rounded-md border backdrop-blur-[1px]", b.side === "buy" ? "border-[color-mix(in_oklab,var(--up)_45%,transparent)] bg-[color-mix(in_oklab,var(--up)_12%,transparent)]" : "border-[color-mix(in_oklab,var(--down)_45%,transparent)] bg-[color-mix(in_oklab,var(--down)_12%,transparent)]")} style={{ top: b.top, height: b.height }}>
            <span className={cn("absolute left-2 top-1/2 -translate-y-1/2 rounded-full px-2 py-0.5 text-[10.5px] font-semibold backdrop-blur-md", b.side === "buy" ? "bg-up-soft text-up" : "bg-down-soft text-down")}>{b.label}</span>
          </div>
        ))}
        {state === "loading" && <div className="absolute inset-0 grid place-items-center"><div className="skeleton h-full w-full rounded-3xl" /></div>}
        {state === "error" && <div className="absolute inset-0 grid place-items-center p-6 text-center text-sm text-ink-2">{err} Nothing is drawn rather than a guess.</div>}
      </div>
      {(layers.fib || layers.liquidity || layers.zones) && (
        <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 px-1 text-[11px] text-ink-3" aria-label="Chart legend">
          {layers.zones && <span className="inline-flex items-center gap-1.5"><span className="h-2 w-3 rounded-sm border border-[color-mix(in_oklab,var(--up)_45%,transparent)] bg-up-soft" />Zones</span>}
          {layers.fib && intel.fib && <span className="inline-flex items-center gap-1.5"><span className="h-0 w-3 border-t-2 border-dotted border-[var(--accent-ice)]" />Fibonacci {intel.fib.levels.map((l) => `${(l.ratio * 100).toFixed(1)}`).join(" · ")}%</span>}
          {layers.liquidity && intel.liquidity.length > 0 && <span className="inline-flex items-center gap-1.5"><span className="h-0 w-3 border-t-2 border-dotted border-[var(--brand-pink)]" />Equal highs / lows</span>}
        </div>
      )}
    </div>
  );
}
