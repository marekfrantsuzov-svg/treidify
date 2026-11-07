import { NextResponse } from "next/server";
import { z } from "zod";
import { isStaff, memberAccess } from "@/server/membership/access";
import { screenshotFor } from "@/server/membership/queries";
import { getSession } from "@/server/session";

/** A feedback screenshot, for the owner and admins only. */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const s = await getSession();
  if (!s) return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  const a = await memberAccess(s.user.id);
  if (!a.allowed || !isStaff(a)) return NextResponse.json({ error: "Not allowed." }, { status: 403 });
  const { id } = await params;
  if (!z.string().uuid().safeParse(id).success) return NextResponse.json({ error: "Not found." }, { status: 404 });
  const r = await screenshotFor(id);
  if (!r) return NextResponse.json({ error: "Not found." }, { status: 404 });
  return new NextResponse(new Uint8Array(r.data!), { headers: { "Content-Type": r.mime ?? "image/webp", "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" } });
}
