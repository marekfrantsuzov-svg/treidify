"use client";

import { RefreshCw } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { ACCOUNT_STALE_AFTER_MS } from "@/config/sync";
import { cn } from "@/lib/cn";
import { fmtMoney, fmtSignedMoney } from "@/lib/format";
import { useLiveAccount } from "./live-account";

const ago = (ms: number) => (ms < 60_000 ? "just now" : ms < 3600_000 ? `${Math.round(ms / 60_000)} min ago` : ms < 86_400_000 ? `${Math.round(ms / 3600_000)} h ago` : `${Math.round(ms / 86_400_000)} d ago`);

/**
 * Account status for the selected real account: "MT5 Connected", equity, floating P&L, status and when the figures
 * were last synced. Figures follow the hourly sync policy (config/sync.ts) and are never called live. The password
 * type, provider and refresh mechanics are not shown here. A manual refresh is offered, rate-limited on the server.
 */
export function ConnectionBar({ label, platform = "mt5" }: { label: string; platform?: "mt4" | "mt5" }) {
  const ctx = useLiveAccount();
  const [now, setNow] = useState(() => Date.now());
  const [note, setNote] = useState<string | null>(null);
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 30_000); return () => clearInterval(t); }, []);
  const live = ctx?.live;
  if (!live) return null;
  const P = platform.toUpperCase();
  const age = live.asOf ? now - Date.parse(live.asOf) : null;
  const ok = live.status === "connected" && !!live.accessMode;
  const stale = ok && (age === null || age > ACCOUNT_STALE_AFTER_MS || !!live.error);
  const tone = !ok ? (live.status === "pending" || live.status === "synchronizing" ? "stale" : "off") : stale ? "stale" : "ok";
  const title = ok ? `${P} Connected` : live.status === "pending" || live.status === "synchronizing" ? `Connecting ${P}…` : live.status === "disconnected" ? `${P} Disconnected` : `${P} needs attention`;
  const c = live.currency ?? "USD";
  const onRefresh = async () => { setNote(null); const err = await ctx?.refresh(); setNote(err ?? null); setNow(Date.now()); };

  return (
    <section className="dcard acct-status" aria-label="Trading account status" role="status" aria-live="polite">
      <div className="flex min-w-0 items-center gap-2.5">
        <span aria-hidden className={cn("acct-dot", `is-${tone}`, ctx?.refreshing && "animate-pulse")} />
        <div className="min-w-0 leading-tight">
          <div className="text-[14.5px] font-semibold text-ink">{title}</div>
          <div className="truncate text-[12px] text-ink-3">{label}</div>
        </div>
      </div>
      {live.equity !== null && <div className="num leading-tight"><div className="text-[11.5px] text-ink-3">Equity</div><div className="text-[15px] font-semibold text-ink">{fmtMoney(live.equity, c, 2)}</div></div>}
      {live.floating !== null && <div className="num leading-tight"><div className="text-[11.5px] text-ink-3">Floating P&L</div><div className={cn("text-[15px] font-semibold", live.floating < 0 ? "text-down-ink" : live.floating > 0 ? "text-up-ink" : "text-ink")}>{fmtSignedMoney(live.floating, c)}</div></div>}
      <div className="leading-tight">
        <div className="text-[11.5px] text-ink-3">Last sync</div>
        <div className={cn("text-[13.5px] font-medium", stale ? "text-warn" : "text-ink-2")} suppressHydrationWarning>{age === null ? "Not yet synced" : ago(age)}{stale && age !== null ? " · not current" : ""}</div>
      </div>
      <div className="ml-auto flex items-center gap-2">
        {note && <span className="text-[12px] text-ink-3">{note}</span>}
        {ok ? (
          <button type="button" onClick={onRefresh} disabled={ctx?.refreshing} className="press inline-flex h-11 items-center gap-1.5 rounded-full border border-line px-4 text-[13px] font-semibold text-ink-2 transition-colors hover:text-ink disabled:opacity-60 sm:h-9">
            <RefreshCw className={cn("h-4 w-4", ctx?.refreshing && "animate-spin")} />{ctx?.refreshing ? "Refreshing" : "Refresh"}
          </button>
        ) : <Link href="/app/accounts" className="press inline-flex h-11 items-center rounded-full bg-accent-soft px-4 text-[13px] font-semibold text-accent sm:h-9">Manage connection</Link>}
      </div>
    </section>
  );
}
