import { createHmac } from "node:crypto";
import { expect, type Page } from "@playwright/test";

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

/** Signs up, verifies and finishes onboarding without connecting an account. */
export async function signUp(page: Page, tag: string) {
  const email = uniqueEmail(tag);
  await page.goto("/signup?trial=1");
  await page.getByLabel("Name").fill("Terminal Tester");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password", { exact: true }).fill("a-long-test-passphrase-42");
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "Create free account" }).click();
  await expect(page.getByRole("heading", { name: "Check your inbox" })).toBeVisible({ timeout: 30_000 });
  await page.goto(await linkFromOutbox(page, email, "/api/auth/verify-email"));
  await page.getByLabel("Username").fill(`t_${Date.now().toString(36)}${tag[0]}`);
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByRole("radio", { name: /Developing/ }).click();
  for (let i = 0; i < 4; i++) await page.getByRole("button", { name: "Continue" }).click();
  await page.getByRole("button", { name: "Continue without connecting" }).click();
  await page.getByRole("checkbox", { name: /I understand the risks/ }).click();
  await page.getByRole("button", { name: /Enter my dashboard/ }).click();
  await expect(page).toHaveURL(/\/app/, { timeout: 30_000 });
}

