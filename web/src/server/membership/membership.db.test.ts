import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

/**
 * Membership against a real Postgres (DATABASE_URL): waitlist, approval with exact durations, extension, expiry on
 * request and by the sweep, suspension, permissions (member/admin/owner), audit, email dedupe, no payment records,
 * deletion, and that the SQL used by the admin lists agrees with the TypeScript rule for every state.
 */
const run = process.env.DATABASE_URL ? describe : describe.skip;
const DAY = 86_400_000;

run("membership (database)", () => {
  let db: typeof import("../db")["db"], schema: typeof import("../db")["schema"];
  let svc: typeof import("./service"), access: typeof import("./access"), queries: typeof import("./queries"), sweep: typeof import("./sweep"), notify: typeof import("./notify");
  let ent: typeof import("../entitlements");
  const P = `mbr_${Date.now().toString(36)}`;
  const OWNER = { id: `${P}_owner`, email: `${P}.owner@example.com`, emailVerified: true, name: "Owner Test" };
  const JOHN = { id: `${P}_john`, email: `${P}.john@example.com`, emailVerified: true, name: "John Smith" };
  const JANE = { id: `${P}_jane`, email: `${P}.jane@example.com`, emailVerified: true, name: "Jane Doe" };
  const ADMIN = { id: `${P}_admin`, email: `${P}.admin@example.com`, emailVerified: true, name: "Ada Admin" };
  const MEMBER = { id: `${P}_member`, email: `${P}.member@example.com`, emailVerified: true, name: "Max Member" };
  const GONE = { id: `${P}_gone`, email: `${P}.gone@example.com`, emailVerified: true, name: "Gina Gone" };
  const all = [OWNER, JOHN, JANE, ADMIN, MEMBER, GONE];
  let previousOwner: { userId: string; email: string } | undefined;

  beforeAll(async () => {
    vi.stubEnv("TREIDIFY_OWNER_USER_ID", "");
    vi.stubEnv("RESEND_API_KEY", "");
    ({ db, schema } = await import("../db"));
    svc = await import("./service"); access = await import("./access"); queries = await import("./queries"); sweep = await import("./sweep"); notify = await import("./notify");
    ent = await import("../entitlements");
    const { eq } = await import("drizzle-orm");
    [previousOwner] = await db.select({ userId: schema.ownerBinding.userId, email: schema.ownerBinding.email }).from(schema.ownerBinding).where(eq(schema.ownerBinding.slot, "owner"));
    await db.insert(schema.user).values(all);
    await db.insert(schema.membership).values(all.map((u) => ({ userId: u.id, status: "pending" })));
    await db.insert(schema.profile).values(all.map((u) => ({ userId: u.id, onboardedAt: new Date(), country: u === JOHN ? "Germany" : null })));
    await db.update(schema.membership).set({ selectedPlan: "premium" }).where(eq(schema.membership.userId, JOHN.id));
    await db.delete(schema.ownerBinding);
    await db.insert(schema.ownerBinding).values({ slot: "owner", userId: OWNER.id, email: OWNER.email });
  });
  afterAll(async () => {
    const { inArray } = await import("drizzle-orm");
    await db.delete(schema.ownerBinding);
    if (previousOwner) await db.insert(schema.ownerBinding).values({ slot: "owner", ...previousOwner }).onConflictDoNothing();
    await db.delete(schema.user).where(inArray(schema.user.id, all.map((u) => u.id)));
    vi.unstubAllEnvs();
  });

  const grantOf = async (userId: string) => {
    const { and, eq, isNull } = await import("drizzle-orm");
    const [g] = await db.select().from(schema.accessGrant).where(and(eq(schema.accessGrant.userId, userId), isNull(schema.accessGrant.endedAt)));
    return g;
  };

  it("a new registration is pending: no access, no plan, whatever plan they selected", async () => {
    const a = await access.loadAccess(JOHN.id);
    expect(a).toMatchObject({ state: "pending", allowed: false, plan: "free", selectedPlan: "premium" });
    expect((await ent.getPlanState(JOHN.id)).plan).toBe("free");
  });

  it("the owner is the bound user ID and always has unlimited Premium", async () => {
    expect(await access.loadAccess(OWNER.id)).toMatchObject({ state: "owner", allowed: true, plan: "premium", endsAt: null });
  });

  it("an ordinary member cannot use any admin operation", async () => {
    expect(await svc.approveAndGrant(MEMBER.id, MEMBER.id, { kind: "complimentary", plan: "premium", duration: { type: "unlimited" } })).toMatchObject({ ok: false });
    expect(await svc.approveAndGrant(MEMBER.id, JOHN.id, { kind: "complimentary", plan: "premium", duration: { type: "days", days: 3 } })).toMatchObject({ ok: false });
    expect(await svc.suspendMember(MEMBER.id, JOHN.id)).toMatchObject({ ok: false });
    expect(await svc.deleteMember(MEMBER.id, JOHN.id, JOHN.email)).toMatchObject({ ok: false });
    expect((await access.loadAccess(JOHN.id)).allowed).toBe(false);
    expect((await access.loadAccess(MEMBER.id)).allowed).toBe(false);
  });

  it("Approve → Premium → 3 days: exact window, full Premium, audit, no subscription or payment", async () => {
    const before = Date.now();
    const r = await svc.approveAndGrant(OWNER.id, JOHN.id, { kind: "complimentary", plan: "premium", duration: { type: "days", days: 3 } });
    expect(r.ok).toBe(true);
    const g = (await grantOf(JOHN.id))!;
    expect(g.endsAt!.getTime() - g.startsAt.getTime()).toBe(3 * DAY);
    expect(g.startsAt.getTime()).toBeGreaterThanOrEqual(before - 1000);
    const a = await access.loadAccess(JOHN.id);
    expect(a).toMatchObject({ state: "active", allowed: true, plan: "premium", source: "complimentary" });
    expect(await ent.hasFeature(JOHN.id, "ai.chat")).toBe(true);
    expect(await ent.hasFeature(JOHN.id, "macro.advanced")).toBe(true);
    const { eq } = await import("drizzle-orm");
    expect(await db.select().from(schema.subscription).where(eq(schema.subscription.userId, JOHN.id))).toHaveLength(0);
    expect(await db.select().from(schema.payment).where(eq(schema.payment.userId, JOHN.id))).toHaveLength(0);
    const [m] = await db.select().from(schema.membership).where(eq(schema.membership.userId, JOHN.id));
    expect(m).toMatchObject({ status: "approved", approvedBy: OWNER.id });
    const audits = await db.select().from(schema.auditLog).where(eq(schema.auditLog.targetId, JOHN.id));
    expect(audits.map((x) => x.action)).toContain("member.approved");
    // No provider configured: the approval email is recorded as not configured, never as sent.
    const mails = await db.select().from(schema.emailNotification).where(eq(schema.emailNotification.userId, JOHN.id));
    expect(mails).toMatchObject([{ kind: "access_approved", status: "not_configured", providerId: null }]);
  });

  it("a second member gets 21 days, independently", async () => {
    expect((await svc.approveAndGrant(OWNER.id, JANE.id, { kind: "trial", plan: "premium", duration: { type: "days", days: 21 } })).ok).toBe(true);
    const g = (await grantOf(JANE.id))!;
    expect(g.endsAt!.getTime() - g.startsAt.getTime()).toBe(21 * DAY);
    expect((await access.loadAccess(JANE.id)).source).toBe("trial");
    const john = (await grantOf(JOHN.id))!;
    expect(john.endsAt!.getTime() - john.startsAt.getTime()).toBe(3 * DAY);
  });

  it("extending adds days to the current end", async () => {
    const g = (await grantOf(JOHN.id))!;
    expect((await svc.extendAccess(OWNER.id, JOHN.id, { type: "days", days: 7 })).ok).toBe(true);
    expect((await grantOf(JOHN.id))!.endsAt!.getTime()).toBe(g.endsAt!.getTime() + 7 * DAY);
  });

  it("expired access is denied on the very next request, then the sweep closes it and emails once", async () => {
    const { eq } = await import("drizzle-orm");
    const g = (await grantOf(JOHN.id))!;
    await db.update(schema.accessGrant).set({ endsAt: new Date(Date.now() - 1000) }).where(eq(schema.accessGrant.id, g.id));
    expect(await access.loadAccess(JOHN.id)).toMatchObject({ state: "expired", allowed: false, plan: "free" });
    expect(await ent.hasFeature(JOHN.id, "ai.chat")).toBe(false);
    await sweep.membershipSweep();
    await sweep.membershipSweep();
    const [closed] = await db.select().from(schema.accessGrant).where(eq(schema.accessGrant.id, g.id));
    expect(closed!.endReason).toBe("expired");
    const mails = await db.select().from(schema.emailNotification).where(eq(schema.emailNotification.userId, JOHN.id));
    expect(mails.filter((x) => x.kind === "access_expired")).toHaveLength(1);
    // Data kept: the account and membership row are still there.
    expect(await db.select().from(schema.user).where(eq(schema.user.id, JOHN.id))).toHaveLength(1);
  });

  it("the same notification is never queued twice", async () => {
    const n = { userId: JANE.id, to: JANE.email, kind: "waitlist_confirmation" as const, dedupeKey: `test:${P}`, data: { name: JANE.name } };
    expect(await notify.notify(n)).toBe("not_configured");
    expect(await notify.notify(n)).toBe("duplicate");
  });

  it("suspension blocks immediately and signs the member out; reinstating restores the running grant", async () => {
    const { eq } = await import("drizzle-orm");
    await db.insert(schema.session).values({ id: `${P}_s`, token: `${P}_t`, userId: JANE.id, expiresAt: new Date(Date.now() + DAY) });
    expect((await svc.suspendMember(OWNER.id, JANE.id, "test")).ok).toBe(true);
    expect(await access.loadAccess(JANE.id)).toMatchObject({ state: "suspended", allowed: false });
    expect(await db.select().from(schema.session).where(eq(schema.session.userId, JANE.id))).toHaveLength(0);
    expect((await svc.approveAndGrant(OWNER.id, JANE.id, { kind: "complimentary", plan: "premium", duration: { type: "days", days: 3 } })).ok).toBe(false);
    expect((await svc.reinstateMember(OWNER.id, JANE.id)).ok).toBe(true);
    expect(await access.loadAccess(JANE.id)).toMatchObject({ state: "active", source: "trial" });
  });

  it("admins are limited; nobody can act on the owner", async () => {
    await svc.approveAndGrant(OWNER.id, ADMIN.id, { kind: "complimentary", plan: "premium", duration: { type: "unlimited" } });
    expect((await svc.setRole(OWNER.id, ADMIN.id, "admin")).ok).toBe(true);
    expect((await svc.setRole(ADMIN.id, MEMBER.id, "admin")).ok).toBe(false);
    expect((await svc.approveAndGrant(ADMIN.id, MEMBER.id, { kind: "trial", plan: "premium", duration: { type: "days", days: 7 } })).ok).toBe(true);
    expect((await svc.suspendMember(ADMIN.id, MEMBER.id)).ok).toBe(false);
    expect((await svc.revokeAccess(ADMIN.id, MEMBER.id)).ok).toBe(false);
    for (const op of [() => svc.suspendMember(OWNER.id, OWNER.id), () => svc.revokeAccess(OWNER.id, OWNER.id), () => svc.endAccess(OWNER.id, OWNER.id), () => svc.deleteMember(OWNER.id, OWNER.id, OWNER.email), () => svc.suspendMember(ADMIN.id, OWNER.id)]) {
      expect((await op()).ok).toBe(false);
    }
    expect((await access.loadAccess(OWNER.id)).state).toBe("owner");
  });

  it("revoke keeps the account; changing the selected plan grants nothing", async () => {
    expect((await svc.revokeAccess(OWNER.id, MEMBER.id, "testing")).ok).toBe(true);
    expect(await access.loadAccess(MEMBER.id)).toMatchObject({ state: "revoked", allowed: false });
    expect((await svc.changePlan(OWNER.id, MEMBER.id, "premium_paid")).ok).toBe(true);
    expect(await access.loadAccess(MEMBER.id)).toMatchObject({ allowed: false, selectedPlan: "premium" });
  });

  it("the admin list's SQL state matches the TypeScript rule for every member", async () => {
    const r = await queries.listMembers({ tab: "all", q: P });
    expect(r.rows.length).toBe(all.length);
    for (const row of r.rows) expect(row.state).toBe((await access.loadAccess(row.id)).state);
    const john = r.rows.find((x) => x.id === JOHN.id)!;
    expect(john).toMatchObject({ country: "Germany", selectedPlan: "premium", state: "expired" });
    expect(r.rows.find((x) => x.id === GONE.id)!.country).toBeNull();
    const pending = await queries.listMembers({ tab: "pending", q: P });
    expect(pending.rows.map((x) => x.id)).toEqual([GONE.id]);
  });

  it("only one open grant can exist per member, even under concurrent grants", async () => {
    const results = await Promise.allSettled([1, 2, 3].map((n) => svc.approveAndGrant(OWNER.id, GONE.id, { kind: "complimentary", plan: "premium", duration: { type: "days", days: n } })));
    expect(results.some((x) => x.status === "fulfilled" && x.value.ok)).toBe(true);
    const { and, eq, isNull } = await import("drizzle-orm");
    expect(await db.select().from(schema.accessGrant).where(and(eq(schema.accessGrant.userId, GONE.id), isNull(schema.accessGrant.endedAt)))).toHaveLength(1);
  });

  it("delete removes the member permanently and keeps only a masked email in the audit", async () => {
    const { and, eq } = await import("drizzle-orm");
    expect((await svc.deleteMember(OWNER.id, GONE.id, "wrong@example.com")).ok).toBe(false);
    expect((await svc.deleteMember(OWNER.id, GONE.id, GONE.email)).ok).toBe(true);
    expect(await db.select().from(schema.user).where(eq(schema.user.id, GONE.id))).toHaveLength(0);
    const [a] = await db.select().from(schema.auditLog).where(and(eq(schema.auditLog.targetId, GONE.id), eq(schema.auditLog.action, "member.deleted")));
    expect(JSON.stringify(a!.meta)).not.toContain(GONE.email);
  });
});
