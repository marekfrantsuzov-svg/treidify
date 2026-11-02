"use client";

import { useState } from "react";
import { cn } from "@/lib/cn";
import { fmtSignedMoney } from "@/lib/format";
import type { Bucket, BucketUnit } from "@/lib/analytics";

const LABEL: Record<BucketUnit, string> = { day: "Daily", week: "Weekly", month: "Monthly" };
const fmtKey = (k: string, unit: BucketUnit) => {
  const d = new Date(`${unit === "month" ? `${k}-15` : k}T12:00:00Z`);
  if (unit === "month") return d.toLocaleDateString("en-GB", { month: "long", year: "numeric", timeZone: "UTC" });
  const day = d.toLocaleDateString("en-GB", { weekday: unit === "day" ? "short" : undefined, day: "numeric", month: "short", timeZone: "UTC" });
  return unit === "week" ? `Week of ${day}` : day;
};

/** Realized results per day, week or month (close time, your time zone), newest first. */
export function JournalSummary({ data, currency }: { data: Record<BucketUnit, Bucket[]>; currency: string }) {
  const [unit, setUnit] = useState<BucketUnit>("day");
  const rows = data[unit].slice(0, 12);
  return (
    <div>
      <div className="inset mb-3 inline-flex rounded-full p-0.5" role="tablist" aria-label="Period">
        {(Object.keys(LABEL) as BucketUnit[]).map((u) => (
          <button key={u} role="tab" aria-selected={unit === u} onClick={() => setUnit(u)}
            className={cn("rounded-full px-3 py-1 text-[12px] font-semibold transition-colors", unit === u ? "bg-[var(--surface-strong)] text-ink shadow-[var(--shadow)]" : "text-ink-3 hover:text-ink")}>{LABEL[u]}</button>
        ))}
      </div>
      {rows.length === 0 ? <p className="text-sm text-ink-3">No closed trades yet.</p> : (
        <ul className="num divide-y divide-[var(--border)] text-[13px]">
          {rows.map((b) => (
            <li key={b.key} className="flex items-center gap-3 py-2">
              <span className="min-w-0 flex-1 truncate text-ink">{fmtKey(b.key, unit)}</span>
              <span className="w-16 text-right text-ink-3">{b.trades} {b.trades === 1 ? "trade" : "trades"}</span>
              <span className="hidden w-14 text-right text-ink-3 sm:inline">{b.winRate === null ? "—" : `${Math.round(b.winRate * 100)}%`}</span>
              <span className={cn("w-24 text-right font-semibold", b.net > 0 ? "text-up" : b.net < 0 ? "text-down" : "text-ink-3")}>{fmtSignedMoney(b.net, currency)}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
