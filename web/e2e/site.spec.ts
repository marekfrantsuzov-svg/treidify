import { expect, test } from "@playwright/test";

/** The public homepage: hero with both actions, real product screens, features, tour, App Store "coming soon" without a link. */
test("homepage hero, product screens, sections, app store teaser and pricing", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(/AI-powered trading intelligence for gold, the dollar and your own account\./);
  await expect(page.getByRole("link", { name: /Create free account/ }).first()).toHaveAttribute("href", "/signup");
  await expect(page.getByRole("main").getByRole("link", { name: "Sign in" })).toHaveAttribute("href", "/login");
  await expect(page.getByAltText(/The Treidify dashboard/).filter({ visible: true })).toBeVisible();
  await expect(page.getByText(/shown with sample data/i).first()).toBeVisible();

  for (const h of ["Everything you need to read the market and yourself.", "See the product as it is.", "From sign-up to a clearer view in three steps.", "Treidify for iPhone", "Simple pricing.", "Trade with more clarity."]) {
    await expect(page.getByRole("heading", { name: h })).toBeVisible();
  }
  for (const f of ["AI Market Intelligence", "Gold, DXY and Silver", "Key buy and sell zones", "Performance tracking", "MetaTrader connection", "Real-time market news", "Market sentiment", "AI trading coach", "Session intelligence"]) {
    await expect(page.getByRole("heading", { name: f, exact: true })).toBeVisible();
  }
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
