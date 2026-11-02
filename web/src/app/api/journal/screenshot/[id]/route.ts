import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db, schema } from "@/server/db";
import { getSession } from "@/server/session";

export const dynamic = "force-dynamic";

/** Serves a journal screenshot to its owner only. */
export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const s = await getSession();
  if (!s) return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  const { id } = await ctx.params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) return NextResponse.json({ error: "Not found." }, { status: 404 });
  const [row] = await db.select({ mime: schema.journalScreenshot.mime, data: schema.journalScreenshot.data }).from(schema.journalScreenshot)
    .where(and(eq(schema.journalScreenshot.id, id), eq(schema.journalScreenshot.userId, s.user.id))).limit(1);
  if (!row) return NextResponse.json({ error: "Not found." }, { status: 404 });
  return new NextResponse(new Uint8Array(row.data), { headers: { "Content-Type": row.mime, "Cache-Control": "private, max-age=86400", "X-Content-Type-Options": "nosniff" } });
}
