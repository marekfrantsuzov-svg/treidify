import { createHmac } from "node:crypto";
import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("../db", () => ({ db: {}, schema: { entitlement: {}, subscription: {}, payment: {} } }));
vi.mock("../audit", () => ({ audit: async () => {} }));

const { verifySignature } = await import("./stripe");
const { planState, planHas } = await import("../entitlements");
const { plans, paidPlans, annualPerMonth, TRIAL_DAYS } = await import("@/config/plans");

const row = (o: Record<string, unknown>) => ({ userId: "u", plan: "free", source: "none", trialStartedAt: null, trialEndsAt: null, premiumUntil: null, updatedAt: new Date(), ...o }) as never;
const now = new Date("2026-11-07T12:00:00Z");
const later = new Date("2026-11-10T12:00:00Z");
const earlier = new Date("2026-11-01T12:00:00Z");

describe("plans", () => {
  it("has the approved prices, a 3-day trial and 32% annual discount", () => {
    const [e, p] = paidPlans;
    expect([e!.id, e!.monthly, e!.annual, e!.accounts]).toEqual(["essential", 24, 195.84, 1]);
    expect([p!.id, p!.monthly, p!.annual, p!.accounts]).toEqual(["premium", 49, 399.84, 2]);
    for (const x of paidPlans) expect(Math.round((1 - x.annual / (x.monthly * 12)) * 100)).toBe(32);
    expect(annualPerMonth(e!)).toBe(16.32);
    expect(TRIAL_DAYS).toBe(3);
  });
  it("keeps AI, news and macro out of Essential", () => {
    for (const f of ["coach", "ai.chat", "charts.ai", "news.global", "macro.advanced"] as const) {
      expect(planHas("essential", f)).toBe(false);
      expect(planHas("premium", f)).toBe(true);
      expect(planHas("free", f)).toBe(false);
    }
    expect(planHas("essential", "account.health")).toBe(true);
    expect(plans.find((x) => x.id === "free")!.features).not.toContain("account.analytics");
  });
});

describe("planState", () => {
  it("is free without a row and never premium by default", () => {
    expect(planState(undefined, now)).toMatchObject({ plan: "free", source: "none", trialAvailable: true });
    expect(planState(row({ plan: "premium", source: "none" }), now).plan).toBe("free");
  });
  it("follows a Stripe subscription until its paid-through date", () => {
    expect(planState(row({ plan: "essential", source: "stripe", premiumUntil: later }), now)).toMatchObject({ plan: "essential", source: "stripe", trialEndsAt: null });
    expect(planState(row({ plan: "premium", source: "stripe", premiumUntil: earlier }), now).plan).toBe("free");
  });
  it("reports a card trial and marks the trial as used", () => {
    const s = planState(row({ plan: "premium", source: "stripe", premiumUntil: later, trialEndsAt: later, trialStartedAt: now }), now);
    expect(s).toMatchObject({ plan: "premium", trialAvailable: false });
    expect(s.trialRemainingMs).toBe(later.getTime() - now.getTime());
  });
  it("honours a legacy no-card trial only until it ends", () => {
    expect(planState(row({ plan: "premium", source: "trial", trialStartedAt: earlier, trialEndsAt: later }), now).plan).toBe("premium");
    expect(planState(row({ plan: "premium", source: "trial", trialStartedAt: earlier, trialEndsAt: earlier }), now).plan).toBe("free");
  });
  it("ignores an unknown plan name", () => {
    expect(planState(row({ plan: "whale", source: "grant", premiumUntil: later }), now).plan).toBe("free");
  });
});

describe("Stripe webhook signature", () => {
  const secret = "whsec_test";
  const payload = JSON.stringify({ type: "customer.subscription.updated" });
  const sign = (t: number, body = payload) => `t=${t},v1=${createHmac("sha256", secret).update(`${t}.${body}`).digest("hex")}`;
  it("accepts a valid, recent signature", () => { expect(verifySignature(payload, sign(1000), secret, 1100)).toBe(true); });
  it("rejects tampering, wrong secrets, old timestamps and missing headers", () => {
    expect(verifySignature(payload + " ", sign(1000), secret, 1100)).toBe(false);
    expect(verifySignature(payload, sign(1000), "whsec_other", 1100)).toBe(false);
    expect(verifySignature(payload, sign(1000), secret, 1000 + 301)).toBe(false);
    expect(verifySignature(payload, null, secret, 1000)).toBe(false);
    expect(verifySignature(payload, "t=1000,v1=zz", secret, 1000)).toBe(false);
  });
});
