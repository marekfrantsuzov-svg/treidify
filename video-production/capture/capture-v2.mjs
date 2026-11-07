/**
 * Captures for the v2 commercial: the REAL Treidify app at an iPhone viewport (light + dark) and
 * single-overlay states of the desktop Markets chart. LOCAL dev server + LOCAL sample account only.
 * Output: ../assets/ui2/*.png
 */
import { chromium } from "playwright";
import fs from "node:fs";
const BASE = process.env.BASE ?? "http://localhost:3000";
if (!/^http:\/\/(localhost|127\.0\.0\.1)/.test(BASE)) throw new Error("Capture only runs against a local server");
const OUT = new URL("../assets/ui2/", import.meta.url).pathname;
fs.mkdirSync(OUT, { recursive: true });
const only = process.env.ONLY?.split(",");
const want = (...n) => !only || n.some((x) => only.includes(x));
const b = await chromium.launch();
const tidy = (theme) => () => {};
async function mk(theme, viewport, dpr, isMobile) {
  const ctx = await b.newContext({ storageState: new URL("state.json", import.meta.url).pathname, viewport, deviceScaleFactor: dpr, isMobile, hasTouch: isMobile, colorScheme: theme });
  await ctx.addInitScript((theme) => {
    try { localStorage.setItem("theme", theme); } catch {}
    const run = () => {
      if (!document.head) return;
      if (!document.getElementById("cap-css")) { const s = document.createElement("style"); s.id = "cap-css"; s.textContent = "nextjs-portal{display:none!important}"; document.head.appendChild(s); }
      for (const el of document.querySelectorAll("p,div")) {
        const t = el.textContent?.trim() ?? "";
        if (t.startsWith("Market data is not connected. Everything below runs the real engine") && el.children.length === 0) { const box = el.closest("[role=status],[role=note]") ?? el; box.style.display = "none"; }
        if (t.startsWith("We use strictly necessary storage") && el.querySelector("button")) el.closest("[role=dialog],[role=region],aside,div")?.style.setProperty("display", "none");
      }
    };
    new MutationObserver(run).observe(document, { childList: true, subtree: true });
  }, theme);
  const page = await ctx.newPage(); page.setDefaultTimeout(90000);
  return { ctx, page };
}
const settle = (p, ms = 2400) => p.waitForTimeout(ms);
async function go(p, path) { await p.goto(BASE + path, { waitUntil: "networkidle" }); await settle(p); }
const click = async (p, name) => { await p.getByRole("button", { name, exact: true }).or(p.getByRole("tab", { name, exact: true })).first().click(); await settle(p, 1800); };

for (const theme of ["light", "dark"]) {
  const { ctx, page } = await mk(theme, { width: 393, height: 852 }, 3, true);
  for (const [path, name] of [["/app", "dash"], ["/app/markets", "markets"], ["/app/journal", "journal"], ["/app/performance", "health"], ["/app/macro", "macro"], ["/app/accounts", "accounts"], ["/app/news?tab=calendar", "calendar"]]) {
    const n = `m-${name}-${theme}`;
    if (!want(n)) continue;
    await go(page, path);
    await page.screenshot({ path: `${OUT}${n}.png` });
    await page.screenshot({ path: `${OUT}${n}-full.png`, fullPage: true });
    console.log("shot", n);
  }
  await ctx.close();
}
if (want("desk")) {
  for (const theme of ["dark", "light"]) {
    const { ctx, page } = await mk(theme, { width: 1920, height: 1080 }, 2, false);
    await go(page, "/app/markets");
    await click(page, "Zones"); await click(page, "Structure");
    await page.screenshot({ path: `${OUT}k-clean-${theme}.png` }); console.log("k-clean", theme);
    await click(page, "Liquidity"); await page.screenshot({ path: `${OUT}k-liq-${theme}.png` });
    await click(page, "Liquidity"); await click(page, "Zones"); await page.screenshot({ path: `${OUT}k-zones-${theme}.png` });
    await click(page, "Zones"); await click(page, "Fibonacci"); await page.screenshot({ path: `${OUT}k-fib-${theme}.png` });
    await click(page, "Fibonacci"); await click(page, "Structure"); await page.screenshot({ path: `${OUT}k-struct-${theme}.png` });
    await click(page, "Liquidity"); await page.screenshot({ path: `${OUT}k-structliq-${theme}.png` });
    await go(page, "/app"); await page.screenshot({ path: `${OUT}k-dash-${theme}.png` });
    await go(page, "/app/journal"); await page.screenshot({ path: `${OUT}k-journal-${theme}.png` });
    await go(page, "/app/macro"); await page.screenshot({ path: `${OUT}k-macro-${theme}.png` });
    await go(page, "/app/accounts"); await page.screenshot({ path: `${OUT}k-accounts-${theme}.png` });
    await go(page, "/app/performance"); await page.screenshot({ path: `${OUT}k-health-${theme}.png` });
    await go(page, "/app/news?tab=calendar"); await page.screenshot({ path: `${OUT}k-cal-${theme}.png` });
    await ctx.close();
  }
}
await b.close();
