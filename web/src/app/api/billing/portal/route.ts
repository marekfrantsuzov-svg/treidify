import { NextResponse } from "next/server";
import { createPortal, StripeError } from "@/server/billing/stripe";
import { getSession } from "@/server/session";

/** Opens the Stripe Customer Portal (change plan, card, invoices, cancel). */
export async function POST(req: Request) {
  const s = await getSession();
  if (!s) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  try {
    return NextResponse.json({ url: await createPortal(s.user.id, new URL(req.url).origin) });
  } catch (e) {
    const st = e instanceof StripeError ? e.status : 500;
    return NextResponse.json({ error: st === 404 ? "There is no subscription to manage yet." : "Billing is not available right now." }, { status: st === 404 ? 404 : 503 });
  }
}
