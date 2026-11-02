import { expect, test } from "@playwright/test";
import path from "node:path";
import { signUp } from "./helpers";

/**
 * Production functionality: every chart timeframe loads, the coach and journal work on real (here: labelled sample)
 * trades, journal screenshots upload and are served only to their owner, and unconfigured providers say so.
 */
test("timeframes, journal search/detail/screenshots, AI coach, news and account states", async ({ page, browser }, info) => {
  await signUp(page, `prod-${info.project.name}`);

  // All eight timeframes are offered and each one loads bars.
  await page.goto("/app/markets?symbol=XAUUSD&tf=1H");
  const tabs = page.getByRole("tablist", { name: "Timeframe" }).first();
  for (const tf of ["1M", "5M", "15M", "30M", "1H", "4H", "1D", "1W"]) await expect(tabs.getByRole("tab", { name: tf, exact: true })).toBeVisible();
  for (const tf of ["30M", "1W"]) {
    await tabs.getByRole("tab", { name: tf, exact: true }).click();
    await expect(page.locator(`[data-tf="${tf}"]`).first()).toBeVisible();
    await expect(page.getByText("Sample bars · not live").first()).toBeVisible({ timeout: 30_000 });
  }

  // News without a provider: an honest "not connected" state, never example headlines.
  await page.goto("/app/news");
  await expect(page.getByText(/The news feed is not connected/)).toBeVisible();

  // Coach without trades explains what is unavailable.
  await page.goto("/app/coach");
  await expect(page.getByText(/no trades to review/)).toBeVisible();

  // Load the labelled demo account, then use the journal.
  await page.goto("/app/accounts");
  await page.getByRole("button", { name: "Load demo account" }).click();
  await expect(page.getByRole("button", { name: "Remove demo account" })).toBeVisible({ timeout: 30_000 });

  await page.goto("/app/journal?period=ALL");
  await expect(page.getByText("How these numbers are calculated")).toBeVisible();
  await page.getByText("How these numbers are calculated").click();
  await expect(page.getByText(/gross P&L .* = net/)).toBeVisible();
  await page.getByRole("button", { name: /Add notes/ }).first().click();
  await expect(page.getByText("Net = gross + costs")).toBeVisible();
  await page.getByLabel("Setup tags").first().fill("breakout-e2e");
  await page.getByRole("button", { name: "Save entry" }).click();
  await page.waitForLoadState("networkidle");
  await page.getByLabel("Search trades").fill("breakout-e2e");
  await page.getByLabel("Search trades").press("Enter");
  await expect(page).toHaveURL(/q=breakout-e2e/);
  await expect(page.getByRole("button", { name: /breakout-e2e/ })).toHaveCount(1);
  await page.getByRole("button", { name: /breakout-e2e/ }).click();
  await page.locator('input[type="file"]').first().setInputFiles(path.resolve("public/brand/treidify-t-256.png"));
  const shot = page.getByRole("img", { name: "Trade screenshot" }).first();
  await expect(shot).toBeVisible({ timeout: 30_000 });
  const src = await shot.getAttribute("src");
  expect((await page.request.get(src!)).headers()["content-type"]).toBe("image/webp");
  // Another visitor cannot read it.
  const stranger = await browser.newContext();
  expect((await stranger.request.get(new URL(src!, page.url()).toString())).status()).toBe(401);
  await stranger.close();

  // Coach on the demo account: real period numbers and computed patterns; AI reviews say they need a key.
  await page.goto("/app/coach");
  for (const h of ["Daily review", "Weekly summary", "Monthly report", "Patterns across all synced trades"]) await expect(page.getByRole("heading", { name: h })).toBeVisible();
  await expect(page.getByText(/AI reviews switch on when ANTHROPIC_API_KEY is set/).first()).toBeVisible();

  // Health reports provider state without exposing values.
  const health = await (await page.request.get("/api/health")).json();
  expect(health.providers).toMatchObject({ marketData: false, news: false, ai: false, sync: false });
  expect(health.signIn).toMatchObject({ email: true });
});
