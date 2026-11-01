import { NextResponse } from "next/server";
import { communityTick } from "@/server/community/service";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** Hourly Vercel Cron. Posts only on live data while markets are open. */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return NextResponse.json(await communityTick());
}
