/**
 * The Treidify owner. Owner rights are granted ONLY when the signed-in user's immutable id equals TREIDIFY_OWNER_USER_ID
 * AND that user's email equals TREIDIFY_OWNER_EMAIL AND the email is verified. Both values live in server environment
 * variables (Vercel), so nothing a browser sends, and nothing a user can edit in their profile, can grant the role.
 * The id and email always come from the server-side session (database), never from request input.
 * Kept free of "server-only" so it can be unit tested; only server code imports it.
 */
export interface OwnerCandidate { id: string; email: string; emailVerified: boolean }

export function ownerConfig(env: Record<string, string | undefined> = process.env) {
  const id = env.TREIDIFY_OWNER_USER_ID?.trim() || null;
  const email = env.TREIDIFY_OWNER_EMAIL?.trim().toLowerCase() || null;
  return { id, email, configured: Boolean(id && email) };
}

export function isOwner(u: OwnerCandidate | null | undefined, env: Record<string, string | undefined> = process.env): boolean {
  const c = ownerConfig(env);
  if (!u || !c.configured) return false;
  return u.id === c.id && u.emailVerified === true && u.email.trim().toLowerCase() === c.email;
}
