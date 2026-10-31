import { NextResponse } from "next/server";
import { billingProvider, NotConfiguredError } from "@/server/integrations";
import { reportError } from "@/lib/monitoring";

/**
 * Billing webhook endpoint (Stripe). Answers 503 until billing is connected, so the provider retries later
 * instead of events being silently dropped. Applying events to entitlements is wired with the Stripe adapter.
 */
export async function POST(req: Request) {
  const billing = billingProvider();
  if (!billing.info().configured) return NextResponse.json({ error: "Billing is not connected." }, { status: 503 });
  try {
    const event = await billing.parseWebhook(await req.text(), req.headers.get("stripe-signature"));
    return NextResponse.json({ received: event.type });
  } catch (e) {
    if (e instanceof NotConfiguredError) return NextResponse.json({ error: e.message }, { status: 503 });
    reportError(e, { where: "webhook:billing" });
    return NextResponse.json({ error: "Invalid webhook." }, { status: 400 });
  }
}
