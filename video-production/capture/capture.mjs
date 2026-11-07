/**
 * Captures the REAL Treidify web app for the launch film.
 * Runs only against a LOCAL dev server with a LOCAL database and the app's own labelled sample account.
 * Output: ../assets/ui/*.png at 3840x2160 (1920x1080 CSS px, deviceScaleFactor 2).
 *
 * Capture-only cosmetics (nothing in the app is changed):
 *  - hides the Next.js dev-mode indicator and the cookie banner;
 *  - hides the wide "Market data is not connected…" notice. Every "Sample" / "Sample bars · not live" /
 *    "Illustrative" badge stays visible, and the film carries its own "labelled sample data" footnote.
 */
import { chromium } from "playwright";
import fs from "node:fs";
const BASE = process.env.BASE ?? "http://localhost:3000";
if (!/^http:\/\/(localhost|127\.0\.0\.1)/.test(BASE)) throw new Error("Capture only runs against a local server");
const OUT = process.env.OUT ?? new URL("../assets/ui/", import.meta.url).pathname;
fs.mkdirSync(OUT, { recursive: true });
const only = process.env.ONLY?.split(",");

const b = await chromium.launch({ executablePath: process.env.CHROME ?? undefined });
const ctx = await b.newContext({ storageState: new URL("state.json", import.meta.url).pathname, viewport: { width: 1920, height: 1080 }, deviceScaleFactor: Number(process.env.DPR ?? 2), colorScheme: "dark" });
await ctx.addInitScript(() => {
  try { localStorage.setItem("theme", "dark"); } catch {}
  const css = `nextjs-portal{display:none!important}`;
  const tidy = () => {
    if (!document.head) return;
    if (!document.getElementById("cap-css")) { const s = document.createElement("style"); s.id = "cap-css"; s.textContent = css; document.head.appendChild(s); }
    for (const el of document.querySelectorAll("p,div")) {
      const t = el.textContent?.trim() ?? "";
      if (t.startsWith("Market data is not connected. Everything below runs the real engine") && el.children.length === 0) {
        const box = el.closest("[role=status],[role=note]") ?? el; box.style.display = "none";
      }
      if (t.startsWith("We use strictly necessary storage") && el.querySelector("button")) el.closest("[role=dialog],[role=region],aside,div")?.style.setProperty("display", "none");
    }
  };
  new MutationObserver(tidy).observe(document, { childList: true, subtree: true });
});
const page = await ctx.newPage();
page.setDefaultTimeout(90000);
const settle = (ms = 2200) => page.waitForTimeout(ms);
async function go(path) { await page.goto(BASE + path, { waitUntil: "networkidle" }); await page.mouse.move(5, 1075); await settle(); }
async function shot(name, opts = {}) { if (only && !only.includes(name)) return; await page.screenshot({ path: `${OUT}${name}.png`, ...opts }); console.log("shot", name); }
const want = (...names) => !only || names.some((n) => only.includes(n));
const click = async (name) => { const btn = page.getByRole("button", { name, exact: true }).or(page.getByRole("tab", { name, exact: true })).first(); await btn.click(); await settle(1800); };

if (want("dashboard")) { await go("/app"); await shot("dashboard"); }
if (want("markets-1h", "markets-fib", "markets-liq", "markets-4h", "markets-15m", "markets-clean")) {
  await go("/app/markets");
  await click("Structure"); await shot("markets-clean");            // zones only
  await click("Structure"); await shot("markets-1h");               // zones + structure (default)
  await click("Fibonacci"); await shot("markets-fib");
  await click("Liquidity"); await shot("markets-liq");
  await click("4H"); await shot("markets-4h");
  await click("15M"); await shot("markets-15m");
}
if (want("analysis")) { await go("/app/intelligence"); await shot("analysis"); }
if (want("macro", "macro-2")) { await go("/app/macro"); await shot("macro"); await page.mouse.wheel(0, 520); await settle(); await shot("macro-2"); }
if (want("coach")) { await go("/app/coach"); await shot("coach"); }
if (want("journal", "journal-2")) { await go("/app/journal"); await shot("journal"); await page.mouse.wheel(0, 900); await settle(); await shot("journal-2"); }
if (want("health", "health-2")) { await go("/app/performance"); await shot("health"); await page.mouse.wheel(0, 700); await settle(); await shot("health-2"); }
if (want("accounts")) { await go("/app/accounts"); await shot("accounts"); }
if (want("hero", "land-macro", "land-journal", "land-coach", "land-account", "land-analysis")) {
  await go("/"); await shot("hero");
  for (const [id, name] of [["account", "land-account"], ["analysis", "land-analysis"], ["macro", "land-macro"], ["journal", "land-journal"], ["coach", "land-coach"]]) {
    const el = page.locator(`#${id}`).first();
    if (!(await el.count())) { console.log("missing", id); continue; }
    await el.scrollIntoViewIfNeeded(); await page.mouse.wheel(0, 200); await settle(2800);
    if (!only || only.includes(name)) { await el.screenshot({ path: `${OUT}${name}.png` }); console.log("shot", name); }
  }
}
await b.close();
