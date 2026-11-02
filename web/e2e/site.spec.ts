import { expect, test } from "@playwright/test";

/** The public homepage: hero, illustrative product preview, the editorial scenes, tool index, app store teaser and pricing. */
test("homepage hero, product showcase sections, app store teaser and pricing", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(/Know where gold reacts\. Before you trade\./);
  await expect(page.getByRole("link", { name: /Create free account/ }).first()).toHaveAttribute("href", "/signup");
  await expect(page.getByText(/Illustrative product preview/)).toBeVisible();

  for (const h of ["Numbers you can hold the product to.", "Your account, read the way a risk manager would.", "Analysis that changes with the timeframe.", "Every trading day, accounted for.", "A coach that has read every trade you took.", "The forces behind gold, in one desk.", "Nine tools. One account, one set of risk rules.", "Three steps to a clearer view.", "Treidify for iPhone", "Simple pricing.", "Trade with more clarity. Start today."]) {
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
  await expect(page.getByLabel(/App Store: coming soon/)).toBeVisible();
  await expect(page.locator('a[href*="apps.apple.com"]')).toHaveCount(0);

  await expect(page.getByText("Price announced at launch")).toBeVisible();
  await expect(page.getByText(/\$29|\$290/)).toHaveCount(0);

  const footer = page.locator("footer");
  for (const l of ["About Treidify", "All features", "Pricing", "Contact support", "Help Center", "Privacy Policy", "Terms of Service", "Risk Disclosure"]) {
    await expect(footer.getByRole("link", { name: l })).toBeVisible();
  }
  expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBeLessThanOrEqual(0);
});
