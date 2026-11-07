import { after, NextResponse } from "next/server";
import { sql } from "drizzle-orm";
import { db, dbConfigured } from "@/server/db";
import { emailConfigured } from "@/server/email";
import { providerStatus } from "@/server/providers";
import { enabledProviders } from "@/server/auth";
import { boundOwnerId } from "@/server/owner-binding";
import { metaApiToken } from "@/server/sync/metaapi";
import { backgroundSync, metaApiProbe, regionalProbe, syncDiagnostics } from "@/server/sync/service";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

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
  if (ok) after(async () => { await backgroundSync().catch(() => {}); await regionalProbe().catch(() => {}); });
  return NextResponse.json(
    {
      ok,
      database,
      email: emailConfigured(),
      providers: providerStatus(),
      signIn: { email: true, ...enabledProviders },
      // Variable NAMES only (never values): which name the MetaApi token was found under, and whether the owner is set.
      // probe: a read-only MetaApi call (cached 5 min) with MetaApi's status/reason and non-secret token facts.
      accountSync: { tokenVar: metaApiToken()?.name ?? null, ownerBound: Boolean(await boundOwnerId().catch(() => null)), probe: await metaApiProbe().catch(() => null), diagnostics: await syncDiagnostics().catch(() => null) },
      cron: Boolean(process.env.CRON_SECRET),
      encryption: Boolean(process.env.DATA_ENCRYPTION_KEY),
      commit: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? null,
      environment: process.env.VERCEL_ENV ?? process.env.NODE_ENV,
    },
    { status: ok ? 200 : 503, headers: { "Cache-Control": "no-store" } },
  );
}
