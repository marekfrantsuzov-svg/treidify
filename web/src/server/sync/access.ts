/**
 * Read-only access policy for MetaTrader connections. Pure, so every branch is unit tested.
 *
 * Proof of read-only access is MetaApi's account-information `investorMode` flag ("investor password was used",
 * reported by G2 servers only). A normal user's connection is accepted only when that flag is exactly `true`.
 * `false` (a trading/master password) and `undefined` (MetaApi could not say) are both refused: the account is removed
 * from MetaApi before Treidify stores any data from it. The UI label is never trusted.
 *
 * The verified owner may connect with either password. Treidify stays read-only either way: there is no trade,
 * modify or close code path anywhere in the application.
 */
export type Credential = "investor" | "master";
export type AccessMode = "investor" | "master";

export type AccessDecision =
  | { ok: true; mode: AccessMode }
  | { ok: false; reason: "master_password" | "mode_unknown"; message: string };

export function decideAccess(input: { investorMode: boolean | undefined | null; owner: boolean }): AccessDecision {
  if (input.investorMode === true) return { ok: true, mode: "investor" };
  if (input.owner) return { ok: true, mode: "master" };
  if (input.investorMode === false) {
    return { ok: false, reason: "master_password", message: "That is the trading (master) password. Treidify accepts only the investor (read-only) password, so the connection was removed. Reconnect with the investor password." };
  }
  return { ok: false, reason: "mode_unknown", message: "MetaApi could not confirm that this is an investor (read-only) password, so the connection was removed for safety. Nothing was stored." };
}

/** May this user even submit this kind of password? Checked before anything is sent to MetaApi. */
export function credentialAllowed(credential: Credential, owner: boolean) {
  return credential === "investor" || owner;
}

/** Friendly text for MetaApi create-account failures; never echoes the password or raw provider text with secrets. */
export function connectErrorMessage(e: { status?: number; code?: string; serverNames?: string[] }) {
  if (e.code === "E_AUTH") return "The broker rejected the login. Check the account number, the password and the server name, then try again.";
  if (e.code === "E_SRV_NOT_FOUND") {
    const s = e.serverNames?.length ? ` Did you mean: ${e.serverNames.slice(0, 5).join(", ")}?` : "";
    return `That broker server was not found. Copy the exact server name from MetaTrader (File → Login to Trade Account).${s}`;
  }
  if (e.code === "E_SERVER_TIMEZONE") return "MetaApi could not read this broker's settings right now. Try again in a few minutes.";
  if (e.status === 401 || e.status === 403) return "Treidify's MetaApi token was refused. This is a configuration problem on our side; nothing was saved.";
  if (e.status === 429) return "MetaApi is busy right now. Wait a minute and try again; nothing was saved.";
  if (e.status === 400 || e.status === 404) return "The broker server or login was not recognised. Check them and try again.";
  return "MetaApi could not create the connection. Nothing was saved; try again shortly.";
}

/** Removes every occurrence of a secret from a string before it can reach logs or the database. */
export function redact(text: string, ...secrets: (string | null | undefined)[]) {
  let out = text;
  for (const s of secrets) if (s && s.length >= 3) out = out.split(s).join("[redacted]");
  return out;
}

/** Freshness of account data for the UI. Never labels periodically refreshed data as streaming. */
export function freshness(asOf: Date | null, now: Date, opts = { fresh: 90_000, stale: 15 * 60_000 }): "fresh" | "recent" | "stale" | "none" {
  if (!asOf) return "none";
  const age = now.getTime() - asOf.getTime();
  return age <= opts.fresh ? "fresh" : age <= opts.stale ? "recent" : "stale";
}
