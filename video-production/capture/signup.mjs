// Creates a local demo user on a LOCAL dev server + LOCAL database only. Never points at production.
import { chromium } from "playwright";
import postgres from "postgres";
const BASE = process.env.BASE ?? "http://localhost:3000";
if (!/localhost|127\.0\.0\.1/.test(BASE)) throw new Error("Capture only runs against a local server");
const DB = process.env.DATABASE_URL;
const email = process.env.DEMO_EMAIL ?? "demo@treidify.local";
const b = await chromium.launch({ executablePath: process.env.CHROME ?? undefined });
const page = await b.newPage();
page.setDefaultTimeout(60000);
async function outboxLink(part) {
  for (let i = 0; i < 40; i++) {
    const html = (await (await page.request.get(BASE + "/dev/outbox")).text()).replaceAll("&amp;", "&");
    for (const blk of html.split('data-testid="mail"').filter((x) => x.includes(email))) {
      const m = blk.match(new RegExp(`https?://[^\\s"<]*${part}[^\\s"<]*`)); if (m) return m[0];
    }
    await page.waitForTimeout(500);
  }
  throw new Error("no mail");
}
await page.goto(BASE + "/signup?plan=premium");
await page.getByLabel("Name").fill("Alex Morgan");
await page.getByLabel("Email").fill(email);
await page.getByLabel("Password", { exact: true }).fill("a-long-demo-passphrase-42");
await page.getByRole("checkbox").check();
await page.getByRole("button", { name: "Create account" }).click();
await page.getByRole("heading", { name: "Check your inbox" }).waitFor();
await page.goto(await outboxLink("/api/auth/verify-email"));
await page.getByLabel("Username").fill("alexmorgan");
await page.getByRole("button", { name: "Continue" }).click();
await page.getByRole("radio", { name: /Developing/ }).click();
for (let i = 0; i < 4; i++) await page.getByRole("button", { name: "Continue" }).click();
await page.getByRole("button", { name: "Continue without connecting" }).click();
await page.getByRole("checkbox", { name: /I understand the risks/ }).click();
await page.getByRole("button", { name: /Join the waitlist/ }).click();
await page.waitForURL(/\/waitlist/);
const sql = postgres(DB, { max: 1 });
const [u] = await sql`select id from "user" where email = ${email}`;
await sql`insert into membership (user_id, status, approved_at, approved_by) values (${u.id}, 'approved', now(), 'video') on conflict (user_id) do update set status='approved'`;
await sql`insert into access_grant (user_id, kind, plan, starts_at, ends_at, granted_by) values (${u.id}, 'complimentary', 'premium', now(), now() + interval '30 days', 'video')`;
await sql.end();
await page.context().storageState({ path: "state.json" });
console.log("ok", email);
await b.close();
