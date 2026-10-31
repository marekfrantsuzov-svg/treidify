import { NextResponse } from "next/server";
import { contactSchema } from "@/lib/contact";
import { clientKey, rateLimit } from "@/lib/rate-limit";
import { deliverContact } from "@/server/contact";

export async function POST(req: Request) {
  const rl = rateLimit(`contact:${clientKey(req)}`, 5, 60 * 60 * 1000);
  if (!rl.ok) return NextResponse.json({ error: "Too many messages. Please try again later." }, { status: 429 });
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }
  const parsed = contactSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Please check the form.", fields: parsed.error.flatten().fieldErrors }, { status: 422 });
  }
  if (parsed.data.website) return NextResponse.json({ ok: true }); // honeypot: silently accept
  const result = await deliverContact(parsed.data);
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 503 });
  return NextResponse.json({ ok: true, reference: result.reference });
}
