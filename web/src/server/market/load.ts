import "server-only";
import { cache } from "react";
import { deskIntelligence, marketIntelligence } from "./intelligence";
import { upcomingEvents } from "../news/service";

/** One intelligence snapshot per request, shared by every component on the page. */
export const loadIntel = cache(async () => {
  const now = new Date();
  return marketIntelligence(await upcomingEvents(now), now);
});

/** The signed-in user's Macro Desk: their three instruments (plus Gold for the Gold-specific sections). */
const deskBy = cache(async (key: string) => {
  const now = new Date();
  return deskIntelligence(key.split(","), await upcomingEvents(now), now);
});
export const loadDesk = (symbols: readonly string[]) => deskBy([...new Set(symbols)].join(","));
