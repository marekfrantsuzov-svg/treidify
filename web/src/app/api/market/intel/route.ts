import { NextResponse } from "next/server";
import { getSession } from "@/server/session";
import { marketIntelligence } from "@/server/market/intelligence";
import { upcomingEvents } from "@/server/news/service";
import { rateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

/** Polled by the dashboard about once a minute. Signed-in users only; the vendor key stays on the server. */
export async function GET() {
  const s = await getSession();
  if (!s) return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  if (!rateLimit(`intel:${s.user.id}`, 30, 60_000).ok) return NextResponse.json({ error: "Too many requests." }, { status: 429 });
  const snap = await marketIntelligence(await upcomingEvents());
  return NextResponse.json(snap, { headers: { "Cache-Control": "private, no-store" } });
}
