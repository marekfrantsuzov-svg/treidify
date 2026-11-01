import "server-only";
import { cache } from "react";
import { marketIntelligence } from "./intelligence";
import { upcomingEvents } from "../news/service";

/** One intelligence snapshot per request, shared by every component on the page. */
export const loadIntel = cache(async () => {
  const now = new Date();
  return marketIntelligence(await upcomingEvents(now), now);
});
