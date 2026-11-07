import { chromium } from "playwright";
const OUT = new URL("../assets/ui2/", import.meta.url).pathname;
const b = await chromium.launch();
const ctx = await b.newContext({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 2, colorScheme: "light" });
await ctx.addInitScript(() => { try { localStorage.setItem("theme", "light"); } catch {} });
const p = await ctx.newPage(); p.setDefaultTimeout(90000);
await p.goto("http://localhost:3000/", { waitUntil: "networkidle" }); await p.waitForTimeout(2500);
await p.evaluate(() => { for (const el of document.querySelectorAll("div")) { const t = el.textContent?.trim() ?? ""; if (t.startsWith("We use strictly necessary storage") && el.querySelector("button")) el.style.display = "none"; } document.querySelectorAll("nextjs-portal").forEach(e => e.remove()); });
for (const id of ["macro", "coach", "journal"]) {
  const el = p.locator(`#${id}`).first(); await el.scrollIntoViewIfNeeded(); await p.mouse.wheel(0, 200); await p.waitForTimeout(2800);
  await el.screenshot({ path: `${OUT}land-${id}-light.png` }); console.log(id);
}
await b.close();
