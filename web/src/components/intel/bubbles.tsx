"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useState } from "react";
import type { Bubble, InstrumentIntel, Zone } from "@/lib/intelligence";
import { cn } from "@/lib/cn";
import { Modal } from "./modal";

const style: Record<Bubble["kind"], { dot: string; label: string; ring: string }> = {
  buy: { dot: "bg-up", label: "text-up", ring: "before:bg-[radial-gradient(120%_100%_at_0%_0%,var(--up-soft),transparent_60%)]" },
  sell: { dot: "bg-down", label: "text-down", ring: "before:bg-[radial-gradient(120%_100%_at_0%_0%,var(--down-soft),transparent_60%)]" },
  context: { dot: "bg-accent", label: "text-accent", ring: "before:bg-[radial-gradient(120%_100%_at_0%_0%,var(--accent-soft),transparent_60%)]" },
  liquidity: { dot: "bg-[var(--brand-pink)]", label: "text-accent-2", ring: "before:bg-[radial-gradient(120%_100%_at_0%_0%,color-mix(in_oklab,var(--brand-pink)_14%,transparent),transparent_60%)]" },
  structure: { dot: "bg-ice", label: "text-ice", ring: "" },
  risk: { dot: "bg-warn", label: "text-warn", ring: "before:bg-[radial-gradient(120%_100%_at_0%_0%,var(--warn-soft),transparent_60%)]" },
};

/** iMessage-style intelligence bubbles that sit beside the chart. Tap one for the full explanation. */
export function IntelBubbles({ intel, sample, className }: { intel: InstrumentIntel; sample?: boolean; className?: string }) {
  const [open, setOpen] = useState<Bubble | null>(null);
  const reduce = useReducedMotion();
  const zone = open?.zoneId ? intel.zones.find((z) => z.id === open.zoneId) ?? null : null;
  const updated = new Date(intel.asOf).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  return (
    <div className={cn("flex flex-col gap-2.5", className)}>
      <AnimatePresence initial={!reduce}>
        {intel.bubbles.length === 0 && (
          <p className="rounded-3xl rounded-bl-md bg-inset px-4 py-3 text-sm text-ink-3">{intel.bias === "insufficient" ? "Not enough data for intelligence notes yet." : "No zone, sweep or structure event worth flagging right now."}</p>
        )}
        {intel.bubbles.map((b, i) => (
          <motion.button
            key={b.id}
            layout={!reduce}
            initial={reduce ? false : { opacity: 0, y: 14, scale: 0.96, filter: "blur(6px)" }}
            animate={{ opacity: 1, y: 0, scale: 1, filter: "blur(0px)" }}
            exit={{ opacity: 0, scale: 0.96 }}
            transition={{ type: "spring", stiffness: 380, damping: 30, delay: reduce ? 0 : i * 0.06 }}
            onClick={() => setOpen(b)}
            className={cn("glass glass-hover press relative overflow-hidden rounded-[22px] rounded-bl-[6px] px-4 py-3 text-left before:pointer-events-none before:absolute before:inset-0 before:content-['']", style[b.kind].ring)}
          >
            <span className="relative flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.12em]">
              <span className={cn("h-2 w-2 rounded-full shadow-[0_0_10px_currentColor]", style[b.kind].dot)} />
              <span className={style[b.kind].label}>{b.title}</span>
              <span className="ml-auto font-medium normal-case tracking-normal text-ink-3">{b.timeframe} · {updated}</span>
            </span>
            <span className="relative mt-1.5 block text-[13.5px] leading-snug text-ink">{b.text}</span>
          </motion.button>
        ))}
      </AnimatePresence>
      {sample && <p className="px-1 text-[11px] text-warn">Sample bars: these notes demonstrate the engine and are not a market reading.</p>}
      <Modal open={!!open} onClose={() => setOpen(null)} title={open?.title ?? ""} subtitle={`${intel.symbol} · ${open?.timeframe ?? ""} · updated ${updated}${sample ? " · SAMPLE" : ""}`}>
        {open && <p className="text-[15px] text-ink">{open.text}</p>}
        {zone && <ZoneDetail zone={zone} digits={intel.digits} />}
        {!zone && open?.kind === "context" && <ul className="mt-4 grid gap-2 text-sm text-ink-2">{intel.components.filter((c) => c.id === "dxy").map((c) => <li key={c.id} className="inset rounded-2xl px-4 py-3">{c.detail}</li>)}</ul>}
        <p className="mt-4 text-xs text-ink-3">Calculated by the Treidify engine from {sample ? "sample" : "provider"} candles. Potential zones are areas to watch, not instructions to trade.</p>
      </Modal>
    </div>
  );
}

export function ZoneDetail({ zone, digits }: { zone: Zone; digits: number }) {
  const row = "inset rounded-2xl px-4 py-3";
  return (
    <dl className="mt-4 grid gap-2 text-sm">
      <div className={row}><dt className="text-xs text-ink-3">Price range · timeframe</dt><dd className="num mt-0.5 text-lg font-semibold text-ink">{zone.lower.toFixed(digits)} – {zone.upper.toFixed(digits)} <span className="text-sm font-normal text-ink-3">· {zone.timeframe}</span></dd></div>
      <div className={row}><dt className="text-xs text-ink-3">Why this zone</dt><dd className="mt-1 grid gap-1 text-ink">{zone.reasons.map((r, i) => <span key={i}>• {r}</span>)}</dd></div>
      <div className={row}><dt className="text-xs text-ink-3">Confirmation to wait for</dt><dd className="mt-1 text-ink">{zone.confirmation}</dd></div>
      <div className={cn(row, "bg-warn-soft")}><dt className="text-xs text-ink-3">Invalidation</dt><dd className="mt-1 text-ink">{zone.invalidation.text}</dd></div>
      <div className={row}><dt className="text-xs text-ink-3">Status</dt><dd className="mt-1 text-ink">{zone.status === "confirmed" ? "5M structure has confirmed inside the zone." : zone.status === "in-zone" ? "Price is inside the zone; no 5M confirmation yet." : `Watching: price is ${zone.distanceATR} × 1H ATR away.`} {zone.withTrend ? "With the 4H trend." : "Against the 4H trend: lower odds."}</dd></div>
    </dl>
  );
}
