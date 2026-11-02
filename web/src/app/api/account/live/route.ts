import { NextResponse, after } from "next/server";
import { z } from "zod";
import { rateLimit } from "@/lib/rate-limit";
import { getSession } from "@/server/session";
import { liveRefresh, ownedConnection, syncConnection } from "@/server/sync/service";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Balance, equity and open positions for one of the signed-in user's accounts, refreshed from MetaApi at most every
 * 20 seconds. Authenticated and owner-scoped: another user's account id answers 404, exactly like a missing one.
 * Also starts a background history sync when the last one is more than five minutes old.
 */
export async function GET(req: Request) {
  const s = await getSession();
  if (!s) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const id = z.string().uuid().safeParse(new URL(req.url).searchParams.get("account"));
  if (!id.success) return NextResponse.json({ error: "Bad request" }, { status: 400 });
  if (!rateLimit(`live:${s.user.id}`, 30, 60_000).ok) return NextResponse.json({ error: "Too many requests" }, { status: 429, headers: { "Retry-After": "30" } });
  const live = await liveRefresh(s.user.id, id.data);
  if (!live) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (live.needsFullSync && rateLimit(`live-sync:${id.data}`, 1, 5 * 60_000).ok) {
    after(async () => { const row = await ownedConnection(s.user.id, id.data); if (row) await syncConnection(row.c.id); });
  }
  return NextResponse.json(live, { headers: { "Cache-Control": "private, no-store" } });
}
