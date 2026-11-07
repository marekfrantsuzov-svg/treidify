import { NextResponse, after } from "next/server";
import { z } from "zod";
import { MANUAL_REFRESH_MIN_MS } from "@/config/sync";
import { rateLimit } from "@/lib/rate-limit";
import { getSession } from "@/server/session";
import { liveRefresh, ownedConnection, syncConnection } from "@/server/sync/service";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const Id = z.string().uuid();

async function respond(req: Request, manual: boolean) {
  const s = await getSession();
  if (!s) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const id = Id.safeParse(new URL(req.url).searchParams.get("account"));
  if (!id.success) return NextResponse.json({ error: "Bad request" }, { status: 400 });
  if (!rateLimit(`live:${s.user.id}`, 30, 60_000).ok) return NextResponse.json({ error: "Too many requests" }, { status: 429, headers: { "Retry-After": "30" } });
  if (manual && !rateLimit(`live-manual:${id.data}`, 1, MANUAL_REFRESH_MIN_MS).ok) {
    return NextResponse.json({ error: "Refreshed a moment ago. Try again in a couple of minutes." }, { status: 429, headers: { "Retry-After": String(MANUAL_REFRESH_MIN_MS / 1000) } });
  }
  const live = await liveRefresh(s.user.id, id.data, new Date(), true, manual);
  if (!live) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (live.needsFullSync && rateLimit(`live-sync:${id.data}`, 1, manual ? MANUAL_REFRESH_MIN_MS : 5 * 60_000).ok) {
    after(async () => { const row = await ownedConnection(s.user.id, id.data); if (row) await syncConnection(row.c.id); });
  }
  return NextResponse.json(live, { headers: { "Cache-Control": "private, no-store" } });
}

/**
 * Balance, equity and open positions for one of the signed-in user's accounts. GET returns the stored state and calls
 * MetaApi only when the last refresh is older than ACCOUNT_REFRESH_INTERVAL (one hour), shared across every tab and
 * device. Authenticated and owner-scoped: another user's account id answers 404, exactly like a missing one.
 */
export async function GET(req: Request) { return respond(req, false); }

/** Manual refresh ("Refresh now"): at most once every MANUAL_REFRESH_MIN_MS per account, also runs a history sync. */
export async function POST(req: Request) { return respond(req, true); }
