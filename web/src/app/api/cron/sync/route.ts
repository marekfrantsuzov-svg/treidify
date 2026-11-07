import { NextResponse } from "next/server";
import { ACCOUNT_REFRESH_INTERVAL } from "@/config/sync";
import { dueConnections, syncConnection, syncStatus } from "@/server/sync/service";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** Vercel Cron: hourly sync of connected MetaTrader accounts not synced within ACCOUNT_REFRESH_INTERVAL. Protected by CRON_SECRET (Vercel sends it as a Bearer token). */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!syncStatus().configured) return NextResponse.json({ skipped: "METAAPI_TOKEN not set" });
  const due = await dueConnections(ACCOUNT_REFRESH_INTERVAL / 60_000, 15);
  const results = [];
  for (const c of due) results.push({ id: c.id, ...(await syncConnection(c.id)) });
  return NextResponse.json({ synced: results.filter((r) => r.ok).length, failed: results.filter((r) => !r.ok).length });
}
