import { expect, test } from "@playwright/test";

/** The public homepage: new hero, labelled demo widgets, the eight sections, and no unapproved prices. */
test("homepage hero, demo widgets, sections and pricing", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(/Your Trading Intelligence\.\s*All in One Place\./);
  await expect(page.getByText(/become a more disciplined trader/)).toBeVisible();
  await expect(page.getByRole("link", { name: /Get Started Free/ }).first()).toBeVisible();
  await expect(page.getByRole("link", { name: "Explore Features" })).toBeVisible();

  // Each demo widget carries its label; the visible set depends on screen width.
  for (const title of ["Today’s market outlook", "XAUUSD & DXY", "Trading performance", "Win rate & P&L", "AI trading insight", "Economic calendar", "Market sessions", "Trading psychology"]) {
    await expect(page.getByText(title, { exact: true }).filter({ visible: true }).first()).toBeVisible();
  }
  await expect(page.getByText(/No emotion detection/).filter({ visible: true }).first()).toBeVisible();

  for (const h of ["Everything a trader needs.", "Know where to look before price gets there.", "Your MT5 account, finally understood.", "A coach that reads your trades, not your mind.", "The news that moves gold, ranked by impact.", "How Treidify works.", "Simple pricing.", "Trade With More Clarity."]) {
    await expect(page.getByRole("heading", { name: h })).toBeVisible();
  }
  await expect(page.getByText("Price announced at launch")).toBeVisible();
  await expect(page.getByText(/\$29|\$290/)).toHaveCount(0);
  await expect(page.getByRole("link", { name: /Create Your Free Account/ })).toHaveAttribute("href", "/signup");

  const footer = page.locator("footer");
  for (const l of ["About Treidify", "All features", "Pricing", "Contact", "Privacy Policy", "Terms of Service", "Risk Disclosure"]) {
    await expect(footer.getByRole("link", { name: l })).toBeVisible();
  }
  expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBeLessThanOrEqual(0);
});
