"use client";

import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";
import Link from "next/link";
import type { IntelSnapshot } from "@/server/market/intelligence";
import type { Candle } from "@/lib/analytics/types";
import type { InstrumentIntel } from "@/lib/intelligence";
import { momentumLabel, rsiOf, dxyRelation } from "@/lib/intelligence";
import type { TfOverlays } from "@/lib/intelligence/overlays";
import { cn } from "@/lib/cn";
import { AssetMark } from "@/components/ui/flags";
import { ready, useTfOverlays } from "./use-overlays";
import { fmtPrice } from "./zone-detail";

const NAMES: Record<string, string> = { XAUUSD: "Gold", DXY: "DXY", XAGUSD: "Silver" };
const BARS = 72;

/** Compact candle chart with the 1H buy and sell zones drawn as rectangles. SVG, so it stays crisp and light. */
export function MiniChart({ candles, o, digits, label }: { candles: Candle[]; o: TfOverlays | null; digits: number; label: string }) {
  const c = candles.slice(-BARS), off = candles.length - c.length;
  if (c.length < 10) return <div className="h-[120px] rounded-xl bg-[var(--surface-inset)]" />;
  const zones = (o?.zones ?? []).filter((z) => z.status === "active" || z.status === "tested");
  const last = c.at(-1)!.c;
  const near = (side: "buy" | "sell") => zones.filter((z) => z.side === side).sort((a, b) => Math.abs((a.lower + a.upper) / 2 - last) - Math.abs((b.lower + b.upper) / 2 - last))[0];
  const show = [near("buy"), near("sell")].filter((z): z is NonNullable<typeof z> => !!z);
  const hi = Math.max(...c.map((x) => x.h), ...show.map((z) => z.upper)), lo = Math.min(...c.map((x) => x.l), ...show.map((z) => z.lower));
  const W = 320, H = 120, pad = 6, cw = (W - 54) / c.length;
  const y = (p: number) => pad + ((hi - p) / (hi - lo || 1)) * (H - 2 * pad);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="h-[120px] w-full" role="img" aria-label={label}>
      {show.map((z) => {
        const x0 = Math.max(0, (z.originIndex - off) * cw);
        return (
          <g key={z.id}>
            <rect x={x0} y={y(z.upper)} width={W - 54 - x0} height={Math.max(3, y(z.lower) - y(z.upper))} rx={2} fill={z.side === "buy" ? "var(--up-soft)" : "var(--down-soft)"} stroke={z.side === "buy" ? "var(--up)" : "var(--down)"} strokeOpacity={0.55} strokeWidth={0.8} />
            <text x={W - 50} y={(y(z.upper) + y(z.lower)) / 2 + 3} fontSize={9} fontWeight={700} fill={z.side === "buy" ? "var(--up)" : "var(--down)"}>{z.side === "buy" ? "BUY" : "SELL"}</text>
          </g>
        );
      })}
      {c.map((k, i) => {
        const up = k.c >= k.o, x = i * cw + cw / 2;
        return (
          <g key={k.t} stroke={up ? "var(--up)" : "var(--down)"}>
            <line x1={x} x2={x} y1={y(k.h)} y2={y(k.l)} strokeWidth={0.8} />
            <rect x={x - cw * 0.32} y={y(Math.max(k.o, k.c))} width={cw * 0.64} height={Math.max(0.8, Math.abs(y(k.o) - y(k.c)))} fill={up ? "var(--up)" : "var(--down)"} strokeWidth={0} />
          </g>
        );
      })}
      <line x1={0} x2={W - 54} y1={y(last)} y2={y(last)} stroke="var(--accent)" strokeDasharray="3 3" strokeWidth={0.8} />
      <rect x={W - 52} y={y(last) - 7} width={50} height={14} rx={7} fill="var(--accent)" />
      <text x={W - 27} y={y(last) + 3} fontSize={8.5} fontWeight={700} textAnchor="middle" fill="#fff">{fmtPrice(last, digits)}</text>
    </svg>
  );
}

function Dir({ t, tf }: { t: InstrumentIntel["trends"]["4H"]; tf: string }) {
  const Icon = t === "bullish" ? ArrowUpRight : t === "bearish" ? ArrowDownRight : Minus;
  return <span className={cn("dir-badge", t === "bullish" ? "is-bull" : t === "bearish" ? "is-bear" : "is-flat")} title={`${tf}: ${t ?? "no data"}`}><b>{tf}</b><Icon aria-hidden /></span>;
}

/** Five-second read: each market's chart with its zones, timeframe direction, momentum and relative strength. */
export function MacroPulse({ snap }: { snap: IntelSnapshot }) {
  const g = useTfOverlays("XAUUSD", snap.gold.digits, ["1H"]);
  const d = useTfOverlays("DXY", snap.dxy.digits, ["1H"]);
  const s = useTfOverlays("XAGUSD", snap.silver.digits, ["1H"]);
  const rows = [{ i: snap.gold, st: ready(g["1H"]) }, { i: snap.dxy, st: ready(d["1H"]) }, { i: snap.silver, st: ready(s["1H"]) }];
  const changes = rows.map((r) => snap.quotes[r.i.symbol as keyof typeof snap.quotes].changePct);
  const maxAbs = Math.max(0.01, ...changes.map((c) => Math.abs(c ?? 0)));
  const rel = dxyRelation(snap.gold, snap.dxy);
  const gc = ready(g["1H"])?.candles.slice(-BARS) ?? [], dc = ready(d["1H"])?.candles.slice(-BARS) ?? [];
  const rho = snap.gold.components.find((c) => c.id === "dxy")?.detail.match(/ρ = (-?[\d.]+)/)?.[1];

  return (
    <div className="grid gap-3 sm:gap-4">
      <div className="grid gap-3 sm:gap-4 md:grid-cols-3">
        {rows.map(({ i, st }) => {
          const q = snap.quotes[i.symbol as keyof typeof snap.quotes];
          const mom = momentumLabel(rsiOf(i));
          return (
            <Link key={i.symbol} href={`/app/markets?symbol=${i.symbol}&layers=zones,structure`} className={cn("dcard dcard-pad lift block", `glow-${i.bias}`)} aria-label={`${NAMES[i.symbol]}: ${i.bias}. Open the chart.`}>
              <div className="flex items-center gap-2.5">
                <AssetMark symbol={i.symbol} size={28} />
                <div className="min-w-0 flex-1 leading-tight"><div className="text-[14.5px] font-semibold text-ink">{NAMES[i.symbol]}</div><div className="num text-[12px] text-ink-3">{q.last !== null ? fmtPrice(q.last, i.digits) : "—"}{q.changePct !== null && <span className={q.changePct >= 0 ? " text-up" : " text-down"}> {q.changePct >= 0 ? "+" : "−"}{Math.abs(q.changePct).toFixed(2)}%</span>}</div></div>
                <span className={cn("bias-pill", `is-${i.bias}`)}>{i.bias === "insufficient" ? "No reading" : i.bias}</span>
              </div>
              <div className="mt-2">{st ? <MiniChart candles={st.candles} o={st.overlays} digits={i.digits} label={`${NAMES[i.symbol]} 1H chart with its nearest buy and sell zones`} /> : <div className="skeleton h-[120px] rounded-xl" />}</div>
              <div className="mt-2 flex items-center justify-between gap-2">
                <div className="flex gap-1">{(["4H", "1H", "15M", "5M"] as const).map((tf) => <Dir key={tf} tf={tf} t={i.trends[tf]} />)}</div>
                <span className={cn("text-[11.5px] font-semibold", mom.tone === "bullish" ? "text-up" : mom.tone === "bearish" ? "text-down" : "text-ink-3")}>{mom.label}</span>
              </div>
            </Link>
          );
        })}
      </div>

      <div className="grid gap-3 sm:gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
        <section className="dcard dcard-pad" aria-labelledby="rs-title">
          <h3 id="rs-title" className="text-[14.5px] font-semibold text-ink">Relative strength &amp; momentum</h3>
          <p className="text-[12px] text-ink-3">24-hour change and 1H RSI(14). Bars are scaled to the largest move.</p>
          <ul className="mt-3 grid gap-3">
            {rows.map(({ i }, k) => {
              const c = changes[k] ?? null, r = rsiOf(i);
              return (
                <li key={i.symbol} className="grid grid-cols-[64px_minmax(0,1fr)_58px] items-center gap-2 text-[12.5px]">
                  <span className="font-semibold text-ink">{NAMES[i.symbol]}</span>
                  <span className="rs-track" aria-hidden><span className={cn("rs-bar", (c ?? 0) >= 0 ? "is-up" : "is-down")} style={{ width: `${(Math.abs(c ?? 0) / maxAbs) * 50}%` }} /></span>
                  <span className={cn("num text-right font-semibold", (c ?? 0) >= 0 ? "text-up" : "text-down")}>{c === null ? "—" : `${c >= 0 ? "+" : "−"}${Math.abs(c).toFixed(2)}%`}</span>
                  <span />
                  <span className="rsi-track" aria-label={`RSI ${r?.toFixed(0) ?? "unavailable"}`}><span className="rsi-dot" style={{ left: `${r ?? 50}%` }} /></span>
                  <span className="num text-right text-[11.5px] text-ink-3">RSI {r?.toFixed(0) ?? "—"}</span>
                </li>
              );
            })}
          </ul>
        </section>

        <section className="dcard dcard-pad" aria-labelledby="dxg-title">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div><h3 id="dxg-title" className="text-[14.5px] font-semibold text-ink">DXY versus Gold</h3><p className="text-[12px] text-ink-3">Last {BARS} 1H closes, both rebased to 100. {rho ? `Measured return correlation ρ = ${rho}.` : "Correlation not measurable on these bars."}</p></div>
            <span className={cn("bias-pill normal-case", rel.tone === "aligned" ? "text-accent" : rel.tone === "diverging" ? "!bg-warn-soft !text-warn" : "")}>{rel.label}</span>
          </div>
          <RebaseChart a={gc} b={dc} />
          <div className="mt-1 flex gap-4 text-[11.5px] text-ink-2"><span className="inline-flex items-center gap-1.5"><span className="h-0.5 w-4 rounded bg-[#d4a017]" />Gold</span><span className="inline-flex items-center gap-1.5"><span className="h-0.5 w-4 rounded bg-[var(--accent)]" />DXY</span></div>
          <p className="mt-2 text-[12.5px] leading-snug text-ink-2">{rel.text}</p>
        </section>
      </div>
    </div>
  );
}

function RebaseChart({ a, b }: { a: Candle[]; b: Candle[] }) {
  if (a.length < 10 || b.length < 10) return <div className="skeleton mt-3 h-[130px] rounded-xl" />;
  const ra = a.map((x) => (x.c / a[0]!.c) * 100), rb = b.map((x) => (x.c / b[0]!.c) * 100);
  const all = [...ra, ...rb], hi = Math.max(...all), lo = Math.min(...all);
  const W = 400, H = 130;
  const path = (r: number[]) => r.map((v, i) => `${i ? "L" : "M"}${((i / (r.length - 1)) * W).toFixed(1)},${(6 + ((hi - v) / (hi - lo || 1)) * (H - 12)).toFixed(1)}`).join(" ");
  const base = 6 + ((hi - 100) / (hi - lo || 1)) * (H - 12);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="mt-3 h-[130px] w-full" role="img" aria-label="Gold and DXY rebased to 100 over the last 72 hourly closes">
      <line x1={0} x2={W} y1={base} y2={base} stroke="var(--border-strong)" strokeDasharray="4 4" />
      <path d={path(ra)} fill="none" stroke="#d4a017" strokeWidth={2} vectorEffect="non-scaling-stroke" />
      <path d={path(rb)} fill="none" stroke="var(--accent)" strokeWidth={2} vectorEffect="non-scaling-stroke" />
    </svg>
  );
}
