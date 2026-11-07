import { NextResponse } from "next/server";
import { membershipSweep } from "@/server/membership/sweep";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** Membership upkeep: expiry status, "ends soon" and "expired" emails, email retries. Access is enforced per request regardless. */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return NextResponse.json(await membershipSweep());
}
