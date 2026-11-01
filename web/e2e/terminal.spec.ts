import { expect, test, type Page } from "@playwright/test";
import { linkFromOutbox, uniqueEmail } from "./helpers";

/** Signs up, verifies and finishes onboarding without connecting an account. */
async function signUp(page: Page, tag: string) {
  const email = uniqueEmail(tag);
  await page.goto("/signup?trial=1");
  await page.getByLabel("Name").fill("Terminal Tester");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password", { exact: true }).fill("a-long-test-passphrase-42");
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "Create free account" }).click();
  await expect(page.getByRole("heading", { name: "Check your inbox" })).toBeVisible({ timeout: 30_000 });
  await page.goto(await linkFromOutbox(page, email, "/api/auth/verify-email"));
  await page.getByLabel("Username").fill(`t_${Date.now().toString(36)}${tag[0]}`);
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByRole("radio", { name: /Developing/ }).click();
  for (let i = 0; i < 4; i++) await page.getByRole("button", { name: "Continue" }).click();
  await page.getByRole("button", { name: "Continue without connecting" }).click();
  await page.getByRole("checkbox", { name: /I understand the risks/ }).click();
  await page.getByRole("button", { name: /Enter my dashboard/ }).click();
  await expect(page).toHaveURL(/\/app/, { timeout: 30_000 });
}

test("terminal: overlays toggle independently, zones explain the 50-pip rule, data is labelled, nothing overflows", async ({ page }, info) => {
  await signUp(page, `term-${info.project.name}`);

  // Markets: sample bars are labelled as such, never as live.
  await page.goto("/app/markets?symbol=XAUUSD&tf=1H");
  await expect(page.getByRole("heading", { level: 1, name: "Markets" })).toBeVisible();
  await expect(page.getByText("Sample bars · not live").first()).toBeVisible({ timeout: 30_000 });

  const overlays = page.getByRole("group", { name: "Chart overlays" }).first();
  const fib = overlays.getByRole("button", { name: "Fibonacci" });
  const liq = overlays.getByRole("button", { name: "Liquidity" });
  const vol = overlays.getByRole("button", { name: "Volume" });

  // Each overlay switches on and off on its own.
  await expect(fib).toHaveAttribute("aria-pressed", "false");
  await fib.click();
  await expect(fib).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator(".tz-fib-label").first()).toBeVisible();
  await expect(page.locator(".tz-fib-label").first()).toContainText("%");
  await expect(liq).toHaveAttribute("aria-pressed", "false");

  await liq.click();
  await expect(page.getByText("Liquidity bands are estimated from swing highs and lows, not exchange order-book data.")).toBeVisible();
  await fib.click();
  await expect(fib).toHaveAttribute("aria-pressed", "false");
  await expect(page.locator(".tz-fib-label")).toHaveCount(0);
  await expect(liq).toHaveAttribute("aria-pressed", "true");

  // Volume says what it is: sample here, tick volume with a real feed.
  await vol.click();
  await expect(page.getByText(/Sample volume|Tick volume|Volume unavailable/).first()).toBeVisible();

  // A zone opens its explanation with the 50-pip rule.
  const zone = page.locator(".tz-zone-label").first();
  await expect(zone).toBeVisible();
  await zone.click();
  await expect(page.getByText("50-pip stop rule").first()).toBeVisible();

  // Analysis, Macro Desk, Journal and Community render without horizontal overflow.
  for (const [path, heading] of [["/app/intelligence", "Market Intelligence"], ["/app/macro", "Macro Desk"], ["/app/journal", "Trading Journal"], ["/app/community", "Community"], ["/app/markets", "Markets"], ["/app", null]] as const) {
    await page.goto(path);
    if (heading) await expect(page.getByRole("heading", { level: 1, name: heading })).toBeVisible();
    await page.waitForLoadState("networkidle");
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow, `${path} overflows horizontally`).toBeLessThanOrEqual(0);
  }

  // Journal: no fabricated history; the demo preview is opt-in and labelled.
  await page.goto("/app/journal");
  await expect(page.getByRole("heading", { name: "Your P&L calendar" })).toBeVisible();
  await page.getByRole("button", { name: /Preview with sample data/ }).click();
  await expect(page.getByText(/DEMO PREVIEW/)).toBeVisible();

  // Community: agents are always identified as AI.
  await page.goto("/app/community/agents/guard");
  await expect(page.getByText("AI agent").first()).toBeVisible();
  await expect(page.getByText(/not a real person/)).toBeVisible();
});
