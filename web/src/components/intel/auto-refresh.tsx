"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

/**
 * Re-reads the page from the server shortly after the next scheduled release (and every `everyMs` while a release
 * is waiting for its data), so actual values appear without a manual reload. Pauses while the tab is hidden.
 */
export function AutoRefresh({ nextAt, waiting, everyMs = 5 * 60_000 }: { nextAt: string | null; waiting: boolean; everyMs?: number }) {
  const router = useRouter();
  useEffect(() => {
    const due = nextAt ? Date.parse(nextAt) + 2 * 60_000 - Date.now() : Infinity;
    const wait = Math.min(waiting ? everyMs : Infinity, due > 0 ? due : everyMs, 6 * 3600_000);
    if (!Number.isFinite(wait)) return;
    const id = window.setTimeout(() => { if (document.visibilityState === "visible") router.refresh(); }, Math.max(30_000, wait));
    const onVis = () => { if (document.visibilityState === "visible" && nextAt && Date.parse(nextAt) < Date.now() - 60_000 && waiting) router.refresh(); };
    document.addEventListener("visibilitychange", onVis);
    return () => { window.clearTimeout(id); document.removeEventListener("visibilitychange", onVis); };
  }, [nextAt, waiting, everyMs, router]);
  return null;
}
