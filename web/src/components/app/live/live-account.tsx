"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ACCOUNT_REFRESH_INTERVAL } from "@/config/sync";
import type { LiveState } from "@/server/sync/service";

type Ctx = { live: LiveState | null; refreshing: boolean; intervalMs: number; refresh: () => Promise<string | null> };
const Ctx = createContext<Ctx | null>(null);

/** Stored balance, equity and positions for the selected real account, or null for none/sample/combined views. */
export const useLiveAccount = () => useContext(Ctx);

/**
 * Account data for one real account, on the hourly policy in config/sync.ts. Mounting or navigating does not call the
 * broker: the server already rendered the stored state. While the tab is visible, one check is scheduled for when the
 * stored figures turn an hour old; the server decides (with a shared, database-claimed slot) whether MetaApi is called.
 * `refresh()` is the rate-limited manual refresh. When a sync brings new closed trades, the page data refreshes once.
 */
export function LiveAccountProvider({ accountId, initial, children }: { accountId: string | null; initial: LiveState | null; children: React.ReactNode }) {
  const router = useRouter();
  const [live, setLive] = useState<LiveState | null>(initial);
  const [refreshing, setRefreshing] = useState(false);
  const lastSync = useRef(initial?.lastSyncAt ?? null);
  const inFlight = useRef(false);

  const load = useCallback(async (manual: boolean): Promise<string | null> => {
    if (!accountId || inFlight.current) return null;
    inFlight.current = true;
    setRefreshing(true);
    try {
      const r = await fetch(`/api/account/live?account=${encodeURIComponent(accountId)}`, { method: manual ? "POST" : "GET", cache: "no-store" });
      if (r.ok) {
        const next = (await r.json()) as LiveState;
        setLive(next);
        if (next.lastSyncAt && next.lastSyncAt !== lastSync.current) { lastSync.current = next.lastSyncAt; router.refresh(); }
        return null;
      }
      const body = (await r.json().catch(() => null)) as { error?: string } | null;
      return body?.error ?? "Could not refresh right now.";
    } catch { return "You appear to be offline."; }
    finally { inFlight.current = false; setRefreshing(false); }
  }, [accountId, router]);

  useEffect(() => {
    setLive(initial);
    lastSync.current = initial?.lastSyncAt ?? null;
  }, [initial]);

  // One timer, aimed at the moment the stored figures turn an hour old (never sooner than a minute from now).
  const asOf = live?.asOf ?? null;
  useEffect(() => {
    if (!accountId) return;
    const dueIn = () => Math.max(60_000, (asOf ? Date.parse(asOf) : 0) + ACCOUNT_REFRESH_INTERVAL - Date.now());
    let t = setTimeout(function tick() { if (document.visibilityState === "visible") void load(false); t = setTimeout(tick, ACCOUNT_REFRESH_INTERVAL); }, dueIn());
    const vis = () => { if (document.visibilityState === "visible" && (!asOf || Date.now() - Date.parse(asOf) >= ACCOUNT_REFRESH_INTERVAL)) void load(false); };
    document.addEventListener("visibilitychange", vis);
    return () => { clearTimeout(t); document.removeEventListener("visibilitychange", vis); };
  }, [accountId, asOf, load]);

  const refresh = useCallback(() => load(true), [load]);
  return <Ctx.Provider value={{ live: accountId ? live : null, refreshing, intervalMs: ACCOUNT_REFRESH_INTERVAL, refresh }}>{children}</Ctx.Provider>;
}
