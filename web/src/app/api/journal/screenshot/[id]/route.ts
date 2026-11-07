import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db, schema } from "@/server/db";
import { apiMember } from "@/server/session";

export const dynamic = "force-dynamic";

/** Serves a journal screenshot to its owner only. */
export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  // Signed in AND a member with current access (pending, expired and suspended accounts get 403).
  const m = await apiMember();
  if (!m.ok) return NextResponse.json({ error: m.error }, { status: m.status });
  const s = m.session;
  const { id } = await ctx.params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) return NextResponse.json({ error: "Not found." }, { status: 404 });
  const [row] = await db.select({ mime: schema.journalScreenshot.mime, data: schema.journalScreenshot.data }).from(schema.journalScreenshot)
    .where(and(eq(schema.journalScreenshot.id, id), eq(schema.journalScreenshot.userId, s.user.id))).limit(1);
  if (!row) return NextResponse.json({ error: "Not found." }, { status: 404 });
  return new NextResponse(new Uint8Array(row.data), { headers: { "Content-Type": row.mime, "Cache-Control": "private, max-age=86400", "X-Content-Type-Options": "nosniff" } });
}
