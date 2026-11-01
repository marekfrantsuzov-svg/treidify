"use client";

import { useSyncExternalStore } from "react";

/** Shared, tiny store so the top bar can show the data freshness the dashboard last received. */
export interface FreshnessState { mode: "live" | "sample" | "error" | "unknown"; freshness: string | null; asOf: string | null; vendor: string | null }
let state: FreshnessState = { mode: "unknown", freshness: null, asOf: null, vendor: null };
const subs = new Set<() => void>();
export const setFreshness = (s: FreshnessState) => { state = s; subs.forEach((f) => f()); };
export const useFreshness = () => useSyncExternalStore((f) => { subs.add(f); return () => subs.delete(f); }, () => state, () => state);
