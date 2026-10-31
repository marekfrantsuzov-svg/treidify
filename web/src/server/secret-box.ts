/**
 * AES-256-GCM for the few secrets Treidify must hold, such as an investor password when the sync provider
 * needs it re-supplied. Key: DATA_ENCRYPTION_KEY, 32 bytes base64. Format: v1.<iv>.<tag>.<ciphertext>, base64url.
 * Server code only; kept free of "server-only" so it can be unit tested.
 */
import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

function key(raw = process.env.DATA_ENCRYPTION_KEY): Buffer {
  if (!raw) throw new Error("DATA_ENCRYPTION_KEY is not set.");
  const k = Buffer.from(raw, "base64");
  if (k.length !== 32) throw new Error("DATA_ENCRYPTION_KEY must be 32 bytes, base64 encoded.");
  return k;
}

export function seal(plaintext: string, rawKey?: string): string {
  const iv = randomBytes(12);
  const c = createCipheriv("aes-256-gcm", key(rawKey), iv);
  const ct = Buffer.concat([c.update(plaintext, "utf8"), c.final()]);
  return ["v1", iv, c.getAuthTag(), ct].map((p) => (typeof p === "string" ? p : p.toString("base64url"))).join(".");
}

export function open(sealed: string, rawKey?: string): string {
  const [v, iv, tag, ct] = sealed.split(".");
  if (v !== "v1" || !iv || !tag || !ct) throw new Error("Unrecognised secret format.");
  const d = createDecipheriv("aes-256-gcm", key(rawKey), Buffer.from(iv, "base64url"));
  d.setAuthTag(Buffer.from(tag, "base64url"));
  return Buffer.concat([d.update(Buffer.from(ct, "base64url")), d.final()]).toString("utf8");
}
