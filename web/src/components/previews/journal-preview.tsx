"use client";

import { useMemo, useState } from "react";
import { bySession, netProfit, sessionAt, sessionName } from "@/lib/analytics";
import { sampleTrades } from "@/lib/demo/sample";
import { fmtSignedMoney } from "@/lib/format";
import { cn } from "@/lib/cn";
import { SlidingPill } from "@/components/ui/sliding-pill";
import { Glass } from "@/components/ui/glass";
import { Pill, SampleBadge } from "@/components/ui/pill";

const filters = ["All", "XAUUSD", "XAGUSD", "EURUSD"] as const;

export function JournalPreview({ className, rows = 7 }: { className?: string; rows?: number }) {
  const trades = useMemo(() => sampleTrades(), []);
  const [f, setF] = useState<(typeof filters)[number]>("All");
  const shown = useMemo(() => (f === "All" ? trades : trades.filter((t) => t.symbol === f)), [trades, f]);
  const sessions = useMemo(() => bySession(shown).sort((a, b) => b.metrics.netProfit - a.metrics.netProfit), [shown]);
  const maxAbs = Math.max(...sessions.map((s) => Math.abs(s.metrics.netProfit)), 1);
  return (
    <Glass className={cn("p-4 sm:p-5", className)}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <h3 className="text-[15px] font-semibold text-ink">Trading journal</h3>
          <SampleBadge label="Sample account" />
        </div>
        <div className="inset relative flex rounded-full p-0.5" role="tablist" aria-label="Instrument filter">
          <SlidingPill watch={f} className="rounded-full bg-[var(--surface-strong)] shadow-[var(--shadow),0_0_0_1px_color-mix(in_oklab,var(--accent)_14%,transparent)]" />
          {filters.map((x) => (
            <button key={x} role="tab" aria-selected={f === x} data-active={f === x} onClick={() => setF(x)} className={cn("relative z-[1] rounded-full px-2.5 py-1 text-xs font-medium text-ink-3 transition-colors duration-200 hover:text-ink", f === x && "text-accent")}>{x}</button>
          ))}
        </div>
      </div>
      <div className="mt-4 overflow-x-auto">
        <table className="num w-full min-w-[520px] text-left text-[13px]">
          <thead className="text-[11px] uppercase tracking-[0.08em] text-ink-3">
            <tr><th className="pb-2 font-medium">Closed</th><th className="pb-2 font-medium">Instrument</th><th className="pb-2 font-medium">Side</th><th className="pb-2 font-medium">Lots</th><th className="pb-2 font-medium">Session</th><th className="pb-2 text-right font-medium">Net P&L</th></tr>
          </thead>
          <tbody>
            {shown.slice(-rows).reverse().map((t) => {
              const n = netProfit(t);
              return (
                <tr key={t.id} className="border-t border-line">
                  <td className="py-2 text-ink-2">{new Date(t.closeTime * 1000).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}</td>
                  <td className="py-2 font-medium text-ink">{t.symbol}</td>
                  <td className="py-2"><Pill tone={t.side === "buy" ? "up" : "down"}>{t.side.toUpperCase()}</Pill></td>
                  <td className="py-2 text-ink-2">{t.volume.toFixed(2)}</td>
                  <td className="py-2 text-ink-2">{sessionName(sessionAt(new Date(t.openTime * 1000)) ?? "off")}</td>
                  <td className={cn("py-2 text-right font-semibold", n >= 0 ? "text-up" : "text-down")}>{fmtSignedMoney(n)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="mt-4">
        <div className="text-[11px] font-semibold uppercase tracking-[0.1em] text-ink-3">Profit by session (open time)</div>
        <div className="mt-2 grid gap-1.5">
          {sessions.map((s) => (
            <div key={s.session} className="grid grid-cols-[110px_1fr_90px] items-center gap-3 text-xs">
              <span className="truncate text-ink-2">{sessionName(s.session)}</span>
              <div className="h-2 overflow-hidden rounded-full bg-inset">
                <div className={cn("h-full rounded-full", s.metrics.netProfit >= 0 ? "bg-up" : "bg-down")} style={{ width: `${(Math.abs(s.metrics.netProfit) / maxAbs) * 100}%` }} />
              </div>
              <span className={cn("num text-right font-medium", s.metrics.netProfit >= 0 ? "text-up" : "text-down")}>{fmtSignedMoney(s.metrics.netProfit, "USD", 0)}</span>
            </div>
          ))}
        </div>
      </div>
    </Glass>
  );
}
