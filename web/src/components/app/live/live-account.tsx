"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { LiveState } from "@/server/sync/service";

const POLL_MS = 30_000;
const Ctx = createContext<{ live: LiveState | null; refreshing: boolean; intervalMs: number } | null>(null);

/** Live (polled) balance, equity and positions for the selected real account, or null for none/sample/combined views. */
export const useLiveAccount = () => useContext(Ctx);

/**
 * Polls /api/account/live every 30 s while the tab is visible, for one real account. This is periodic refresh over
 * MetaApi's REST API, not streaming, and the UI says so. When the history sync brings new closed trades, the page's
 * server data is refreshed once so statistics and the journal include them.
 */
export function LiveAccountProvider({ accountId, initial, children }: { accountId: string | null; initial: LiveState | null; children: React.ReactNode }) {
  const router = useRouter();
  const [live, setLive] = useState<LiveState | null>(initial);
  const [refreshing, setRefreshing] = useState(false);
  const lastSync = useRef(initial?.lastSyncAt ?? null);

  const poll = useCallback(async () => {
    if (!accountId || document.visibilityState !== "visible") return;
    setRefreshing(true);
    try {
      const r = await fetch(`/api/account/live?account=${encodeURIComponent(accountId)}`, { cache: "no-store" });
      if (r.ok) {
        const next = (await r.json()) as LiveState;
        setLive(next);
        if (next.lastSyncAt && next.lastSyncAt !== lastSync.current) { lastSync.current = next.lastSyncAt; router.refresh(); }
      }
    } catch { /* offline: keep the last values with their real timestamp */ }
    finally { setRefreshing(false); }
  }, [accountId, router]);

  useEffect(() => {
    setLive(initial);
    lastSync.current = initial?.lastSyncAt ?? null;
  }, [initial]);

  useEffect(() => {
    if (!accountId) return;
    const first = setTimeout(poll, 1500);
    const t = setInterval(poll, POLL_MS);
    const vis = () => { if (document.visibilityState === "visible") poll(); };
    document.addEventListener("visibilitychange", vis);
    return () => { clearTimeout(first); clearInterval(t); document.removeEventListener("visibilitychange", vis); };
  }, [accountId, poll]);

  return <Ctx.Provider value={{ live: accountId ? live : null, refreshing, intervalMs: POLL_MS }}>{children}</Ctx.Provider>;
}
