import { NextResponse } from "next/server";
import { apiMember } from "@/server/session";
import { getSeries, marketDataStatus } from "@/server/market/service";
import { isMarketSymbol, isTimeframe } from "@/server/market/instruments";
import { sampleMtf, sampleSeries } from "@/lib/demo/markets";
import { rateLimit } from "@/lib/rate-limit";
import { digitsOf } from "@/lib/markets/registry";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  // Signed in AND a member with current access (pending, expired and suspended accounts get 403).
  const m = await apiMember();
  if (!m.ok) return NextResponse.json({ error: m.error }, { status: m.status });
  const s = m.session;
  if (!rateLimit(`candles:${s.user.id}`, 60, 60_000).ok) return NextResponse.json({ error: "Too many requests." }, { status: 429 });
  const u = new URL(req.url);
  const symbol = u.searchParams.get("symbol") ?? "", tf = u.searchParams.get("tf") ?? "";
  if (!isMarketSymbol(symbol) || !isTimeframe(tf)) return NextResponse.json({ error: "Unknown symbol or timeframe." }, { status: 400 });
  if (!marketDataStatus().configured) {
    return NextResponse.json({ ok: true, sample: true, symbol, timeframe: tf, candles: tf === "4H" || tf === "1H" || tf === "15M" || tf === "5M" ? sampleMtf(symbol)[tf] : sampleSeries(symbol, tf), freshness: null, method: null, lastBarAt: null, digits: digitsOf(symbol) }, { headers: { "Cache-Control": "private, no-store" } });
  }
  const r = await getSeries(symbol, tf, 500);
  return NextResponse.json(r.ok ? { ...r, sample: false } : r, { status: r.ok ? 200 : 502, headers: { "Cache-Control": "private, no-store" } });
}
