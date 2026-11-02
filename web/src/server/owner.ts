/**
 * The Treidify owner: the one account allowed to connect MetaTrader with a master password (still read-only use).
 *
 * Rule (pure, unit tested here; the database binding lives in owner-binding.ts):
 * - The owner email is fixed on the server (OWNER_EMAIL, overridable only by the server variable TREIDIFY_OWNER_EMAIL).
 * - A user can be the owner only if their email, as stored in Treidify's database, equals it AND is verified (by the
 *   emailed link or by Google), and the session is not an admin impersonation.
 * - The first such user is bound to the owner slot by their immutable user ID. From then on only that user ID is the
 *   owner, so a later account can never take the role over, and nobody can grant it to themselves.
 * - TREIDIFY_OWNER_USER_ID, if set, pins the owner ID explicitly and takes precedence over the binding.
 * The id, email and verification always come from the database, never from anything the browser sends.
 * Kept free of "server-only" so it can be unit tested; only server code imports it.
 */
export const OWNER_EMAIL = "marekfrantsuzov@gmail.com";

export interface OwnerCandidate { id: string; email: string; emailVerified: boolean; impersonated?: boolean }
export type OwnerDecision = "owner" | "not_owner" | "claim";
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
 * @param boundOwnerId the user ID currently bound to the owner slot, or null when nobody is bound yet.
 * Returns "claim" when this user qualifies and the slot is still free; the caller binds it atomically.
 */
export function ownerDecision(u: OwnerCandidate | null | undefined, boundOwnerId: string | null, env: Env = process.env): OwnerDecision {
  if (!u || u.impersonated) return "not_owner";
  if (u.emailVerified !== true || !isOwnerEmail(u.email, env)) return "not_owner";
  const c = ownerConfig(env);
  if (c.id) return u.id === c.id ? "owner" : "not_owner";
  if (boundOwnerId) return u.id === boundOwnerId ? "owner" : "not_owner";
  return "claim";
}
