import { eq } from "drizzle-orm";
import { audit } from "./audit";
import { db, schema } from "./db";
import { ownerDecision, type OwnerCandidate } from "./owner";

/**
 * Database side of the owner rule (see owner.ts). The owner slot is a single row (primary key fixed to "owner",
 * enforced by a CHECK constraint) holding the bound user ID, so at most one user can ever hold it, and a concurrent
 * second claim loses at the database. The slot is separate from Better Auth's role column, so the admin plugin's role
 * tools cannot grant or move it.
 */
export async function boundOwnerId(): Promise<string | null> {
  const [r] = await db.select({ userId: schema.ownerBinding.userId }).from(schema.ownerBinding).where(eq(schema.ownerBinding.slot, "owner"));
  return r?.userId ?? null;
}

/** Owner check for a user read from the database. Binds the owner slot on the owner's first verified visit. */
export async function resolveOwner(u: OwnerCandidate | null | undefined): Promise<boolean> {
  if (!u) return false;
  const d = ownerDecision(u, await boundOwnerId());
  if (d !== "claim") return d === "owner";
  const won = await db.insert(schema.ownerBinding).values({ slot: "owner", userId: u.id, email: u.email.trim().toLowerCase() })
    .onConflictDoNothing().returning({ userId: schema.ownerBinding.userId });
  if (won.length) await audit("owner.bound", { actorId: u.id, targetType: "user", targetId: u.id });
  return ownerDecision(u, await boundOwnerId()) === "owner";
}

/** Loads the signed-in user from the database and resolves owner status. Impersonated sessions never get it. */
export async function ownerForUserId(userId: string, opts: { impersonatedBy?: string | null } = {}) {
  const [u] = await db.select({ id: schema.user.id, email: schema.user.email, emailVerified: schema.user.emailVerified }).from(schema.user).where(eq(schema.user.id, userId));
  if (!u) return { user: null, owner: false };
  const candidate = { ...u, impersonated: Boolean(opts.impersonatedBy) };
  return { user: candidate, owner: await resolveOwner(candidate) };
}
