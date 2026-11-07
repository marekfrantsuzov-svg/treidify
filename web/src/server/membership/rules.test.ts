import { describe, expect, it } from "vitest";
import { accessFor, canAct, extendEnd, resolveEnd } from "./rules";

const now = new Date("2026-11-07T12:00:00Z");
const day = 86_400_000;
const grant = (o: Partial<{ kind: string; plan: string; startsAt: Date; endsAt: Date | null; endedAt: Date | null }> = {}) =>
  ({ kind: "complimentary", plan: "premium", startsAt: new Date(now.getTime() - day), endsAt: new Date(now.getTime() + day), endedAt: null, ...o });

describe("accessFor", () => {
  it("owner always has unlimited Premium, even if their row says suspended", () => {
    expect(accessFor({ owner: true, status: "suspended", grant: null, entitlement: null, now })).toMatchObject({ state: "owner", allowed: true, plan: "premium", endsAt: null });
  });
  it("a new registration is pending and has no access, whatever plan they selected", () => {
    expect(accessFor({ owner: false, status: "pending", grant: null, entitlement: null, now })).toMatchObject({ state: "pending", allowed: false, plan: "free" });
    expect(accessFor({ owner: false, status: null, grant: null, entitlement: null, now }).state).toBe("pending");
  });
  it("a pending user with a grant row still has no access until approved", () => {
    expect(accessFor({ owner: false, status: "pending", grant: grant(), entitlement: null, now }).allowed).toBe(false);
  });
  it("approved + active complimentary grant = Premium until the exact end", () => {
    const a = accessFor({ owner: false, status: "approved", grant: grant(), entitlement: null, now });
    expect(a).toMatchObject({ state: "active", allowed: true, plan: "premium", source: "complimentary" });
    expect(a.endsAt?.getTime()).toBe(now.getTime() + day);
  });
  it("expires at the end timestamp without any job running", () => {
    const g = grant({ endsAt: new Date(now.getTime() + 1000) });
    expect(accessFor({ owner: false, status: "approved", grant: g, entitlement: null, now }).allowed).toBe(true);
    expect(accessFor({ owner: false, status: "approved", grant: g, entitlement: null, now: new Date(now.getTime() + 1000) })).toMatchObject({ state: "expired", allowed: false, plan: "free" });
  });
  it("unlimited grants never expire; ended grants never count", () => {
    expect(accessFor({ owner: false, status: "approved", grant: grant({ endsAt: null }), entitlement: null, now: new Date("2099-01-01") }).allowed).toBe(true);
    expect(accessFor({ owner: false, status: "approved", grant: grant({ endedAt: now }), entitlement: null, now }).state).toBe("expired");
  });
  it("suspended and revoked block everything, including a running grant", () => {
    expect(accessFor({ owner: false, status: "suspended", grant: grant(), entitlement: null, now })).toMatchObject({ state: "suspended", allowed: false });
    expect(accessFor({ owner: false, status: "revoked", grant: grant(), entitlement: null, now })).toMatchObject({ state: "revoked", allowed: false });
  });
  it("trial grants report as trial; essential grants give essential", () => {
    expect(accessFor({ owner: false, status: "approved", grant: grant({ kind: "trial" }), entitlement: null, now }).source).toBe("trial");
    expect(accessFor({ owner: false, status: "approved", grant: grant({ plan: "essential" }), entitlement: null, now }).plan).toBe("essential");
  });
  it("a paid subscription counts on its own; selecting Premium never does", () => {
    const e = { plan: "essential", source: "stripe", trialEndsAt: null, premiumUntil: new Date(now.getTime() + 10 * day) };
    expect(accessFor({ owner: false, status: "pending", grant: null, entitlement: e, now })).toMatchObject({ allowed: true, plan: "essential", source: "subscription" });
    expect(accessFor({ owner: false, status: "approved", grant: grant(), entitlement: e, now }).plan).toBe("premium");
  });
});

describe("durations", () => {
  it("N days is exactly N × 24 h from the start", () => {
    for (const d of [3, 7, 14, 21, 30, 90]) {
      const r = resolveEnd({ type: "days", days: d }, now);
      expect(r.ok && r.endsAt?.getTime()).toBe(now.getTime() + d * day);
    }
  });
  it("rejects bad input", () => {
    expect(resolveEnd({ type: "days", days: 0 }, now).ok).toBe(false);
    expect(resolveEnd({ type: "days", days: 2.5 }, now).ok).toBe(false);
    expect(resolveEnd({ type: "until", until: "2020-01-01" }, now).ok).toBe(false);
    expect(resolveEnd({ type: "until", until: "nonsense" }, now).ok).toBe(false);
  });
  it("custom date and unlimited", () => {
    const r = resolveEnd({ type: "until", until: "2026-12-24T18:00:00Z" }, now);
    expect(r.ok && r.endsAt?.toISOString()).toBe("2026-12-24T18:00:00.000Z");
    expect(resolveEnd({ type: "unlimited" }, now)).toEqual({ ok: true, endsAt: null });
  });
  it("extension adds to the current end, or to now if it lapsed", () => {
    const end = new Date(now.getTime() + 2 * day);
    const r = extendEnd(end, { type: "days", days: 7 }, now);
    expect(r.ok && r.endsAt?.getTime()).toBe(end.getTime() + 7 * day);
    const lapsed = extendEnd(new Date(now.getTime() - day), { type: "days", days: 3 }, now);
    expect(lapsed.ok && lapsed.endsAt?.getTime()).toBe(now.getTime() + 3 * day);
  });
});

describe("canAct", () => {
  const owner = { id: "o", owner: true, role: null };
  const admin = { id: "a", owner: false, role: "admin" as const };
  const member = { id: "m", owner: false, role: "member" as const };
  it("ordinary members can do nothing", () => {
    expect(canAct(member, "view").ok).toBe(false);
    expect(canAct(member, "grant", { id: "x", owner: false, role: "member" }).ok).toBe(false);
  });
  it("admins are limited; only the owner deletes, suspends or changes roles", () => {
    expect(canAct(admin, "grant", { id: "x", owner: false, role: "member" }).ok).toBe(true);
    for (const a of ["delete", "suspend", "role", "revoke"] as const) expect(canAct(admin, a, { id: "x", owner: false, role: "member" }).ok).toBe(false);
    expect(canAct(admin, "grant", { id: "y", owner: false, role: "admin" }).ok).toBe(false);
    expect(canAct(owner, "delete", { id: "x", owner: false, role: "admin" }).ok).toBe(true);
  });
  it("nobody can suspend, revoke, delete or expire the owner", () => {
    for (const a of ["suspend", "revoke", "delete", "end", "grant", "role"] as const) expect(canAct(owner, a, { id: "o", owner: true, role: null }).ok).toBe(false);
  });
});
