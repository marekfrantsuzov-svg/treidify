"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { cn } from "@/lib/cn";
import { fmtMoney, fmtSignedMoney } from "@/lib/format";
import { useLiveAccount } from "./live-account";

const ago = (ms: number) => (ms < 60_000 ? `${Math.max(1, Math.round(ms / 1000))} s ago` : ms < 3600_000 ? `${Math.round(ms / 60_000)} min ago` : ms < 86_400_000 ? `${Math.round(ms / 3600_000)} h ago` : `${Math.round(ms / 86_400_000)} d ago`);

/**
 * Connection health for the selected real account: status, verified access, equity, floating P&L and how old the
 * figures are. Wording is exact: values are refreshed on an interval, never called real-time.
 */
export function ConnectionBar({ label }: { label: string }) {
  const ctx = useLiveAccount();
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 5000); return () => clearInterval(t); }, []);
  const live = ctx?.live;
  if (!live) return null;
  const age = live.asOf ? now - Date.parse(live.asOf) : null;
  const stale = age === null || age > 15 * 60_000;
  const ok = live.status === "connected" && !!live.accessMode;
  const tone = !ok ? (live.status === "error" || live.status === "reconnection_required" || live.status === "disconnected" ? "down" : "warn") : stale ? "warn" : "up";
  const statusText = ok
    ? live.accessMode === "investor" ? "Connected · read-only verified" : "Connected · owner master password, read-only use"
    : live.status === "pending" || live.status === "synchronizing" ? "Connecting to your broker…" : live.status === "disconnected" ? "Disconnected" : "Needs attention";
  const c = live.currency ?? "USD";
  return (
    <div className="dcard flex flex-wrap items-center gap-x-4 gap-y-1.5 px-3.5 py-2.5 text-[12.5px] sm:px-4" role="status" aria-live="polite">
      <span className="flex min-w-0 items-center gap-2 font-medium text-ink">
        <span aria-hidden className={cn("h-2 w-2 shrink-0 rounded-full", tone === "up" ? "bg-[var(--up)]" : tone === "warn" ? "bg-[var(--warn)]" : "bg-[var(--down)]", ctx?.refreshing && "animate-pulse")} />
        <span className="truncate">{statusText}</span>
        <span className="hidden truncate text-ink-3 sm:inline">· {label}</span>
      </span>
      {live.equity !== null && <span className="num text-ink-2">Equity <b className="font-semibold text-ink">{fmtMoney(live.equity, c, 2)}</b></span>}
      {live.floating !== null && <span className="num text-ink-2">Floating <b className={cn("font-semibold", live.floating < 0 ? "text-down-ink" : live.floating > 0 ? "text-up-ink" : "text-ink")}>{fmtSignedMoney(live.floating, c)}</b></span>}
      <span className="text-[11.5px] text-ink-3 sm:text-[12.5px]">{age === null ? "No account data yet" : `Updated ${ago(age)}`} · refreshes every {Math.round((ctx?.intervalMs ?? 30_000) / 1000)} s while open{live.lastSyncAt ? <span className="hidden sm:inline">{` · history synced ${ago(now - Date.parse(live.lastSyncAt))}`}</span> : null}</span>
      {ok && stale && age !== null && <span className="font-medium text-warn">These figures are {ago(age).replace(" ago", "")} old.</span>}
      {live.error && <span className="text-down">{live.error}</span>}
      {!ok && <Link href="/app/accounts" className="font-semibold text-accent">Manage connection</Link>}
    </div>
  );
}
