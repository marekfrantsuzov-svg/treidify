"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { cn } from "@/lib/cn";

const select = "inset h-9 rounded-full px-3 text-sm text-ink outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]";

/** URL-driven journal filters, so a filtered view can be bookmarked and survives reloads. */
export function JournalFilters({ symbols }: { symbols: string[] }) {
  const router = useRouter();
  const path = usePathname();
  const params = useSearchParams();
  const set = (k: string, v: string) => {
    const q = new URLSearchParams(params.toString());
    if (v) q.set(k, v); else q.delete(k);
    q.delete("page");
    router.push(`${path}?${q}`, { scroll: false });
  };
  const val = (k: string) => params.get(k) ?? "";
  const active = ["symbol", "side", "outcome", "session", "notes"].some((k) => params.get(k));
  return (
    <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Filter trades">
      <select aria-label="Instrument" className={select} value={val("symbol")} onChange={(e) => set("symbol", e.target.value)}>
        <option value="">All instruments</option>
        {symbols.map((s) => <option key={s} value={s}>{s}</option>)}
      </select>
      <select aria-label="Direction" className={select} value={val("side")} onChange={(e) => set("side", e.target.value)}>
        <option value="">Long and short</option><option value="buy">Long</option><option value="sell">Short</option>
      </select>
      <select aria-label="Outcome" className={select} value={val("outcome")} onChange={(e) => set("outcome", e.target.value)}>
        <option value="">Wins and losses</option><option value="win">Wins</option><option value="loss">Losses</option>
      </select>
      <select aria-label="Session" className={select} value={val("session")} onChange={(e) => set("session", e.target.value)}>
        <option value="">All sessions</option><option value="sydney">Sydney</option><option value="tokyo">Tokyo</option><option value="london">London</option><option value="newYork">New York</option><option value="off">Outside sessions</option>
      </select>
      <select aria-label="Journal notes" className={select} value={val("notes")} onChange={(e) => set("notes", e.target.value)}>
        <option value="">Any notes</option><option value="with">With notes</option><option value="without">Not reviewed</option>
      </select>
      <button
        type="button"
        onClick={() => { const q = new URLSearchParams(params.toString()); ["symbol", "side", "outcome", "session", "notes", "page"].forEach((k) => q.delete(k)); router.push(`${path}?${q}`, { scroll: false }); }}
        className={cn("h-9 rounded-full px-3 text-sm font-medium text-accent hover:bg-accent-soft", !active && "invisible")}
      >
        Clear filters
      </button>
    </div>
  );
}
