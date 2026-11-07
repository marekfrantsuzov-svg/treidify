import { NextResponse } from "next/server";
import { apiMember } from "@/server/session";
import { deskIntelligence, marketIntelligence } from "@/server/market/intelligence";
import { isSymbol } from "@/lib/markets/registry";
import { upcomingEvents } from "@/server/news/service";
import { rateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

/**
 * Polled by the dashboard about once a minute. Signed-in users only; the vendor key stays on the server.
 * ?symbols=EURUSD,BTCUSD returns the multi-asset snapshot for up to six registry instruments.
 */
export async function GET(req: Request) {
  // Signed in AND a member with current access (pending, expired and suspended accounts get 403).
  const m = await apiMember();
  if (!m.ok) return NextResponse.json({ error: m.error }, { status: m.status });
  const s = m.session;
  if (!rateLimit(`intel:${s.user.id}`, 30, 60_000).ok) return NextResponse.json({ error: "Too many requests." }, { status: 429 });
  const raw = new URL(req.url).searchParams.get("symbols");
  if (raw !== null) {
    const symbols = [...new Set(raw.split(",").map((x) => x.trim().toUpperCase()))];
    if (!symbols.length || symbols.length > 6 || !symbols.every((x) => isSymbol(x))) return NextResponse.json({ error: "Unknown or too many symbols." }, { status: 400 });
    return NextResponse.json(await deskIntelligence(symbols, await upcomingEvents()), { headers: { "Cache-Control": "private, no-store" } });
  }
  const snap = await marketIntelligence(await upcomingEvents());
  return NextResponse.json(snap, { headers: { "Cache-Control": "private, no-store" } });
}
