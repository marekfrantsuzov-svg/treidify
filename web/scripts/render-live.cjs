/**
 * Renders the Macro Desk, calendar and news pages of a locally started production build that talks to the REAL
 * providers (FRED, Finnhub, Twelve Data), then prints what each page shows and saves screenshots.
 * Run by .github/workflows/live-render.yml. Needs DATABASE_URL (to mark the test user verified) and psql.
 */
const { chromium, devices } = require("playwright");
const { execSync } = require("child_process");
const fs = require("fs");
const B = "http://localhost:3000", OUT = "live-shots", email = `ci${Date.now()}@example.com`, pw = "a-long-test-passphrase-42";
fs.mkdirSync(OUT, { recursive: true });
const sql = (q) => execSync(`psql "${process.env.DATABASE_URL}" -tAc "${q}"`).toString();
let problems = 0;
const bad = (m) => { problems++; console.log(`  PROBLEM: ${m}`); };
(async () => {
  const br = await chromium.launch();
  const ctx = await br.newContext({ viewport: { width: 1440, height: 1000 } });
  const page = await ctx.newPage();
  await page.goto(B + "/signup?trial=1");
  await page.getByLabel("Name").fill("Live Check");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password", { exact: true }).fill(pw);
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "Create free account" }).click();
  await page.getByRole("heading", { name: "Check your inbox" }).waitFor({ timeout: 30000 });
  sql(`update \\"user\\" set email_verified=true where email='${email}'`);
  await page.goto(B + "/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password", { exact: true }).fill(pw);
  await page.getByRole("button", { name: /Sign in|Log in/ }).click();
  await page.waitForURL(/onboarding|app/, { timeout: 30000 });
  if (page.url().includes("onboarding")) {
    await page.getByLabel("Username").fill(`ci_${Date.now().toString(36)}`);
    await page.getByRole("button", { name: "Continue" }).click();
    await page.getByRole("radio", { name: /Developing/ }).click();
    for (let i = 0; i < 4; i++) await page.getByRole("button", { name: "Continue" }).click();
    await page.getByRole("button", { name: "Continue without connecting" }).click();
    await page.getByRole("checkbox", { name: /I understand the risks/ }).click();
    await page.getByRole("button", { name: /Enter my dashboard/ }).click();
    await page.waitForURL(/\/app/, { timeout: 30000 });
  }
  sql(`update profile set timezone='Europe/Tallinn'`);
  const state = await ctx.storageState();

  // What the pages actually show, as text.
  const p = await (await br.newContext({ storageState: state, viewport: { width: 1440, height: 1000 } })).newPage();
  await p.goto(B + "/app", { waitUntil: "networkidle" });
  console.log("\n== Dashboard Macro Desk tiles ==");
  for (const t of await p.locator(".d-macro a[href^='/app/macro/']").all()) console.log("  " + (await t.getAttribute("aria-label")));
  console.log("\n== Dashboard Economic Calendar card ==\n  " + (await p.locator(".d-calendar").innerText()).replace(/\n+/g, " | "));
  console.log("\n== Dashboard Market News card ==\n  " + (await p.locator(".d-news").innerText()).replace(/\n+/g, " | "));
  console.log("\n== Dashboard News Impact on Gold ==\n  " + (await p.locator(".d-impact").innerText()).replace(/\n+/g, " | "));
  for (const id of ["rates", "inflation", "gdp"]) {
    await p.goto(`${B}/app/macro/${id}`, { waitUntil: "networkidle" });
    const txt = (await p.locator("main").innerText()).replace(/\n+/g, " | ");
    console.log(`\n== /app/macro/${id} ==\n  ${txt.slice(0, 700)}`);
    if (/FRED did not answer/.test(txt)) bad(`${id} could not load`);
  }
  await p.goto(B + "/app/news?tab=calendar&range=week&imp=all", { waitUntil: "networkidle" });
  const cal = (await p.locator("main").innerText()).replace(/\n+/g, " | ");
  console.log(`\n== Calendar (this week, all impact) ==\n  ${cal.slice(0, 2500)}`);
  await p.goto(B + "/app/news?tab=calendar&range=recent&imp=all", { waitUntil: "networkidle" });
  console.log(`\n== Calendar (recently released) ==\n  ${(await p.locator("main").innerText()).replace(/\n+/g, " | ").slice(0, 2500)}`);
  await p.goto(B + "/app/news", { waitUntil: "networkidle" });
  const imgs = await p.locator("main img").evaluateAll((els) => els.map((e) => ({ src: e.src.slice(0, 80), ok: e.complete && e.naturalWidth > 0 })));
  const ph = await p.locator(".news-thumb-ph").count();
  console.log(`\n== News list ==\n  publisher images: ${imgs.length} (${imgs.filter((i) => i.ok).length} loaded), branded placeholders: ${ph}`);
  const body = await p.locator("main").innerText();
  if (/<\/?[a-z]+[ >]|mso-|\{[^}]*:[^}]*;/i.test(body)) bad("raw HTML/CSS visible in news list");
  const first = p.locator("main a[href^='/app/news/']").first();
  if (await first.count()) {
    await first.click(); await p.waitForLoadState("networkidle");
    const art = await p.locator("article").innerText();
    console.log(`\n== First article view ==\n  ${art.replace(/\n+/g, " | ").slice(0, 900)}`);
    if (/<\/?[a-z]+[ >]|mso-|\{[^}]*:[^}]*;/i.test(art)) bad("raw HTML/CSS visible in article");
    if (!(await p.getByRole("link", { name: /Read the original article/ }).count())) bad("no Read original link");
  } else console.log("  (no headlines: news key not available on this runner)");

  for (const [vw, w, h] of [["desktop", 1440, 1000], ["iphone", 390, 844]]) for (const theme of ["light", "dark"]) {
    const c = await br.newContext({ viewport: { width: w, height: h }, storageState: state, colorScheme: theme, deviceScaleFactor: vw === "iphone" ? 2 : 1, ...(vw === "iphone" ? { isMobile: true, hasTouch: true, userAgent: devices["iPhone 13"].userAgent } : {}) });
    await c.addInitScript((t) => { try { localStorage.setItem("theme", t); } catch {} }, theme);
    const q = await c.newPage();
    for (const [n, path] of [["dashboard", "/app"], ["macro", "/app/macro"], ["inflation", "/app/macro/inflation"], ["calendar", "/app/news?tab=calendar"], ["news", "/app/news"]]) {
      await q.goto(B + path, { waitUntil: "networkidle" });
      const over = await q.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      if (over > 0) bad(`horizontal overflow ${over}px on ${vw} ${theme} ${n}`);
      await q.screenshot({ path: `${OUT}/${vw}-${theme}-${n}.png`, fullPage: vw === "desktop" });
    }
    await c.close();
  }
  await br.close();
  console.log(`\nproblems: ${problems}`);
  process.exit(problems ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
