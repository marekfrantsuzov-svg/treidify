"use client";

import { CandlestickSeries, ColorType, CrosshairMode, HistogramSeries, createChart, createSeriesMarkers, type IChartApi, type ISeriesApi, type ISeriesMarkersPluginApi, type MouseEventParams, type SeriesMarker, type Time, type UTCTimestamp } from "lightweight-charts";
import { useTheme } from "next-themes";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Candle } from "@/lib/analytics/types";
import { computeOverlays, type OverlayTf, type SDZone, type TfOverlays } from "@/lib/intelligence/overlays";
import type { Trend } from "@/lib/intelligence/structure";
import { cn } from "@/lib/cn";
import { SlidingPill } from "@/components/ui/sliding-pill";
import { Modal } from "@/components/intel/modal";
import { ZoneDetail, fmtPrice, statusText } from "./zone-detail";

export type ChartTf = "5M" | "15M" | "1H" | "4H";
export const CHART_TFS: ChartTf[] = ["5M", "15M", "1H", "4H"];
export type Layer = "zones" | "fib" | "liquidity" | "structure" | "volume";
export const LAYERS: { id: Layer; label: string }[] = [
  { id: "zones", label: "Zones" }, { id: "fib", label: "Fibonacci" }, { id: "liquidity", label: "Liquidity" }, { id: "structure", label: "Structure" }, { id: "volume", label: "Volume" },
];
export type Layers = Record<Layer, boolean>;
export interface ChartMeta { sample: boolean; freshness: string | null; method: string | null; lastBarAt: string | null }

const css = (name: string) => (typeof window === "undefined" ? "#888" : getComputedStyle(document.documentElement).getPropertyValue(name).trim() || "#888");

interface Box { id: string; left: number; right: number; top: number; bottom: number }
interface ZoneBox extends Box { z: SDZone; labelTop: number | null }
interface FibLine { ratio: number; price: number; y: number; left: number }
interface LiqBox extends Box { b: TfOverlays["liquidity"][number] }
interface StructLine { id: string; y: number; left: number; right: number; text: string; dir: "bullish" | "bearish" }
interface Geo { w: number; h: number; zones: ZoneBox[]; fib: FibLine[]; fibAnchors: { x: number; y: number; label: string; kind: "from" | "to" }[]; liq: LiqBox[]; struct: StructLine[] }
const EMPTY: Geo = { w: 0, h: 0, zones: [], fib: [], fibAnchors: [], liq: [], struct: [] };
/** Very thin zones are drawn at least this tall so they read as boxes; their labels always carry the exact prices. */
const MIN_ZONE_PX = 6;

/**
 * The Treidify trading chart: TradingView Lightweight Charts (Apache-2.0; attribution logo kept on) with overlays
 * computed by computeOverlays() from the very candles on screen. Changing timeframe refetches the bars and recomputes
 * every overlay for that timeframe. Zones are clear price-range rectangles that start at their origin candle.
 */
export function TerminalChart({
  symbol, digits, htfTrend, sample: sampleProp, initialTf = "1H", tfs = CHART_TFS, defaultLayers, showToggles = true, height = 460, fill = false, className,
  lead, actions, onOverlays, selectedZoneId, onSelectZone, fibSide: fibSideProp, onLayers, onTf, maxZonesPerSide = 2,
}: {
  symbol: string; digits: number; htfTrend: Trend | null; sample?: boolean; initialTf?: ChartTf; tfs?: ChartTf[]; defaultLayers?: Partial<Layers>; showToggles?: boolean;
  height?: number; fill?: boolean; className?: string; lead?: React.ReactNode; actions?: React.ReactNode;
  onOverlays?: (o: TfOverlays | null, meta: ChartMeta) => void; selectedZoneId?: string | null; onSelectZone?: (z: SDZone | null, o: TfOverlays) => void;
  fibSide?: "bullish" | "bearish" | "active"; onLayers?: (l: Layers) => void; onTf?: (tf: ChartTf) => void; maxZonesPerSide?: number;
}) {
  const box = useRef<HTMLDivElement>(null);
  const chart = useRef<IChartApi | null>(null);
  const series = useRef<ISeriesApi<"Candlestick"> | null>(null);
  const vol = useRef<ISeriesApi<"Histogram"> | null>(null);
  const markers = useRef<ISeriesMarkersPluginApi<Time> | null>(null);
  const [tf, setTfState] = useState<ChartTf>(initialTf);
  const [candles, setCandles] = useState<Candle[]>([]);
  const [state, setState] = useState<"ready" | "loading" | "error">("loading");
  const [err, setErr] = useState<string | null>(null);
  const [meta, setMeta] = useState<ChartMeta>({ sample: !!sampleProp, freshness: null, method: null, lastBarAt: null });
  const [layers, setLayersState] = useState<Layers>({ zones: true, fib: false, liquidity: false, structure: false, volume: false, ...defaultLayers });
  const [history, setHistory] = useState(false);
  const [geo, setGeo] = useState<Geo>(EMPTY);
  const [localSel, setLocalSel] = useState<string | null>(null);
  const [narrow, setNarrow] = useState(false);
  const { resolvedTheme } = useTheme();
  const sel = selectedZoneId !== undefined ? selectedZoneId : localSel;
  const selRef = useRef<string | null>(null);
  selRef.current = sel;
  const labelH = narrow ? 34 : 40;

  const setTf = (t: ChartTf) => { setTfState(t); onTf?.(t); setLocalSel(null); if (overlays) onSelectZone?.(null, overlays); };
  const toggle = (l: Layer) => setLayersState((x) => { const n = { ...x, [l]: !x[l] }; onLayers?.(n); return n; });

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 639px)");
    const on = () => setNarrow(mq.matches);
    on(); mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, []);

  const overlays = useMemo(() => (candles.length ? computeOverlays({ symbol, tf: tf as OverlayTf, digits, candles, sample: meta.sample }) : null), [candles, symbol, tf, digits, meta.sample]);
  useEffect(() => { onOverlays?.(overlays, meta); }, [overlays, meta]); // eslint-disable-line react-hooks/exhaustive-deps

  // Create the chart once.
  useEffect(() => {
    if (!box.current) return;
    const c = createChart(box.current, {
      autoSize: true,
      layout: { background: { type: ColorType.Solid, color: "transparent" }, textColor: css("--text-3"), fontFamily: getComputedStyle(document.body).fontFamily, fontSize: 11, attributionLogo: true },
      grid: { vertLines: { color: css("--chart-grid") }, horzLines: { color: css("--chart-grid") } },
      rightPriceScale: { borderVisible: false, scaleMargins: { top: 0.1, bottom: 0.1 } },
      timeScale: { borderVisible: false, timeVisible: true, secondsVisible: false, rightOffset: 8 },
      crosshair: { mode: CrosshairMode.Normal },
      handleScroll: true, handleScale: true,
    });
    series.current = c.addSeries(CandlestickSeries, { priceLineVisible: true, borderVisible: false });
    vol.current = c.addSeries(HistogramSeries, { priceScaleId: "vol", priceFormat: { type: "volume" }, visible: false, lastValueVisible: false, priceLineVisible: false });
    c.priceScale("vol").applyOptions({ scaleMargins: { top: 0.8, bottom: 0 } });
    markers.current = createSeriesMarkers(series.current, []);
    chart.current = c;
    return () => { c.remove(); chart.current = null; series.current = null; vol.current = null; };
  }, []);

  // Theme colours and precision.
  useEffect(() => {
    const c = chart.current; if (!c) return;
    const up = css("--up"), down = css("--down");
    c.applyOptions({ layout: { textColor: css("--text-3") }, grid: { vertLines: { color: css("--chart-grid") }, horzLines: { color: css("--chart-grid") } }, crosshair: { vertLine: { color: css("--accent"), labelBackgroundColor: css("--accent") }, horzLine: { color: css("--accent"), labelBackgroundColor: css("--accent") } } });
    series.current?.applyOptions({ upColor: up, downColor: down, wickUpColor: up, wickDownColor: down, priceFormat: { type: "price", precision: digits, minMove: 1 / 10 ** digits } });
  }, [resolvedTheme, digits]);

  // Load candles for the timeframe.
  useEffect(() => {
    let live = true;
    setState("loading");
    fetch(`/api/market/candles?symbol=${symbol}&tf=${tf}`, { cache: "no-store" })
      .then(async (r) => ({ ok: r.ok, body: await r.json() }))
      .then(({ ok, body }) => {
        if (!live) return;
        if (!ok || !body.candles?.length) { setErr(body.message ?? "Market data unavailable."); setState("error"); setCandles([]); return; }
        setCandles(body.candles); setMeta({ sample: !!body.sample, freshness: body.freshness ?? null, method: body.method ?? null, lastBarAt: body.lastBarAt ?? null }); setState("ready");
      })
      .catch(() => { if (live) { setErr("Market data unavailable."); setState("error"); } });
    return () => { live = false; };
  }, [tf, symbol]);

  // Candles, volume and displacement colouring.
  useEffect(() => {
    const s = series.current; if (!s || !candles.length) return;
    const disp = new Set(layers.structure ? overlays?.structure.displacement ?? [] : []);
    const accent = css("--accent");
    s.setData(candles.map((c, i) => ({ time: c.t as UTCTimestamp, open: c.o, high: c.h, low: c.l, close: c.c, ...(disp.has(i) ? { borderColor: accent, borderVisible: true } : {}) })));
    const v = overlays?.volume;
    const has = v && v.kind !== "none";
    const hi = new Set(v?.highIndices ?? []);
    vol.current?.setData(has ? candles.map((c, i) => ({ time: c.t as UTCTimestamp, value: c.v ?? 0, color: hi.has(i) ? (c.c >= c.o ? css("--up") : css("--down")) : (c.c >= c.o ? css("--up-soft") : css("--down-soft")) })) : []);
  }, [candles, overlays, layers.structure, resolvedTheme]);

  // Fit on new data only (not on overlay toggles), so the user's zoom is kept.
  useEffect(() => {
    if (!candles.length) return;
    const ts = chart.current?.timeScale();
    if (!ts) return;
    // Leave empty space right of the last candle: zone labels live there instead of covering price.
    const n = candles.length, show = narrow ? 50 : 104, room = narrow ? 34 : 40;
    ts.setVisibleLogicalRange({ from: Math.max(0, n - show), to: n + room });
  }, [candles, narrow]);

  useEffect(() => {
    vol.current?.applyOptions({ visible: layers.volume && overlays?.volume.kind !== "none" });
    series.current?.priceScale().applyOptions({ scaleMargins: { top: 0.1, bottom: layers.volume ? 0.24 : 0.1 } });
  }, [layers.volume, overlays]);

  // Swing labels and BOS/CHOCH markers.
  useEffect(() => {
    const m: SeriesMarker<Time>[] = [];
    if (layers.structure && overlays) {
      for (const s of overlays.structure.swings.slice(narrow ? -8 : -14)) {
        const c = candles[s.index]; if (!c) continue;
        m.push({ time: c.t as UTCTimestamp, position: s.kind === "high" ? "aboveBar" : "belowBar", shape: "circle", size: 0.4, color: css("--text-3"), text: narrow ? undefined : s.label });
      }
    }
    m.sort((a, b) => (a.time as number) - (b.time as number));
    markers.current?.setMarkers(m);
  }, [overlays, layers.structure, candles, narrow, resolvedTheme]);

  const fibSide = fibSideProp ?? "active";
  const fibScen = overlays ? (fibSide === "active" ? (overlays.fib.active ? overlays.fib[overlays.fib.active] : null) : overlays.fib[fibSide]) : null;

  // Overlay geometry follows the price and time scales.
  const measure = useCallback(() => {
    const c = chart.current, s = series.current, el = box.current;
    if (!c || !s || !el || !overlays) { setGeo((g) => (g === EMPTY ? g : EMPTY)); return; }
    const ts = c.timeScale();
    const w = ts.width(), h = el.clientHeight;
    const x = (i: number) => ts.logicalToCoordinate(i as never) ?? null;
    const y = (p: number) => s.priceToCoordinate(p);
    const clampX = (v: number | null, fallback: number) => Math.max(0, Math.min(w, v ?? fallback));
    const zones: ZoneBox[] = [];
    // Readability: by default the two nearest live zones per side; History adds invalidated and historical ones.
    const last = overlays.last ?? 0;
    const shown = overlays.zones.filter((z) => {
      if (z.status === "active" || z.status === "tested") {
        const near = overlays.zones.filter((o) => o.side === z.side && (o.status === "active" || o.status === "tested")).sort((a, b) => Math.abs((a.lower + a.upper) / 2 - last) - Math.abs((b.lower + b.upper) / 2 - last)).slice(0, maxZonesPerSide);
        return near.includes(z) || z.id === selRef.current;
      }
      return history || z.id === selRef.current;
    });
    if (layers.zones) for (const z of shown) {
      const a = y(z.upper), b = y(z.lower);
      if (a === null || b === null) continue;
      const left = clampX(x(z.originIndex), 0);
      const right = z.invalidatedIndex !== null ? clampX(x(z.invalidatedIndex), w) : w;
      if (right - left < 2) continue;
      const top = Math.min(a, b), bottom = Math.max(a, b);
      const c = (top + bottom) / 2, hh = Math.max(bottom - top, MIN_ZONE_PX);
      zones.push({ id: z.id, z, left, right, top: c - hh / 2, bottom: c + hh / 2, labelTop: null });
    }
    // Label layout: labels sit at the right edge of the plot, centred on their zone, pushed apart so none overlap.
    const LH = labelH;
    const order = zones.filter((z) => z.right >= w - 2).sort((p, q) => (p.top + p.bottom) / 2 - (q.top + q.bottom) / 2);
    let cursor = -Infinity;
    for (const zb of order) { let t = (zb.top + zb.bottom) / 2 - LH / 2; t = Math.max(t, cursor + 4, 4); zb.labelTop = t; cursor = t + LH; }
    const over = cursor - (h - 4);
    if (over > 0) { let floor = h - 4; for (const zb of [...order].reverse()) { const t = Math.min(zb.labelTop!, floor - LH); zb.labelTop = t; floor = t - 4; } }
    for (const zb of zones) if (zb.labelTop === null) zb.labelTop = Math.max(4, (zb.top + zb.bottom) / 2 - LH / 2);
    const fib: FibLine[] = [];
    const fibAnchors: Geo["fibAnchors"] = [];
    if (layers.fib && fibScen) {
      const left = clampX(x(fibScen.from.index), 0);
      for (const l of fibScen.levels) { const yy = y(l.price); if (yy !== null) fib.push({ ratio: l.ratio, price: l.price, y: yy, left }); }
      const fy = y(fibScen.from.price), ty = y(fibScen.to.price);
      const fx = x(fibScen.from.index), tx = x(fibScen.to.index);
      if (fy !== null && fx !== null) fibAnchors.push({ x: fx, y: fy, label: `0 · ${fmtPrice(fibScen.from.price, digits)}`, kind: "from" });
      if (ty !== null && tx !== null) fibAnchors.push({ x: tx, y: ty, label: `100 · ${fmtPrice(fibScen.to.price, digits)}`, kind: "to" });
    }
    const liq: LiqBox[] = [];
    if (layers.liquidity) for (const b of overlays.liquidity) {
      const a = y(b.upper), bb = y(b.lower);
      if (a === null || bb === null) continue;
      const left = clampX(x(b.firstIndex), 0);
      const right = b.sweptIndex !== null ? clampX(x(b.sweptIndex), w) : w;
      liq.push({ id: b.id, b, left, right: Math.max(right, left + 24), top: Math.min(a, bb), bottom: Math.max(a, bb) });
    }
    const struct: StructLine[] = [];
    if (layers.structure) for (const e of overlays.structure.events.slice(-6)) {
      const yy = y(e.level), l = x(e.swing.index), r = x(e.index);
      if (yy === null || l === null || r === null || r < 0 || l > w) continue;
      struct.push({ id: `${e.kind}-${e.index}`, y: yy, left: Math.max(0, l), right: Math.min(w, r), text: e.kind, dir: e.direction });
    }
    const next: Geo = { w, h, zones, fib, fibAnchors, liq, struct };
    setGeo((g) => (JSON.stringify(g) === JSON.stringify(next) ? g : next));
  }, [overlays, layers, history, fibScen, digits, maxZonesPerSide, labelH]);

  useEffect(() => {
    const c = chart.current; if (!c) return;
    let raf = 0;
    const tick = () => { cancelAnimationFrame(raf); raf = requestAnimationFrame(measure); };
    c.timeScale().subscribeVisibleLogicalRangeChange(tick);
    c.timeScale().subscribeSizeChange(tick);
    const el = box.current;
    el?.addEventListener("wheel", tick, { passive: true });
    el?.addEventListener("pointermove", tick, { passive: true });
    el?.addEventListener("touchmove", tick, { passive: true });
    const t = setTimeout(tick, 50);
    return () => { c.timeScale().unsubscribeVisibleLogicalRangeChange(tick); c.timeScale().unsubscribeSizeChange(tick); clearTimeout(t); cancelAnimationFrame(raf); el?.removeEventListener("wheel", tick); el?.removeEventListener("pointermove", tick); el?.removeEventListener("touchmove", tick); };
  }, [measure, candles]);

  const pick = useCallback((z: SDZone | null) => {
    if (onSelectZone && overlays) onSelectZone(z, overlays);
    else setLocalSel(z?.id ?? null);
  }, [onSelectZone, overlays]);

  // Clicking inside a zone rectangle selects it (the chart keeps panning on drag).
  useEffect(() => {
    const c = chart.current; if (!c) return;
    const onClick = (p: MouseEventParams<Time>) => {
      if (!p.point || !overlays || !layers.zones) return;
      const hit = geo.zones.filter((b) => p.point!.x >= b.left && p.point!.x <= b.right && p.point!.y >= b.top - 3 && p.point!.y <= b.bottom + 3);
      if (hit.length) pick(hit.sort((a, b) => (a.bottom - a.top) - (b.bottom - b.top))[0]!.z);
    };
    c.subscribeClick(onClick);
    return () => c.unsubscribeClick(onClick);
  }, [geo, overlays, layers.zones, pick]);

  const localZone = !onSelectZone && localSel && overlays ? overlays.zones.find((z) => z.id === localSel) ?? null : null;
  const sample = meta.sample || !!sampleProp;
  const histCount = overlays?.zones.filter((z) => z.status === "historical").length ?? 0;

  return (
    <div className={cn("flex min-w-0 flex-col", className)}>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        {lead}
        <div className={cn("flex flex-wrap items-center gap-2", lead ? "ml-auto" : "")}>
          <div role="tablist" aria-label="Timeframe" className="inset relative flex rounded-full p-0.5">
            <SlidingPill watch={tf} className="rounded-full bg-[var(--text)] shadow-[0_4px_12px_-6px_rgba(0,0,0,0.5)]" />
            {tfs.map((t) => (
              <button key={t} role="tab" aria-selected={tf === t} data-active={tf === t} onClick={() => setTf(t)} className={cn("num relative z-[1] min-h-[30px] min-w-[38px] rounded-full px-2 py-1 text-[12.5px] font-semibold text-ink-2 transition-colors duration-150 hover:text-ink", tf === t && "text-[var(--bg-0)] hover:text-[var(--bg-0)]")}>{t}</button>
            ))}
          </div>
          {actions}
        </div>
      </div>
      {showToggles && (
        <div className="tz-toggles mt-2.5" role="group" aria-label="Chart overlays">
          {LAYERS.map((l) => (
            <button key={l.id} type="button" aria-pressed={layers[l.id]} onClick={() => toggle(l.id)} className={cn("tz-toggle", `is-${l.id}`, layers[l.id] && "is-on")}><span className="tz-dot" aria-hidden />{l.label}</button>
          ))}
          {layers.zones && histCount > 0 && <button type="button" aria-pressed={history} onClick={() => setHistory((h) => !h)} className={cn("tz-toggle", history && "is-on")}>History</button>}
        </div>
      )}

      <div className={cn("tz-stage relative mt-2 overflow-hidden rounded-2xl", fill && "min-h-[260px] flex-1")} style={fill ? undefined : { height }} data-tf={tf}>
        <div ref={box} className="absolute inset-0" />
        <div className="tz-layer" style={{ width: geo.w || undefined }} key={`${tf}-${symbol}`}>
          {geo.liq.map((l) => (
            <div key={l.id} className={cn("tz-liq", l.b.side === "buy" ? "is-bsl" : "is-ssl", l.b.state !== "unswept" && "is-swept")} style={{ left: l.left, width: l.right - l.left, top: l.top, height: Math.max(2, l.bottom - l.top) }}>
              <span className={cn("tz-liq-label", l.b.side === "buy" ? "bottom-full mb-0.5" : "top-full mt-0.5")}>
                {l.b.side === "buy" ? "BSL" : "SSL"} · {l.b.kind === "equal-highs" ? "EQH" : l.b.kind === "equal-lows" ? "EQL" : l.b.kind === "swing-high" ? "Swing high" : "Swing low"}{!narrow && ` · ${fmtPrice(l.b.price, digits)}`} · {l.b.state === "unswept" ? `${l.b.estimate} est.` : l.b.state === "swept" ? "Swept" : "Taken"}
              </span>
            </div>
          ))}
          {geo.zones.map((b) => {
            const z = b.z, buy = z.side === "buy", active = sel === z.id;
            return <div key={z.id} className={cn("tz-zone", buy ? "is-buy" : "is-sell", `is-${z.status}`, active && "is-selected")} style={{ left: b.left, width: b.right - b.left, top: b.top, height: b.bottom - b.top }} />;
          })}
          {geo.zones.map((b) => {
            const z = b.z, buy = z.side === "buy", active = sel === z.id, mid = (b.top + b.bottom) / 2;
            const lt = b.labelTop ?? mid - labelH / 2, lc = lt + labelH / 2;
            const atEdge = b.right >= geo.w - 2;
            return (
              <div key={`l-${z.id}`} className="contents">
                {atEdge && Math.abs(lc - mid) > 6 && <span className={cn("tz-lead", buy ? "is-buy" : "is-sell")} style={{ top: Math.min(lc, mid), height: Math.abs(lc - mid), left: geo.w - 6 }} aria-hidden />}
                <button type="button" onClick={() => pick(active ? null : z)} aria-label={`${buy ? "Buy" : "Sell"} zone ${fmtPrice(z.lower, digits)} to ${fmtPrice(z.upper, digits)}, ${z.tf}, ${statusText[z.status]}. Open explanation.`}
                  className={cn("tz-zone-label", buy ? "is-buy" : "is-sell", `is-${z.status}`, active && "is-selected")}
                  style={atEdge ? { top: lt, right: 12 } : { top: lt, left: Math.max(4, b.right - 4), transform: "translateX(-100%)" }}>
                  <span className="tz-zone-title">{buy ? "BUY ZONE" : "SELL ZONE"}<span className="tz-zone-tf">{z.tf}{z.status !== "active" ? ` · ${statusText[z.status]}` : ""}</span></span>
                  <span className="num tz-zone-range">{fmtPrice(z.upper, digits)}<span className="opacity-50"> – </span>{fmtPrice(z.lower, digits)}</span>
                </button>
              </div>
            );
          })}
          {geo.fib.map((f) => (
            <div key={f.ratio} className={cn("tz-fib", (f.ratio === 0.618 || f.ratio === 0.786) && "is-golden")} style={{ top: f.y, left: f.left }}>
              <span className="tz-fib-label num">{(f.ratio * 100).toFixed(1)}%<b>{fmtPrice(f.price, digits)}</b></span>
            </div>
          ))}
          {geo.fibAnchors.map((a) => (
            <span key={a.kind} className={cn("tz-anchor num", a.kind === "from" ? "is-from" : "is-to")} style={{ left: a.x, top: a.y }}>{narrow ? (a.kind === "from" ? "0" : "100") : a.label}</span>
          ))}
          {geo.struct.map((s) => (
            <div key={s.id} className={cn("tz-bos", s.dir === "bullish" ? "is-bull" : "is-bear", s.text === "CHOCH" && "is-choch")} style={{ top: s.y, left: s.left, width: Math.max(10, s.right - s.left) }}>
              <span className="tz-bos-label">{s.text}</span>
            </div>
          ))}
        </div>
        {sample && state === "ready" && <span className="tz-sample">Sample bars · not live</span>}
        {state === "loading" && <div className="absolute inset-0 grid place-items-center"><div className="skeleton h-full w-full rounded-2xl" role="status" aria-label="Loading chart" /></div>}
        {state === "error" && <div className="absolute inset-0 grid place-items-center p-6 text-center text-sm text-ink-2">{err} Nothing is drawn rather than a guess.</div>}
        {state === "ready" && overlays?.limitations.length ? <div className="absolute inset-x-3 bottom-3 rounded-xl bg-warn-soft px-3 py-1.5 text-[11.5px] text-ink-2">{overlays.limitations[0]}</div> : null}
      </div>

      {showToggles && overlays && (layers.volume || layers.liquidity || layers.fib) && (
        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 px-1 text-[11.5px] leading-snug text-ink-3" aria-label="Overlay notes">
          {layers.fib && <span>{fibScen ? `Fibonacci: ${fibScen.direction} retracement of the ${tf} leg ${fmtPrice(fibScen.from.price, digits)} → ${fmtPrice(fibScen.to.price, digits)}.` : `Fibonacci: no qualifying ${tf} ${fibSide === "active" ? "" : `${fibSide} `}leg; nothing drawn.`}</span>}
          {layers.liquidity && <span>Liquidity bands are estimated from swing highs and lows, not exchange order-book data.</span>}
          {layers.volume && <span><b className="font-semibold text-ink-2">{overlays.volume.label}.</b> {overlays.volume.note}</span>}
        </div>
      )}

      {!onSelectZone && (
        <Modal open={!!localZone} onClose={() => setLocalSel(null)} title={localZone ? `${localZone.side === "buy" ? "Buy" : "Sell"} zone · ${symbol} ${localZone.tf}` : ""} subtitle="Why this zone exists, what confirms it and what invalidates it">
          {localZone && overlays && <ZoneDetail zone={localZone} overlays={overlays} htfTrend={htfTrend} sample={sample} />}
        </Modal>
      )}
    </div>
  );
}
