"use client";

import { ArrowDownRight, ArrowRight, ArrowUpRight, CircleCheck, CircleDashed, Crosshair, Droplets, Hourglass, Layers3, Minus, Ruler, ShieldCheck, Spline } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import type { IntelSnapshot } from "@/server/market/intelligence";
import { tradeSetup, type InstrumentIntel } from "@/lib/intelligence";
import type { OverlayTf, SDZone, TfOverlays } from "@/lib/intelligence/overlays";
import type { Trend } from "@/lib/intelligence/structure";
import { formatPips, maxStopPrice, stopCheck } from "@/lib/trading/pips";
import { cn } from "@/lib/cn";
import { Modal } from "@/components/intel/modal";
import { DataChips, useIntel } from "@/components/intel/market-intel";
import { biasText } from "@/components/intel/bias";
import { ZoneDetail, fmtPrice, statusText } from "./zone-detail";
import { ready, useTfOverlays } from "./use-overlays";

const TFS: OverlayTf[] = ["4H", "1H", "15M"];
const ROLE: Record<string, string> = { "4H": "Direction", "1H": "Structure", "15M": "Setup", "5M": "Confirmation" };

function TrendBadge({ t, big }: { t: Trend | null; big?: boolean }) {
  const Icon = t === "bullish" ? ArrowUpRight : t === "bearish" ? ArrowDownRight : Minus;
  return (
    <span className={cn("trend-badge", t === "bullish" ? "is-bull" : t === "bearish" ? "is-bear" : "is-flat", big && "is-big")}>
      <Icon aria-hidden />{t === null ? "No data" : t === "none" ? "No break" : t === "bullish" ? "Bullish" : "Bearish"}
    </span>
  );
}

/**
 * Analysis: the verdict first (bias, timeframe alignment, setup status, data source), then compact visual sections.
 * The engine's full reasoning is kept, one tap away in the expandable panels at the bottom.
 */
export function AnalysisBoard({ initial, details }: { initial: IntelSnapshot; details: React.ReactNode }) {
  const s = useIntel(initial);
  const g = s.gold;
  const setup = useMemo(() => tradeSetup(g), [g]);
  const tf = useTfOverlays("XAUUSD", g.digits, TFS);
  const [open, setOpen] = useState<{ z: SDZone; o: TfOverlays } | null>(null);
  const sample = s.mode === "sample";
  const valid = setup.status === "valid";
  const ov = TFS.map((t) => ready(tf[t])?.overlays).filter((x): x is TfOverlays => !!x);

  return (
    <div className="grid gap-4">
      {/* ── Verdict ── */}
      <section aria-labelledby="verdict" className="glass glass-strong rounded-[28px] p-4 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-accent">Gold · XAUUSD</p>
            <h2 id="verdict" className="mt-1 flex flex-wrap items-baseline gap-x-3 text-[28px] font-semibold leading-tight tracking-[-0.03em] text-ink sm:text-[34px]">
              <span className={g.bias === "bullish" ? "text-up" : g.bias === "bearish" ? "text-down" : "text-ink"}>{biasText[g.bias]}</span>
              <span className="text-[14px] font-medium tracking-normal text-ink-3">{g.score !== null ? `score ${g.score > 0 ? "+" : ""}${g.score}` : "no score"}{g.confidence ? ` · ${g.confidence} confidence` : ""}</span>
            </h2>
          </div>
          <div className={cn("setup-badge", valid ? (setup.side === "buy" ? "is-buy" : "is-sell") : "is-wait")}>
            {valid ? (setup.side === "buy" ? <ArrowUpRight /> : <ArrowDownRight />) : <Hourglass />}
            <span><span className="block text-[10.5px] font-bold uppercase tracking-[0.14em] opacity-80">Setup status</span>{valid ? (setup.side === "buy" ? "BUY" : "SELL") : "WAIT"}</span>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {(["4H", "1H", "15M", "5M"] as const).map((t) => (
            <div key={t} className="tf-tile">
              <div className="text-[11px] font-semibold text-ink-3"><b className="text-ink">{t}</b> · {ROLE[t]}</div>
              <TrendBadge t={g.trends[t]} big />
            </div>
          ))}
        </div>

        <p className="mt-4 text-[14px] leading-relaxed text-ink">{setup.reasons[0]}</p>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
          <DataChips s={s} />
          <Link href="/app/markets?layers=zones,fib,structure" className="press inline-flex h-9 items-center gap-1.5 rounded-full bg-accent-soft px-4 text-[13px] font-semibold text-accent">Open chart<ArrowRight className="h-4 w-4" /></Link>
        </div>
        {sample && <p className="mt-3 rounded-xl bg-warn-soft px-3 py-2 text-[12px] text-ink-2">{s.message}</p>}
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* ── Entry confirmation + risk ── */}
        <Section icon={<Crosshair />} title="Entry confirmation" sub="What has happened and what is still missing">
          <Checklist g={g} setup={setup} />
        </Section>
        <Section icon={<ShieldCheck />} title="Risk validation" sub="Structural stop measured with 1 pip = $0.10">
          <Risk g={g} setup={setup} />
        </Section>

        {/* ── Fibonacci ── */}
        <Section icon={<Ruler />} title="Fibonacci levels" sub="Active retracement per timeframe" className="lg:col-span-2">
          <div className="grid gap-3 md:grid-cols-3">
            {TFS.map((t) => {
              const d = ready(tf[t]); const o = d?.overlays;
              const f = o?.fib.active ? o.fib[o.fib.active] : null;
              return (
                <div key={t} className="rounded-2xl bg-[var(--surface-inset)] p-3">
                  <div className="mb-2 flex items-center justify-between gap-2 text-[12px]">
                    <span className="font-semibold text-ink">{t}</span>
                    {f ? <span className={cn("font-semibold", f.direction === "bullish" ? "text-up" : "text-down")}>{f.direction === "bullish" ? "Bullish ↓ retrace" : "Bearish ↑ retrace"}</span> : <span className="text-ink-3">{tf[t]?.status === "loading" ? "Loading…" : "No leg"}</span>}
                  </div>
                  {f ? (
                    <>
                      <div className="grid grid-cols-3 gap-1.5">
                        {f.levels.map((l) => <div key={l.ratio} className={cn("fib-cell", (l.ratio === 0.618 || l.ratio === 0.786) && "is-golden")}><span className="fib-pct">{(l.ratio * 100).toFixed(1)}%</span><span className="num fib-price text-[12.5px]">{fmtPrice(l.price, g.digits)}</span></div>)}
                      </div>
                      <p className="num mt-2 text-[11px] text-ink-3">{fmtPrice(f.from.price, g.digits)} → {fmtPrice(f.to.price, g.digits)}</p>
                    </>
                  ) : <p className="text-[12px] text-ink-3">No qualifying swing leg, so nothing is drawn.</p>}
                </div>
              );
            })}
          </div>
        </Section>

        {/* ── Supply & demand ── */}
        <Section icon={<Layers3 />} title="Supply & demand" sub="Live zones by timeframe · tap for the full explanation" className="lg:col-span-2">
          <div className="grid gap-2.5 sm:grid-cols-2 xl:grid-cols-3">
            {ov.flatMap((o) => o.zones.filter((z) => z.status === "active" || z.status === "tested").slice(0, 4).map((z) => ({ z, o }))).sort((a, b) => Math.abs((a.z.lower + a.z.upper) / 2 - (g.lastPrice ?? 0)) - Math.abs((b.z.lower + b.z.upper) / 2 - (g.lastPrice ?? 0))).slice(0, 6).map(({ z, o }) => (
              <button key={z.id} type="button" onClick={() => setOpen({ z, o })} className={cn("sd-card", z.side === "buy" ? "is-buy" : "is-sell")}>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[12px] font-semibold">{z.side === "buy" ? "Buy zone" : "Sell zone"}</span>
                  <span className="text-[11px] font-semibold text-ink-3">{z.tf} · {statusText[z.status]} · {z.strength}</span>
                </div>
                <div className="num mt-1 text-[19px] font-semibold tracking-[-0.01em] text-ink">{fmtPrice(z.lower, g.digits)} – {fmtPrice(z.upper, g.digits)}</div>
                <div className="num mt-2 flex items-center justify-between gap-2 text-[11.5px] text-ink-2">
                  <span>Invalid {z.side === "buy" ? "below" : "above"} {fmtPrice(z.invalidation, g.digits)}</span>
                  <span className={cn("rounded-full px-2 py-0.5 font-bold", z.stop.eligible ? "bg-up-soft text-up" : "bg-warn-soft text-warn")}>{z.stop.pips} pips</span>
                </div>
              </button>
            ))}
            {ov.length > 0 && ov.every((o) => !o.zones.some((z) => z.status === "active" || z.status === "tested")) && <p className="text-[12.5px] text-ink-3">No live zone on 4H, 1H or 15M.</p>}
            {ov.length === 0 && <div className="skeleton h-28 rounded-2xl sm:col-span-2 xl:col-span-3" />}
          </div>
        </Section>

        {/* ── Liquidity map ── */}
        <Section icon={<Droplets />} title="Liquidity map" sub="Estimated from swing structure, not order-book data">
          <LiquidityLadder o={ready(tf["1H"])?.overlays ?? null} m15={ready(tf["15M"])?.overlays ?? null} g={g} />
        </Section>

        {/* ── Structure timeline ── */}
        <Section icon={<Spline />} title="Market structure" sub="BOS, CHOCH and displacement, newest first">
          <StructureFeed ov={ov} digits={g.digits} />
        </Section>
      </div>

      <section aria-label="Detailed reasoning" className="grid gap-2">
        <h2 className="px-1 text-[13px] font-semibold text-ink-2">Detailed reasoning</h2>
        {details}
      </section>

      <Modal open={!!open} onClose={() => setOpen(null)} title={open ? `${open.z.side === "buy" ? "Buy" : "Sell"} zone · XAUUSD ${open.z.tf}` : ""} subtitle="Why this zone exists, what confirms it and what invalidates it">
        {open && <ZoneDetail zone={open.z} overlays={open.o} htfTrend={g.trends["4H"]} sample={sample} />}
      </Modal>
    </div>
  );
}

function Section({ icon, title, sub, children, className }: { icon: React.ReactNode; title: string; sub?: string; children: React.ReactNode; className?: string }) {
  return (
    <section className={cn("dcard dcard-pad flex flex-col", className)}>
      <header className="mb-3 flex items-start gap-2.5">
        <span className="section-icon" aria-hidden>{icon}</span>
        <div className="min-w-0"><h2 className="text-[15.5px] font-semibold leading-tight text-ink">{title}</h2>{sub && <p className="text-[12px] text-ink-3">{sub}</p>}</div>
      </header>
      {children}
    </section>
  );
}

function Checklist({ g, setup }: { g: InstrumentIntel; setup: ReturnType<typeof tradeSetup> }) {
  const side = g.bias === "bullish" ? "buy" : g.bias === "bearish" ? "sell" : null;
  const z = side ? g.zones.find((x) => x.side === side && x.withTrend) : undefined;
  const dir = side === "buy" ? "bullish" : "bearish";
  const sweep = g.sweeps.at(-1);
  const items = [
    { done: g.trends["4H"] === "bullish" || g.trends["4H"] === "bearish", label: "4H direction set", detail: g.trends["4H"] === "bullish" || g.trends["4H"] === "bearish" ? `4H structure is ${g.trends["4H"]}.` : "No confirmed 4H break of structure." },
    { done: !!side && g.trends["1H"] === dir, label: "1H structure agrees", detail: g.trends["1H"] ? `1H is ${g.trends["1H"] === "none" ? "unconfirmed" : g.trends["1H"]}.` : "1H unavailable." },
    { done: !!z, label: "Qualified 1H zone with the trend", detail: z ? `${z.side === "buy" ? "Buy" : "Sell"} zone ${z.lower.toFixed(g.digits)} – ${z.upper.toFixed(g.digits)}.` : "None near price." },
    { done: !!z && (z.status === "in-zone" || z.status === "confirmed"), label: "Price inside the zone", detail: z ? (z.status === "watching" ? `${z.distanceATR} × ATR away.` : "Yes.") : "—" },
    { done: !!sweep && !!side && sweep.direction === dir, label: "15M liquidity sweep (optional)", detail: sweep ? `15M ${sweep.side === "sell" ? "lows" : "highs"} swept at ${sweep.level.toFixed(g.digits)} (${sweep.direction}).` : "No recent sweep." },
    { done: z?.status === "confirmed", label: "5M CHOCH inside the zone", detail: z?.status === "confirmed" ? "Printed." : "Not yet." },
    { done: setup.stopPips !== null && setup.maxStopPips !== null && setup.stopPips <= setup.maxStopPips, label: "Structural stop ≤ 50 pips ($5.00)", detail: setup.stopPips !== null ? formatPips("XAUUSD", setup.stopPips) : "No zone to measure." },
  ];
  const done = items.filter((i) => i.done).length;
  return (
    <div>
      <div className="mb-3 flex items-center gap-3"><div className="meter flex-1" aria-hidden><span className="meter-fill" style={{ width: `${(done / items.length) * 100}%` }} /></div><span className="num text-[12px] font-semibold text-ink-2">{done}/{items.length}</span></div>
      <ul className="grid gap-2">
        {items.map((i) => (
          <li key={i.label} className="flex items-start gap-2.5 text-[13px]">
            {i.done ? <CircleCheck className="mt-px h-[18px] w-[18px] shrink-0 text-up" /> : <CircleDashed className="mt-px h-[18px] w-[18px] shrink-0 text-ink-3" />}
            <span className="min-w-0"><span className={cn("font-semibold", i.done ? "text-ink" : "text-ink-2")}>{i.label}</span><span className="block text-[12px] text-ink-3">{i.detail}</span></span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Risk({ g, setup }: { g: InstrumentIntel; setup: ReturnType<typeof tradeSetup> }) {
  if (!setup.entry || setup.stop === null || setup.side === null) return <p className="text-[13px] text-ink-2">No zone qualifies yet, so there is no entry or stop to validate. {setup.reasons[0]}</p>;
  const worst = setup.side === "buy" ? setup.entry.upper : setup.entry.lower;
  const chk = stopCheck("XAUUSD", worst, setup.stop);
  const rr = setup.targets.map((t) => Math.abs(t - worst) / chk.priceDistance);
  const max = maxStopPrice("XAUUSD")!;
  return (
    <div className="grid gap-3">
      <dl className="risk-grid num">
        <div><dt>Entry zone</dt><dd>{fmtPrice(setup.entry.lower, g.digits)} – {fmtPrice(setup.entry.upper, g.digits)}</dd></div>
        <div><dt>Structural SL</dt><dd className={chk.eligible ? "" : "text-down"}>{fmtPrice(setup.stop, g.digits)}</dd></div>
        <div><dt>Pip distance</dt><dd className={chk.eligible ? "" : "text-down"}>{formatPips("XAUUSD", chk.pips)}</dd></div>
        {setup.targets.map((t, i) => <div key={t}><dt>Target {i + 1}</dt><dd>{fmtPrice(t, g.digits)} <span className="text-[11.5px] font-medium text-ink-3">· {rr[i]!.toFixed(1)}R</span></dd></div>)}
        {setup.targets.length === 0 && <div><dt>Targets</dt><dd className="text-ink-3">None at 1R or more</dd></div>}
      </dl>
      <div>
        <div className="mb-1 flex justify-between text-[11.5px] text-ink-3"><span>Stop used</span><span>{chk.pips} of 50 pips (${max.toFixed(2)})</span></div>
        <div className="meter" aria-hidden><span className={cn("meter-fill", !chk.eligible && "is-over")} style={{ width: `${Math.min(100, (chk.pips / 50) * 100)}%` }} /></div>
      </div>
      <p className="text-[11.5px] text-ink-3">Measured from the zone edge price reaches first. Pips are gold price movement; money at risk depends on lot size. {setup.status === "wait" ? "Status is WAIT until every confirmation item is complete." : ""}</p>
    </div>
  );
}

function LiquidityLadder({ o, m15, g }: { o: TfOverlays | null; m15: TfOverlays | null; g: InstrumentIntel }) {
  if (!o) return <div className="skeleton h-48 rounded-2xl" />;
  const last = o.last ?? 0;
  const bands = [...o.liquidity.map((b) => ({ ...b, tf: "1H" })), ...(m15?.liquidity ?? []).filter((b) => b.state === "swept").map((b) => ({ ...b, tf: "15M" }))];
  if (!bands.length) return <p className="text-[12.5px] text-ink-3">No clustered or recent swing liquidity near price.</p>;
  // Ordered by price with the current price slotted in: always legible, even when levels sit close together.
  const rows = [...bands].sort((x, y2) => y2.price - x.price);
  const at = rows.findIndex((r) => r.price < last);
  const above = at < 0 ? rows : rows.slice(0, at), below = at < 0 ? [] : rows.slice(at);
  const Row = (b: (typeof rows)[number]) => (
    <li key={`${b.tf}-${b.id}`} className={cn("liqlad-row", b.side === "buy" ? "is-bsl" : "is-ssl", b.state !== "unswept" && "is-swept")}>
      <span className={cn("liqlad-heat", `is-${b.estimate.toLowerCase()}`)} aria-hidden />
      <span className="min-w-0 truncate">{b.side === "buy" ? "BSL" : "SSL"} · {b.kind === "equal-highs" ? "Equal highs" : b.kind === "equal-lows" ? "Equal lows" : b.kind === "swing-high" ? "Swing high" : "Swing low"} · {b.tf}</span>
      <span className="ml-auto shrink-0 font-semibold">{b.state === "unswept" ? `${b.estimate} est.` : b.state === "swept" ? "Swept" : "Taken"}</span>
      <span className="num w-[72px] shrink-0 text-right text-ink">{fmtPrice(b.price, g.digits)}</span>
    </li>
  );
  return (
    <ul className="liqlad">
      {above.map(Row)}
      <li className="liqlad-price"><span className="num">Price {fmtPrice(last, g.digits)}</span></li>
      {below.map(Row)}
    </ul>
  );
}

function StructureFeed({ ov, digits }: { ov: TfOverlays[]; digits: number }) {
  if (!ov.length) return <div className="skeleton h-48 rounded-2xl" />;
  const items = ov.flatMap((o) => [
    ...o.structure.events.map((e) => ({ t: e.t, tf: o.tf, kind: e.kind as string, dir: e.direction as "bullish" | "bearish", text: `${e.direction === "bullish" ? "Bullish" : "Bearish"} ${e.kind === "BOS" ? "break of structure" : "change of character"} through ${fmtPrice(e.level, digits)}` })),
    ...o.zones.filter((z) => z.displacementIndex >= o.bars - 30 && (z.status === "active" || z.status === "tested")).map((z) => ({ t: z.originT, tf: o.tf, kind: "DISP", dir: (z.side === "buy" ? "bullish" : "bearish") as "bullish" | "bearish", text: `${z.displacementATR}× ATR ${z.side === "buy" ? "bullish" : "bearish"} displacement left a ${z.kind} zone` })),
  ]).sort((a, b) => b.t - a.t).slice(0, 8);
  if (!items.length) return <p className="text-[12.5px] text-ink-3">No recent structural change.</p>;
  return (
    <ol className="timeline">
      {items.map((i, k) => (
        <li key={k} className={cn("tl-item", i.dir === "bullish" ? "is-bull" : "is-bear")}>
          <span className="tl-dot" aria-hidden />
          <span className="flex flex-wrap items-center gap-x-2 text-[12.5px] font-semibold text-ink"><span className="rounded-md bg-inset px-1.5 py-px text-[10.5px] font-bold text-ink-2">{i.tf}</span><span className={i.dir === "bullish" ? "text-up" : "text-down"}>{i.kind}</span></span>
          <span className="block text-[12px] text-ink-2">{i.text}</span>
          <span className="num block text-[11px] text-ink-3">{new Date(i.t * 1000).toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}</span>
        </li>
      ))}
    </ol>
  );
}
