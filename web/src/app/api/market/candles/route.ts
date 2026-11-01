import { NextResponse } from "next/server";
import { getSession } from "@/server/session";
import { getSeries, marketDataStatus } from "@/server/market/service";
import { isMarketSymbol, isTimeframe } from "@/server/market/instruments";
import { sampleMtf, sampleSeries } from "@/lib/demo/markets";
import { rateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const s = await getSession();
  if (!s) return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  if (!rateLimit(`candles:${s.user.id}`, 60, 60_000).ok) return NextResponse.json({ error: "Too many requests." }, { status: 429 });
  const u = new URL(req.url);
  const symbol = u.searchParams.get("symbol") ?? "", tf = u.searchParams.get("tf") ?? "";
  if (!isMarketSymbol(symbol) || !isTimeframe(tf)) return NextResponse.json({ error: "Unknown symbol or timeframe." }, { status: 400 });
  if (!marketDataStatus().configured) {
    return NextResponse.json({ ok: true, sample: true, symbol, timeframe: tf, candles: tf === "1M" || tf === "1D" ? sampleSeries(symbol, tf) : sampleMtf(symbol)[tf], freshness: null, method: null, lastBarAt: null }, { headers: { "Cache-Control": "private, no-store" } });
  }
  const r = await getSeries(symbol, tf, 500);
  return NextResponse.json(r.ok ? { ...r, sample: false } : r, { status: r.ok ? 200 : 502, headers: { "Cache-Control": "private, no-store" } });
}
