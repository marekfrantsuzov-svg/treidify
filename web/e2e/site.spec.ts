import { expect, test } from "@playwright/test";

/** The public homepage: hero, illustrative product preview, the editorial scenes, tool index, pricing and FAQ. */
test("homepage hero, product showcase sections, pricing and FAQ", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(/Know where gold reacts\. Understand why it moves\./);
  await expect(page.getByRole("link", { name: /Start 3-day trial/ }).first()).toHaveAttribute("href", "/signup");
  await expect(page.getByText(/Illustrative preview with example figures/).first()).toBeVisible();

  // The hero shows the animated desktop app, never a phone mockup; its steps can be chosen directly.
  const demo = page.getByRole("group", { name: "Illustrative Treidify product demonstration" });
  await expect(demo).toBeVisible();
  await expect(page.locator(".lx-phone")).toHaveCount(0);
  await demo.getByRole("button", { name: "Bearish 1H" }).click();
  await expect(demo.getByRole("button", { name: "Bearish 1H" })).toHaveAttribute("aria-pressed", "true");
  await expect(demo.locator(".sx-layer.is-on").getByText("XAUUSD · BEARISH 1H")).toBeAttached();

  for (const h of ["Numbers you can hold the product to.", "Your account, read the way a risk manager would.", "Analysis that changes with the timeframe.", "Every trading day, accounted for.", "A coach that has read every trade you took.", "The forces behind gold, in one desk.", "Nine tools. One account, one set of risk rules.", "Three steps to a clearer view.", "One workspace for the chart, the macro and your own account.", "Two plans. One honest trial.", "Straight answers.", "Trade with more clarity. Start today."]) {
    await expect(page.getByRole("heading", { name: h })).toBeVisible();
  }
  for (const f of ["Account Health", "MT5 sync", "Zone engine", "Fibonacci and liquidity", "Macro Desk", "Economic calendar", "Trading journal", "AI coach", "Community"]) {
    await expect(page.locator("#features").getByText(f, { exact: true })).toBeVisible();
  }

  // The timeframe switch changes the analysis read, and the 50-pip rule turns the 4H example into WAIT.
  const analysis = page.locator("#analysis");
  await analysis.getByRole("tab", { name: "4H" }).click();
  await expect(analysis.getByText("WAIT · NO VALID SETUP").first()).toBeVisible();
  await analysis.getByRole("tab", { name: "1H" }).click();
  await expect(analysis.getByText(/Structural stop 38 pips \(\$3\.80\)/)).toBeVisible();

  // No App Store link until the app is published.
  await expect(page.locator('a[href*="apps.apple.com"]')).toHaveCount(0);

  // Final prices with the card-required trial disclosure; the retired no-card trial copy is gone.
  const pricing = page.locator("#pricing");
  await expect(pricing.getByText(/\$195\.84/).first()).toBeVisible();
  await expect(pricing.getByText(/\$399\.84/).first()).toBeVisible();
  await expect(pricing.getByText(/Cancel any time before the trial ends and you pay nothing/)).toBeVisible();
  await expect(page.getByText(/no card/i)).toHaveCount(0);

  const footer = page.locator("footer");
  for (const l of ["About Treidify", "All features", "Pricing", "Contact support", "Help Center", "Privacy Policy", "Terms of Service", "Risk Disclosure"]) {
    await expect(footer.getByRole("link", { name: l })).toBeVisible();
  }
  expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBeLessThanOrEqual(0);
});
