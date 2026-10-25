import { createHmac } from "node:crypto";
import type { Page } from "@playwright/test";

export const uniqueEmail = (tag: string) => `e2e-${tag}-${Date.now()}-${Math.floor(Math.random() * 1e6)}@example.com`;

/** Reads the newest link for `email` from the development outbox. */
export async function linkFromOutbox(page: Page, email: string, pathPart: string) {
  for (let i = 0; i < 20; i++) {
    const res = await page.request.get("/dev/outbox");
    const html = (await res.text()).replaceAll("&amp;", "&");
    const blocks = html.split('data-testid="mail"').filter((b) => b.includes(email));
    for (const b of blocks) {
      const m = b.match(new RegExp(`https?://[^\\s"<]*${pathPart}[^\\s"<]*`));
      if (m) return m[0];
    }
    await page.waitForTimeout(250);
  }
  throw new Error(`No ${pathPart} email for ${email}`);
}

function base32(s: string) {
  const alpha = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  let bits = "";
  for (const c of s.replace(/=+$/, "").toUpperCase()) bits += alpha.indexOf(c).toString(2).padStart(5, "0");
  const out: number[] = [];
  for (let i = 0; i + 8 <= bits.length; i += 8) out.push(parseInt(bits.slice(i, i + 8), 2));
  return Buffer.from(out);
}

/** RFC 6238 TOTP (SHA-1, 30 s, 6 digits), as authenticator apps compute it. */
export function totp(secret: string, at = Date.now()) {
  const counter = Buffer.alloc(8);
  counter.writeBigUInt64BE(BigInt(Math.floor(at / 30_000)));
  const h = createHmac("sha1", base32(secret)).update(counter).digest();
  const o = h[h.length - 1]! & 0xf;
  return String((h.readUInt32BE(o) & 0x7fffffff) % 1_000_000).padStart(6, "0");
}
