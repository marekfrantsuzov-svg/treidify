import { eq } from "drizzle-orm";
import { audit } from "./audit";
import { db, schema } from "./db";
import { ownerDecision, type OwnerCandidate } from "./owner";

/**
 * Database side of the owner rule (see owner.ts). The owner slot is a single row (primary key fixed to "owner",
 * enforced by a CHECK constraint) holding the bound user ID, so at most one user can ever hold it, and a concurrent
 * second binding fails at the database. The slot is separate from Better Auth's role column, so the admin plugin's role
 * tools cannot grant or move it.
 */
export async function boundOwnerId(): Promise<string | null> {
  const [r] = await db.select({ userId: schema.ownerBinding.userId }).from(schema.ownerBinding).where(eq(schema.ownerBinding.slot, "owner"));
  return r?.userId ?? null;
}

/** Owner check for a user read from the database. Never binds anything: the slot is set only by migration or script. */
export async function resolveOwner(u: OwnerCandidate | null | undefined): Promise<boolean> {
  if (!u) return false;
  return ownerDecision(u, await boundOwnerId()) === "owner";
}

/**
 * Assigns the owner slot to a user ID. Used only by scripts/assign-owner.ts (run with database access), never by a
 * request handler. Refuses to move an already-bound slot unless `replace` is set explicitly.
 */
export async function assignOwner(userId: string, opts: { replace?: boolean } = {}) {
  const [u] = await db.select({ id: schema.user.id, email: schema.user.email, emailVerified: schema.user.emailVerified }).from(schema.user).where(eq(schema.user.id, userId));
  if (!u) throw new Error("No user with that ID.");
  if (!u.emailVerified) throw new Error("That account has not verified its email.");
  const current = await boundOwnerId();
  if (current && current !== userId && !opts.replace) throw new Error(`The owner slot is already bound to ${current}. Pass --replace to move it.`);
  await db.transaction(async (tx) => {
    await tx.delete(schema.ownerBinding).where(eq(schema.ownerBinding.slot, "owner"));
    await tx.insert(schema.ownerBinding).values({ slot: "owner", userId, email: u.email.trim().toLowerCase() });
    await tx.insert(schema.membership).values({ userId, status: "approved", approvedAt: new Date(), approvedBy: "owner-script" })
      .onConflictDoUpdate({ target: schema.membership.userId, set: { status: "approved" } });
  });
  await audit("owner.bound", { actorId: null, targetType: "user", targetId: userId, meta: { via: "script", previous: current } });
  return u;
}

/** Loads the signed-in user from the database and resolves owner status. Impersonated sessions never get it. */
export async function ownerForUserId(userId: string, opts: { impersonatedBy?: string | null } = {}) {
  const [u] = await db.select({ id: schema.user.id, email: schema.user.email, emailVerified: schema.user.emailVerified }).from(schema.user).where(eq(schema.user.id, userId));
  if (!u) return { user: null, owner: false };
  const candidate = { ...u, impersonated: Boolean(opts.impersonatedBy) };
  return { user: candidate, owner: await resolveOwner(candidate) };
}
