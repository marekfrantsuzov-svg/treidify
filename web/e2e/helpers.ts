import { createHmac } from "node:crypto";
import { expect, type Page } from "@playwright/test";
import postgres from "postgres";

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

/** Signs up, verifies and finishes onboarding (joining the waitlist), then approves the account like the owner would. */
export async function signUp(page: Page, tag: string, opts: { approve?: boolean; name?: string } = {}) {
  const email = uniqueEmail(tag);
  await page.goto("/signup?plan=premium");
  await page.getByLabel("Name").fill(opts.name ?? "Terminal Tester");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password", { exact: true }).fill("a-long-test-passphrase-42");
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page.getByRole("heading", { name: "Check your inbox" })).toBeVisible({ timeout: 30_000 });
  await page.goto(await linkFromOutbox(page, email, "/api/auth/verify-email"));
  await page.getByLabel("Username").fill(`t_${Date.now().toString(36)}${tag[0]}`);
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByRole("radio", { name: /Developing/ }).click();
  for (let i = 0; i < 4; i++) await page.getByRole("button", { name: "Continue" }).click();
  await page.getByRole("button", { name: "Continue without connecting" }).click();
  await page.getByRole("checkbox", { name: /I understand the risks/ }).click();
  await page.getByRole("button", { name: /Join the waitlist/ }).click();
  await expect(page).toHaveURL(/\/waitlist/, { timeout: 30_000 });
  if (opts.approve !== false) await grantPlan(email);
  return email;
}


const db = () => postgres(process.env.DATABASE_URL ?? "postgres://treidify:treidify@localhost:5432/treidify_e2e", { max: 1 });

/**
 * Approves the account and gives it complimentary access, exactly the rows the owner's "Approve → grant" writes
 * (billing has no test keys in CI). Accounts left pending see the waitlist instead; that is covered separately.
 */
export async function grantPlan(email: string, plan: "essential" | "premium" = "premium", days = 7) {
  const sql = db();
  try {
    const [u] = await sql<{ id: string }[]>`select id from "user" where email = ${email.toLowerCase()}`;
    if (!u) throw new Error(`No user ${email}`);
    await sql.begin(async (tx) => {
      await tx`insert into membership (user_id, status, approved_at, approved_by) values (${u.id}, 'approved', now(), 'e2e')
        on conflict (user_id) do update set status = 'approved', approved_at = coalesce(membership.approved_at, now())`;
      await tx`update access_grant set ended_at = now(), end_reason = 'replaced' where user_id = ${u.id} and ended_at is null`;
      await tx`insert into access_grant (user_id, kind, plan, starts_at, ends_at, granted_by) values (${u.id}, 'complimentary', ${plan}, now(), now() + make_interval(days => ${days}), 'e2e')`;
    });
  } finally { await sql.end(); }
}

/** Makes this (verified) account the owner, the way the migration or scripts/assign-owner.ts does in production. */
export async function bindOwner(email: string) {
  const sql = db();
  try {
    await sql`delete from owner_binding`;
    await sql`insert into owner_binding (slot, user_id, email) select 'owner', id, email from "user" where email = ${email.toLowerCase()}`;
  } finally { await sql.end(); }
}
