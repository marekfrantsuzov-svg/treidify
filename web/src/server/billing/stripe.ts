import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { eq, sql } from "drizzle-orm";
import { TRIAL_DAYS, type BillingInterval, type PaidPlanId } from "@/config/plans";
import { audit } from "../audit";
import { db, schema } from "../db";

/**
 * Stripe Billing over its REST API (no SDK): Checkout for new subscriptions with a 3-day trial that requires a card,
 * the Customer Portal for changes and cancellation, and signed webhooks that are the only thing granting paid access.
 * Test mode and live mode differ only by keys. Configure in Vercel:
 *   STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET,
 *   STRIPE_PRICE_ESSENTIAL_MONTHLY, STRIPE_PRICE_ESSENTIAL_ANNUAL, STRIPE_PRICE_PREMIUM_MONTHLY, STRIPE_PRICE_PREMIUM_ANNUAL
 */
const API = "https://api.stripe.com/v1";

const PRICE_ENV: Record<PaidPlanId, Record<BillingInterval, string>> = {
  essential: { monthly: "STRIPE_PRICE_ESSENTIAL_MONTHLY", annual: "STRIPE_PRICE_ESSENTIAL_ANNUAL" },
  premium: { monthly: "STRIPE_PRICE_PREMIUM_MONTHLY", annual: "STRIPE_PRICE_PREMIUM_ANNUAL" },
};

export function stripeStatus() {
  const needs = ["STRIPE_SECRET_KEY", "STRIPE_WEBHOOK_SECRET", ...Object.values(PRICE_ENV).flatMap((x) => Object.values(x))].filter((k) => !process.env[k]);
  const key = process.env.STRIPE_SECRET_KEY ?? "";
  return { configured: needs.length === 0, needs, mode: key.startsWith("sk_live_") ? "live" as const : key ? "test" as const : null };
}

export class StripeError extends Error { constructor(message: string, readonly status: number) { super(message); } }

/** Form-encodes nested params the way Stripe expects (a[b][0]=c). */
function encode(obj: Record<string, unknown>, prefix = "", out = new URLSearchParams()) {
  for (const [k, v] of Object.entries(obj)) {
    if (v === undefined || v === null) continue;
    const key = prefix ? `${prefix}[${k}]` : k;
    if (Array.isArray(v)) v.forEach((x, i) => (typeof x === "object" ? encode(x as Record<string, unknown>, `${key}[${i}]`, out) : out.append(`${key}[${i}]`, String(x))));
    else if (typeof v === "object") encode(v as Record<string, unknown>, key, out);
    else out.append(key, String(v));
  }
  return out;
}

async function call<T>(method: "GET" | "POST", path: string, params?: Record<string, unknown>, idempotencyKey?: string): Promise<T> {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new StripeError("Billing is not connected.", 503);
  const body = params ? encode(params).toString() : undefined;
  const r = await fetch(`${API}${path}${method === "GET" && body ? `?${body}` : ""}`, {
    method,
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/x-www-form-urlencoded", "Stripe-Version": "2025-09-30.clover", ...(idempotencyKey ? { "Idempotency-Key": idempotencyKey } : {}) },
    body: method === "POST" ? body : undefined,
    signal: AbortSignal.timeout(15_000),
  });
  const json = (await r.json().catch(() => ({}))) as { error?: { message?: string } } & T;
  if (!r.ok) throw new StripeError(json.error?.message ?? `Stripe answered ${r.status}`, r.status);
  return json;
}

const priceFor = (plan: PaidPlanId, interval: BillingInterval) => process.env[PRICE_ENV[plan][interval]] ?? null;
const planForPrice = (price: string | undefined): { plan: PaidPlanId; interval: BillingInterval } | null => {
  for (const plan of ["essential", "premium"] as const) for (const interval of ["monthly", "annual"] as const) if (price && process.env[PRICE_ENV[plan][interval]] === price) return { plan, interval };
  return null;
};

async function customerFor(user: { id: string; email: string; name: string }) {
  const [sub] = await db.select({ c: schema.subscription.stripeCustomerId }).from(schema.subscription).where(eq(schema.subscription.userId, user.id)).limit(1);
  if (sub?.c) return sub.c;
  const c = await call<{ id: string }>("POST", "/customers", { email: user.email, name: user.name, metadata: { treidify_user_id: user.id } }, `customer-${user.id}`);
  await db.insert(schema.subscription).values({ userId: user.id, stripeCustomerId: c.id, status: "incomplete" });
  return c.id;
}

/**
 * A Checkout Session for a new subscription. The card is always collected; the 3-day trial is added only when this
 * person has never had one (entitlement.trialStartedAt, set by the webhook), so a trial can't be repeated.
 */
export async function createCheckout(user: { id: string; email: string; name: string }, plan: PaidPlanId, interval: BillingInterval, trialAvailable: boolean, origin: string) {
  const price = priceFor(plan, interval);
  if (!price) throw new StripeError("This plan is not available for checkout yet.", 503);
  const customer = await customerFor(user);
  const session = await call<{ url: string }>("POST", "/checkout/sessions", {
    mode: "subscription",
    customer,
    client_reference_id: user.id,
    line_items: [{ price, quantity: 1 }],
    payment_method_collection: "always",
    subscription_data: { ...(trialAvailable ? { trial_period_days: TRIAL_DAYS, trial_settings: { end_behavior: { missing_payment_method: "cancel" } } } : {}), metadata: { treidify_user_id: user.id, plan } },
    allow_promotion_codes: "true",
    billing_address_collection: "auto",
    success_url: `${origin}/app/settings/plan?checkout=success`,
    cancel_url: `${origin}/app/settings/plan?checkout=cancelled`,
  });
  return session.url;
}

export async function createPortal(userId: string, origin: string) {
  const [sub] = await db.select({ c: schema.subscription.stripeCustomerId }).from(schema.subscription).where(eq(schema.subscription.userId, userId)).limit(1);
  if (!sub?.c) throw new StripeError("There is no subscription to manage yet.", 404);
  const s = await call<{ url: string }>("POST", "/billing_portal/sessions", { customer: sub.c, return_url: `${origin}/app/settings/plan` });
  return s.url;
}

/** Verifies a Stripe-Signature header (v1 HMAC-SHA256 of "t.payload", 5-minute tolerance). */
export function verifySignature(payload: string, header: string | null, secret: string, nowSec = Math.floor(Date.now() / 1000), tolerance = 300) {
  if (!header) return false;
  const parts = Object.fromEntries(header.split(",").map((p) => p.split("=") as [string, string]).filter((p) => p.length === 2).map(([k, v]) => [k, v]));
  const t = Number(parts.t);
  const sigs = header.split(",").filter((p) => p.startsWith("v1=")).map((p) => p.slice(3));
  if (!t || !sigs.length || Math.abs(nowSec - t) > tolerance) return false;
  const expected = createHmac("sha256", secret).update(`${t}.${payload}`).digest();
  return sigs.some((s) => { const b = Buffer.from(s, "hex"); return b.length === expected.length && timingSafeEqual(b, expected); });
}

interface StripeSubscription {
  id: string; customer: string; status: string; cancel_at_period_end: boolean; trial_end: number | null;
  metadata?: { treidify_user_id?: string; plan?: string };
  items: { data: { price: { id: string }; current_period_end?: number }[] };
  current_period_end?: number;
}

const ACTIVE = new Set(["trialing", "active", "past_due"]);

/**
 * Applies a subscription's state to the entitlement row. Paid access lasts while Stripe reports trialing, active or
 * past_due (Stripe's own retry window), up to the paid-through date; anything else returns the person to no plan.
 */
export async function applySubscription(sub: StripeSubscription) {
  const [row] = await db.select().from(schema.subscription).where(eq(schema.subscription.stripeCustomerId, sub.customer)).limit(1);
  const userId = sub.metadata?.treidify_user_id ?? row?.userId;
  if (!userId) return { ok: false as const, reason: "unknown customer" };
  const price = planForPrice(sub.items.data[0]?.price.id);
  const plan = price?.plan ?? (sub.metadata?.plan === "essential" || sub.metadata?.plan === "premium" ? sub.metadata.plan : null);
  const periodEnd = sub.items.data[0]?.current_period_end ?? sub.current_period_end ?? null;
  const values = {
    userId, stripeCustomerId: sub.customer, stripeSubscriptionId: sub.id, status: sub.status, tier: plan, interval: price?.interval ?? null,
    currentPeriodEnd: periodEnd ? new Date(periodEnd * 1000) : null, trialEnd: sub.trial_end ? new Date(sub.trial_end * 1000) : null, cancelAtPeriodEnd: sub.cancel_at_period_end,
  };
  const existing = row && (row.stripeSubscriptionId === sub.id || !row.stripeSubscriptionId) ? row : null;
  if (existing) await db.update(schema.subscription).set(values).where(eq(schema.subscription.id, existing.id));
  else await db.insert(schema.subscription).values(values).onConflictDoUpdate({ target: schema.subscription.stripeSubscriptionId, set: values });

  const active = ACTIVE.has(sub.status) && !!plan && !!periodEnd;
  await db.insert(schema.entitlement).values({ userId }).onConflictDoNothing();
  const trial = sub.status === "trialing" && sub.trial_end ? new Date(sub.trial_end * 1000) : null;
  await db.update(schema.entitlement).set(active
    // A trial, once started, is never offered again: keep the first start time.
    ? { plan: plan!, source: "stripe", premiumUntil: new Date(periodEnd! * 1000), trialEndsAt: trial, ...(trial ? { trialStartedAt: sql`coalesce(${schema.entitlement.trialStartedAt}, now())` } : {}) }
    : { plan: "free", source: "none", premiumUntil: null, trialEndsAt: null })
    .where(eq(schema.entitlement.userId, userId));
  await audit("billing.subscription", { actorId: userId, targetType: "user", targetId: userId, meta: { status: sub.status, plan, interval: price?.interval ?? null } });
  return { ok: true as const, userId, active };
}

/** Webhook dispatcher. Returns what it did, for the response body. */
export async function handleEvent(event: { type: string; data: { object: Record<string, unknown> } }) {
  const o = event.data.object;
  switch (event.type) {
    case "customer.subscription.created":
    case "customer.subscription.updated":
    case "customer.subscription.deleted":
    case "customer.subscription.paused":
    case "customer.subscription.resumed":
      return applySubscription(o as unknown as StripeSubscription);
    case "checkout.session.completed": {
      const id = o.subscription as string | undefined;
      if (!id) return { ok: true as const, skipped: "no subscription" };
      return applySubscription(await call<StripeSubscription>("GET", `/subscriptions/${id}`));
    }
    case "invoice.paid":
    case "invoice.payment_failed": {
      const inv = o as { id: string; customer: string; amount_paid?: number; amount_due?: number; currency: string; status: string; hosted_invoice_url?: string; subscription?: string; parent?: { subscription_details?: { subscription?: string } } };
      const [row] = await db.select({ userId: schema.subscription.userId }).from(schema.subscription).where(eq(schema.subscription.stripeCustomerId, inv.customer)).limit(1);
      if (row) {
        const amount = ((event.type === "invoice.paid" ? inv.amount_paid : inv.amount_due) ?? 0) / 100;
        await db.insert(schema.payment).values({ userId: row.userId, stripeInvoiceId: inv.id, amount, currency: inv.currency, status: event.type === "invoice.paid" ? "paid" : "failed", hostedInvoiceUrl: inv.hosted_invoice_url ?? null })
          .onConflictDoUpdate({ target: schema.payment.stripeInvoiceId, set: { status: event.type === "invoice.paid" ? "paid" : "failed", amount } });
      }
      const subId = inv.subscription ?? inv.parent?.subscription_details?.subscription;
      if (subId) return applySubscription(await call<StripeSubscription>("GET", `/subscriptions/${subId}`));
      return { ok: true as const };
    }
    default:
      return { ok: true as const, skipped: event.type };
  }
}
