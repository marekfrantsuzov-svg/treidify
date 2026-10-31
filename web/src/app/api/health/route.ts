import { NextResponse } from "next/server";
import { sql } from "drizzle-orm";
import { db, dbConfigured } from "@/server/db";
import { emailConfigured } from "@/server/email";
import { providerStatus } from "@/server/providers";

export const dynamic = "force-dynamic";

/**
 * Deployment health check for uptime monitors and post-deploy verification.
 * Reports only booleans and the commit, never a value of any variable.
 */
export async function GET() {
  let database: "up" | "down" | "not configured" = "not configured";
  if (dbConfigured) {
    try { await db.execute(sql`select 1`); database = "up"; } catch { database = "down"; }
  }
  const ok = database === "up";
  return NextResponse.json(
    {
      ok,
      database,
      email: emailConfigured(),
      providers: providerStatus(),
      commit: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? null,
      environment: process.env.VERCEL_ENV ?? process.env.NODE_ENV,
    },
    { status: ok ? 200 : 503, headers: { "Cache-Control": "no-store" } },
  );
}
