import { NextResponse } from "next/server";
import { z } from "zod";
import { rateLimit } from "@/lib/rate-limit";
import { createCheckout, StripeError } from "@/server/billing/stripe";
import { getPlanState } from "@/server/entitlements";
import { getSession } from "@/server/session";

const Body = z.object({ plan: z.enum(["essential", "premium"]), interval: z.enum(["monthly", "annual"]) });

/** Starts Stripe Checkout for the signed-in user. The trial is included only if this account never had one. */
export async function POST(req: Request) {
  const s = await getSession();
  if (!s) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  const b = Body.safeParse(await req.json().catch(() => null));
  if (!b.success) return NextResponse.json({ error: "Choose a plan and billing period." }, { status: 400 });
  if (!rateLimit(`checkout:${s.user.id}`, 10, 3600_000).ok) return NextResponse.json({ error: "Too many attempts. Try again later." }, { status: 429 });
  const plan = await getPlanState(s.user.id);
  if (plan.source === "stripe") return NextResponse.json({ error: "You already have a subscription. Change it from Manage billing." }, { status: 409 });
  try {
    const url = await createCheckout({ id: s.user.id, email: s.user.email, name: s.user.name }, b.data.plan, b.data.interval, plan.trialAvailable, new URL(req.url).origin);
    return NextResponse.json({ url });
  } catch (e) {
    const status = e instanceof StripeError ? e.status : 500;
    return NextResponse.json({ error: status === 503 ? "Checkout is not available yet. Please try again later." : "Checkout could not start. Please try again." }, { status: status >= 500 ? 503 : status });
  }
}
