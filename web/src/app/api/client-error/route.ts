import { NextResponse } from "next/server";
import { z } from "zod";
import { reportError } from "@/lib/monitoring";

const body = z.object({ message: z.string().max(500), digest: z.string().max(64).optional(), path: z.string().max(300).optional(), where: z.string().max(40) });

/** Receives errors caught by client error boundaries. Small, schema-checked payloads only. */
export async function POST(req: Request) {
  const text = await req.text();
  if (text.length > 4000) return NextResponse.json({ ok: false }, { status: 413 });
  const p = body.safeParse((() => { try { return JSON.parse(text); } catch { return null; } })());
  if (!p.success) return NextResponse.json({ ok: false }, { status: 400 });
  reportError(new Error(p.data.message), { where: `client:${p.data.where}`, digest: p.data.digest, path: p.data.path });
  return NextResponse.json({ ok: true });
}
