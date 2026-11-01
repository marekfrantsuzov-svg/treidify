"use client";

import { ArrowDownRight, ArrowUpRight, CircleCheck, CircleDashed, Crosshair, Droplets, GitBranch, Hourglass, Ruler, ShieldAlert, Spline } from "lucide-react";
import type { SDZone, TfOverlays } from "@/lib/intelligence/overlays";
import { zoneReadiness } from "@/lib/intelligence/overlays";
import type { Trend } from "@/lib/intelligence/structure";
import { formatPips } from "@/lib/trading/pips";
import { cn } from "@/lib/cn";

export const fmtPrice = (v: number, d: number) => v.toLocaleString("en-US", { minimumFractionDigits: d, maximumFractionDigits: d });

export const statusText: Record<SDZone["status"], string> = { active: "Active", tested: "Tested", invalidated: "Invalidated", historical: "Historical" };
export const statusHelp: Record<SDZone["status"], string> = {
  active: "Formed and not yet revisited.",
  tested: "Price has returned into it and it held.",
  invalidated: "A candle closed through its far edge.",
  historical: "Broken long ago or tested three or more times.",
};

/** The zone explanation panel: range, provenance, confluence, confirmation, invalidation and the 50-pip check. */
export function ZoneDetail({ zone: z, overlays: o, htfTrend, sample }: { zone: SDZone; overlays: TfOverlays; htfTrend: Trend | null; sample?: boolean }) {
  const d = o.digits, buy = z.side === "buy";
  const r = zoneReadiness(o, z, htfTrend);
  const valid = r.status === "valid";
  return (
    <div className="grid gap-3.5">
      <div className={cn("zone-hero", buy ? "is-buy" : "is-sell")}>
        <div className="flex items-center gap-2 text-[12px] font-bold uppercase tracking-[0.12em]">
          {buy ? <ArrowUpRight className="h-4 w-4" /> : <ArrowDownRight className="h-4 w-4" />}{buy ? "Buy zone · demand" : "Sell zone · supply"}
        </div>
        <div className="num mt-1 text-[26px] font-semibold tracking-[-0.02em] text-ink sm:text-[30px]">{fmtPrice(z.lower, d)} – {fmtPrice(z.upper, d)}</div>
        <div className="mt-2 flex flex-wrap gap-1.5 text-[11.5px] font-semibold">
          <span className="chip">{o.symbol} · {z.tf}</span>
          <span className={cn("chip", `is-${z.status}`)} title={statusHelp[z.status]}>{statusText[z.status]}</span>
          <span className="chip capitalize">{z.strength}</span>
          {z.tests > 0 && <span className="chip">{z.tests} test{z.tests === 1 ? "" : "s"}</span>}
          {sample && <span className="chip is-warn">Sample bars</span>}
        </div>
      </div>

      <div className={cn("rounded-2xl px-3.5 py-3 text-[13px] font-semibold leading-snug", valid ? "bg-up-soft text-up" : "bg-warn-soft text-warn")}>
        <span className="inline-flex items-start gap-2">{valid ? <CircleCheck className="mt-px h-4 w-4 shrink-0" /> : <Hourglass className="mt-px h-4 w-4 shrink-0" />}{r.headline}</span>
      </div>

      <dl className="zone-rows">
        <Row icon={<GitBranch />} k="Origin">{z.reasons[0]}.</Row>
        <Row icon={<Spline />} k="Structure">{z.brokeStructure ? `The departure broke ${z.tf} structure: ${z.brokeStructure.kind} through ${fmtPrice(z.brokeStructure.level, d)}.` : `No ${z.tf} structure break came with the departure, so the zone is weaker.`}</Row>
        <Row icon={<Droplets />} k="Liquidity">{z.liquidity ? `${z.liquidity.charAt(0).toUpperCase()}${z.liquidity.slice(1)}. Estimated from swing structure, not order-book data.` : "No clustered liquidity right next to this zone."}</Row>
        <Row icon={<Ruler />} k="Fibonacci">{z.fib.length ? `${z.fib.map((l) => `${(l.ratio * 100).toFixed(1)}% at ${fmtPrice(l.price, d)}`).join(", ")} of the ${z.tf} ${buy ? "up" : "down"}-leg sits inside.` : `No ${z.tf} Fibonacci level inside the zone.`}</Row>
        <Row icon={<Crosshair />} k="Confirmation">{buy ? `Let price trade into ${fmtPrice(z.lower, d)} – ${fmtPrice(z.upper, d)}, then wait for a 5M bullish CHOCH (a close above the last 5M swing high) from inside the zone.` : `Let price trade into ${fmtPrice(z.lower, d)} – ${fmtPrice(z.upper, d)}, then wait for a 5M bearish CHOCH (a close below the last 5M swing low) from inside the zone.`}</Row>
        <Row icon={<ShieldAlert />} k="Invalidation">{`A ${z.tf} close ${buy ? "below" : "above"} ${fmtPrice(z.invalidation, d)} (the far edge plus 0.1 × ATR).`}</Row>
      </dl>

      <div className="rounded-2xl bg-[var(--surface-inset)] p-3.5">
        <div className="flex items-center justify-between gap-2 text-[12.5px]">
          <span className="font-semibold text-ink">50-pip stop rule</span>
          <span className={cn("ready-pill", z.stop.eligible ? "is-ready" : "is-wait")}>{z.stop.eligible ? <CircleCheck /> : <ShieldAlert />}{z.stop.eligible ? "Respects the rule" : "Breaks the rule"}</span>
        </div>
        <div className="mt-2.5 meter" aria-hidden><span className={cn("meter-fill", !z.stop.eligible && "is-over")} style={{ width: `${Math.min(100, (z.stop.pips / (z.stop.max ?? Math.max(z.stop.pips, 1))) * 100)}%` }} /></div>
        <p className="num mt-2 text-[12.5px] leading-snug text-ink-2">
          Entry edge {fmtPrice(z.proximal, d)} → structural stop {fmtPrice(z.invalidation, d)} = <b className="text-ink">{formatPips(o.symbol, z.stop.pips)}</b>
          {z.stop.max !== null && <> of a {formatPips(o.symbol, z.stop.max)} maximum.</>}
          {!z.stop.eligible && " The stop is never tightened to fit, so this is WAIT / NO VALID SETUP."}
        </p>
        {o.symbol === "XAUUSD" && <p className="mt-1 text-[11px] text-ink-3">Pips measure gold price movement (1 pip = $0.10). Money at risk depends on your lot size.</p>}
      </div>

      <ul className="grid gap-1.5" aria-label="Entry checklist">
        {r.checks.map((c) => (
          <li key={c.id} className="flex items-start gap-2 text-[12.5px]">
            {c.done ? <CircleCheck className="mt-px h-4 w-4 shrink-0 text-up" /> : <CircleDashed className="mt-px h-4 w-4 shrink-0 text-ink-3" />}
            <span><span className={cn("font-semibold", c.done ? "text-ink" : "text-ink-2")}>{c.label}.</span> <span className="text-ink-3">{c.detail}</span></span>
          </li>
        ))}
      </ul>
      <p className="text-[11px] text-ink-3">Computed by Treidify from {o.bars} {o.tf} candles{sample ? " (sample bars, not a market reading)" : ""}. Analysis, not financial advice.</p>
    </div>
  );
}

function Row({ icon, k, children }: { icon: React.ReactNode; k: string; children: React.ReactNode }) {
  return (
    <div className="zone-row">
      <dt><span aria-hidden>{icon}</span>{k}</dt>
      <dd>{children}</dd>
    </div>
  );
}
