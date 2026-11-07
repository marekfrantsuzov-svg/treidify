import { NextResponse } from "next/server";
import { reportError } from "@/lib/monitoring";
import { handleEvent, stripeStatus, verifySignature } from "@/server/billing/stripe";

export const dynamic = "force-dynamic";

/**
 * Stripe webhook. The signature is verified against STRIPE_WEBHOOK_SECRET before anything is read; only verified
 * events change subscriptions and entitlements. Answers 503 until billing is configured so Stripe retries later.
 * Subscribe in Stripe to: checkout.session.completed, customer.subscription.created/updated/deleted/paused/resumed,
 * invoice.paid, invoice.payment_failed.
 */
export async function POST(req: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret || !stripeStatus().configured) return NextResponse.json({ error: "Billing is not connected." }, { status: 503 });
  const payload = await req.text();
  if (!verifySignature(payload, req.headers.get("stripe-signature"), secret)) return NextResponse.json({ error: "Invalid signature." }, { status: 400 });
  try {
    const event = JSON.parse(payload) as { type: string; data: { object: Record<string, unknown> } };
    const r = await handleEvent(event);
    return NextResponse.json({ received: event.type, ...r });
  } catch (e) {
    reportError(e, { where: "webhook:billing" });
    return NextResponse.json({ error: "Could not apply the event." }, { status: 500 });
  }
}
