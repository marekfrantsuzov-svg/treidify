"use client";

import { useEffect, useState } from "react";
import type { Candle } from "@/lib/analytics/types";
import { computeOverlays, type OverlayTf, type TfOverlays } from "@/lib/intelligence/overlays";

export interface TfData { tf: OverlayTf; candles: Candle[]; overlays: TfOverlays; sample: boolean; freshness: string | null; lastBarAt: string | null }
export type TfState = { status: "loading" } | { status: "error"; message: string } | { status: "ready"; data: TfData };

/** Fetches each timeframe's candles from the market API and computes that timeframe's overlays in the browser. */
export function useTfOverlays(symbol: string, digits: number, tfs: OverlayTf[]): Partial<Record<OverlayTf, TfState>> {
  const key = tfs.join(",");
  const [out, setOut] = useState<Partial<Record<OverlayTf, TfState>>>(() => Object.fromEntries(tfs.map((t) => [t, { status: "loading" }])));
  useEffect(() => {
    let live = true;
    setOut(Object.fromEntries(key.split(",").map((t) => [t, { status: "loading" }])));
    for (const tf of key.split(",") as OverlayTf[]) {
      fetch(`/api/market/candles?symbol=${symbol}&tf=${tf}`, { cache: "no-store" })
        .then(async (r) => ({ ok: r.ok, body: await r.json() }))
        .then(({ ok, body }) => {
          if (!live) return;
          if (!ok || !body.candles?.length) { setOut((o) => ({ ...o, [tf]: { status: "error", message: body.message ?? "Market data unavailable." } })); return; }
          const candles: Candle[] = body.candles;
          const overlays = computeOverlays({ symbol, tf, digits, candles, sample: !!body.sample });
          setOut((o) => ({ ...o, [tf]: { status: "ready", data: { tf, candles, overlays, sample: !!body.sample, freshness: body.freshness ?? null, lastBarAt: body.lastBarAt ?? null } } }));
        })
        .catch(() => { if (live) setOut((o) => ({ ...o, [tf]: { status: "error", message: "Market data unavailable." } })); });
    }
    return () => { live = false; };
  }, [symbol, digits, key]);
  return out;
}

export const ready = (s: TfState | undefined): TfData | null => (s?.status === "ready" ? s.data : null);
