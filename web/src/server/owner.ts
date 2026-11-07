/**
 * The Treidify owner: full administrative control (Members admin panel) and the one account allowed to connect
 * MetaTrader with a master password (still read-only use).
 *
 * Rule (pure, unit tested; the database side lives in owner-binding.ts):
 * - The owner is a backend role: the single owner_binding row, holding one immutable user ID. No API, form or
 *   request can write it. It is set once by a database migration or by scripts/assign-owner.ts (database access only).
 * - TREIDIFY_OWNER_USER_ID, a server variable, may pin the owner ID explicitly and takes precedence.
 * - Email addresses never make anyone the owner at runtime, and registering first means nothing.
 * - The owner account must be verified, and an admin impersonation session never carries owner rights.
 * OWNER_EMAIL remains only to tell that mailbox how to finish verification, and for the one-time bootstrap.
 * Kept free of "server-only" so it can be unit tested; only server code imports it.
 */
export const OWNER_EMAIL = "marekfrantsuzov@gmail.com";

export interface OwnerCandidate { id: string; email: string; emailVerified: boolean; impersonated?: boolean }
export type OwnerDecision = "owner" | "not_owner";
type Env = Record<string, string | undefined>;

/** Canonical mailbox: lower case; for Gmail also without dots and +tags (Google delivers those to the same inbox). */
export function canonicalEmail(email: string) {
  const e = email.trim().toLowerCase();
  const at = e.lastIndexOf("@");
  if (at < 1) return e;
  let local = e.slice(0, at);
  let domain = e.slice(at + 1);
  if (domain === "gmail.com" || domain === "googlemail.com") {
    local = local.split("+")[0]!.replace(/\./g, "");
    domain = "gmail.com";
  }
  return `${local}@${domain}`;
}

export function ownerConfig(env: Env = process.env) {
  const id = env.TREIDIFY_OWNER_USER_ID?.trim() || null;
  const email = canonicalEmail(env.TREIDIFY_OWNER_EMAIL?.trim() || OWNER_EMAIL);
  return { id, email };
}

/** Whether this email is the owner's mailbox (used only to tell that user how to activate owner access). */
export function isOwnerEmail(email: string | null | undefined, env: Env = process.env) {
  return Boolean(email) && canonicalEmail(email!) === ownerConfig(env).email;
}

/**
 * @param boundOwnerId the user ID held by the owner slot, or null when nobody is bound.
 * Only that user ID (or the pinned TREIDIFY_OWNER_USER_ID) is the owner; there is no runtime claim.
 */
export function ownerDecision(u: OwnerCandidate | null | undefined, boundOwnerId: string | null, env: Env = process.env): OwnerDecision {
  if (!u || u.impersonated || u.emailVerified !== true) return "not_owner";
  const c = ownerConfig(env);
  const ownerId = c.id ?? boundOwnerId;
  return ownerId && u.id === ownerId ? "owner" : "not_owner";
}
