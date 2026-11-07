/**
 * Membership rules, kept pure so they are unit tested (rules.test.ts). Server code feeds them rows read from the
 * database; nothing here trusts the browser.
 *
 * Separate concepts, never mixed:
 * - approval status (membership.status): pending | approved | suspended | revoked
 * - selected plan (membership.selectedPlan): what the person said they want; grants nothing
 * - billing (entitlement/subscription rows written only by the payment webhook)
 * - manual access grants (access_grant): free trial or complimentary access with an exact UTC window
 * - feature entitlement: the result of accessFor(), computed on every protected request
 */
export type MembershipStatus = "pending" | "approved" | "suspended" | "revoked";
export type MemberRole = "member" | "admin";
export type GrantKind = "trial" | "complimentary";
export type GrantPlan = "essential" | "premium";
export type AccessState = "owner" | "active" | "pending" | "expired" | "suspended" | "revoked";
export type AccessSource = "owner" | "trial" | "complimentary" | "subscription" | "legacy_trial" | "none";

export interface GrantLike { kind: string; plan: string; startsAt: Date; endsAt: Date | null; endedAt: Date | null }
export interface EntitlementLike { plan: string; source: string; trialEndsAt: Date | null; premiumUntil: Date | null }

export interface AccessInput {
  owner: boolean;
  status: MembershipStatus | null;
  /** The newest grant that has not been ended by an admin (endedAt null), if any. */
  grant: GrantLike | null;
  entitlement: EntitlementLike | null;
  now?: Date;
}

export interface Access {
  state: AccessState;
  /** May the person use the application at all. */
  allowed: boolean;
  plan: "free" | GrantPlan;
  source: AccessSource;
  /** When the current access ends (UTC); null for unlimited or no access. */
  endsAt: Date | null;
}

const RANK = { free: 0, essential: 1, premium: 2 } as const;

export function grantActive(g: GrantLike | null | undefined, now = new Date()): g is GrantLike {
  return !!g && !g.endedAt && g.startsAt <= now && (g.endsAt === null || g.endsAt > now) && (g.plan === "essential" || g.plan === "premium");
}

export function subscriptionActive(e: EntitlementLike | null | undefined, now = new Date()) {
  return !!e && e.source === "stripe" && !!e.premiumUntil && e.premiumUntil > now && (e.plan === "essential" || e.plan === "premium");
}

export function accessFor(i: AccessInput): Access {
  const now = i.now ?? new Date();
  const none = (state: AccessState): Access => ({ state, allowed: false, plan: "free", source: "none", endsAt: null });
  if (i.owner) return { state: "owner", allowed: true, plan: "premium", source: "owner", endsAt: null };
  if (i.status === "suspended") return none("suspended");
  if (i.status === "revoked") return none("revoked");

  let best: Access | null = null;
  const consider = (a: Access) => { if (!best || RANK[a.plan] > RANK[best.plan]) best = a; };
  // A paid subscription counts on its own (a future public flow), independent of manual approval.
  if (subscriptionActive(i.entitlement, now)) consider({ state: "active", allowed: true, plan: i.entitlement!.plan as GrantPlan, source: "subscription", endsAt: i.entitlement!.premiumUntil });
  if (i.status === "approved") {
    if (grantActive(i.grant, now)) consider({ state: "active", allowed: true, plan: i.grant.plan as GrantPlan, source: i.grant.kind === "trial" ? "trial" : "complimentary", endsAt: i.grant.endsAt });
    const e = i.entitlement;
    if (e && e.source === "trial" && e.trialEndsAt && e.trialEndsAt > now) consider({ state: "active", allowed: true, plan: "premium", source: "legacy_trial", endsAt: e.trialEndsAt });
  }
  if (best) return best;
  return none(i.status === "approved" ? "expired" : "pending");
}

/** Duration choices offered in the admin panel. */
export const DURATION_PRESETS = [3, 7, 14, 21, 30, 90] as const;
export const MAX_GRANT_DAYS = 3650;

export type DurationInput = { type: "days"; days: number } | { type: "until"; until: string | Date } | { type: "unlimited" };

/**
 * Resolves a duration to an exact UTC end time. "21 days" = start + 21 × 24 h, to the millisecond.
 * Returns an error string for invalid input (non-integer, out of range, end date in the past).
 */
export function resolveEnd(d: DurationInput, start: Date): { ok: true; endsAt: Date | null } | { ok: false; error: string } {
  if (d.type === "unlimited") return { ok: true, endsAt: null };
  if (d.type === "days") {
    if (!Number.isInteger(d.days) || d.days < 1 || d.days > MAX_GRANT_DAYS) return { ok: false, error: `Choose between 1 and ${MAX_GRANT_DAYS} days.` };
    return { ok: true, endsAt: new Date(start.getTime() + d.days * 86_400_000) };
  }
  const until = d.until instanceof Date ? d.until : new Date(d.until);
  if (Number.isNaN(until.getTime())) return { ok: false, error: "Enter a valid expiration date." };
  if (until.getTime() <= start.getTime() + 60_000) return { ok: false, error: "The expiration date must be in the future." };
  if (until.getTime() > start.getTime() + MAX_GRANT_DAYS * 86_400_000) return { ok: false, error: "That expiration date is too far ahead." };
  return { ok: true, endsAt: until };
}

/** Extending: adds days to the current end (or to now when access already lapsed), or sets a new date. */
export function extendEnd(currentEnd: Date | null, d: DurationInput, now = new Date()) {
  if (d.type === "days") {
    const base = currentEnd && currentEnd > now ? currentEnd : now;
    return resolveEnd(d, base);
  }
  return resolveEnd(d, now);
}

/** Who may do what. The owner can do everything except act against their own account; admins have a narrow set. */
export type AdminAction = "view" | "approve" | "grant" | "extend" | "plan" | "notes" | "feedback" | "end" | "revoke" | "suspend" | "reinstate" | "delete" | "role" | "notify";
const ADMIN_ALLOWED = new Set<AdminAction>(["view", "approve", "grant", "extend", "plan", "notes", "feedback"]);

export interface Actor { id: string; owner: boolean; role: MemberRole | null }
export interface Target { id: string; owner: boolean; role: MemberRole | null }

export function canAct(actor: Actor, action: AdminAction, target?: Target): { ok: true } | { ok: false; error: string } {
  const staff = actor.owner || actor.role === "admin";
  if (!staff) return { ok: false, error: "Not allowed." };
  if (!actor.owner && !ADMIN_ALLOWED.has(action)) return { ok: false, error: "Only the owner can do this." };
  if (target) {
    if (target.owner && action !== "view" && action !== "notes") return { ok: false, error: "The owner account cannot be changed here." };
    if (!actor.owner && target.role === "admin") return { ok: false, error: "Only the owner can change an admin." };
  }
  return { ok: true };
}

/** Human labels used by the admin panel and the emails. */
export const stateLabel: Record<AccessState, string> = {
  owner: "Owner", active: "Active", pending: "Pending approval", expired: "Expired", suspended: "Suspended", revoked: "Access revoked",
};
export const sourceLabel: Record<AccessSource, string> = {
  owner: "Owner", trial: "Free trial", complimentary: "Complimentary", subscription: "Paid subscription", legacy_trial: "Trial", none: "None",
};
