import { expect, test } from "@playwright/test";
import { linkFromOutbox, totp, uniqueEmail } from "./helpers";

/**
 * Journey A: a new visitor creates an account with email, verifies it, completes onboarding with the
 * 72-hour trial, reaches the dashboard with Account Health first, edits their profile, protects the
 * account with two-step sign-in, and signs back in with it.
 */
test("sign up, verify, onboard, dashboard, profile, two-step sign-in", async ({ page }, info) => {
  const email = uniqueEmail(info.project.name);
  const password = "a-long-test-passphrase-42";
  const username = `e2e_${Date.now().toString(36)}${info.project.name[0]}`;

  await page.goto("/signup?trial=1");
  await page.getByLabel("Name").fill("Journey Tester");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "Create free account" }).click();
  await expect(page.getByRole("heading", { name: "Check your inbox" })).toBeVisible();

  await page.goto(await linkFromOutbox(page, email, "/api/auth/verify-email"));
  await expect(page).toHaveURL(/\/onboarding/);

  await expect(page.getByRole("heading", { name: "Welcome to Treidify" })).toBeVisible();
  await page.getByLabel("Username").fill(username);
  await page.getByRole("button", { name: "Continue" }).click();

  await expect(page.getByRole("heading", { name: /How long have you been trading/ })).toBeVisible();
  await page.getByRole("radio", { name: /Developing/ }).click();
  await page.getByRole("button", { name: "Continue" }).click();

  await expect(page.getByRole("heading", { name: /Which markets/ })).toBeVisible();
  await expect(page.getByRole("checkbox", { name: /Gold/ })).toHaveAttribute("aria-checked", "true");
  await page.getByRole("button", { name: "Continue" }).click();

  await expect(page.getByRole("heading", { name: /time zone/ })).toBeVisible();
  await page.getByRole("button", { name: "Continue" }).click();

  await expect(page.getByRole("heading", { name: /Shape your dashboard/ })).toBeVisible();
  await page.getByRole("radio", { name: "1H" }).click();
  await page.getByRole("button", { name: "Continue" }).click();

  await expect(page.getByRole("heading", { name: /Connect your trading account/ })).toBeVisible();
  await page.getByRole("button", { name: "Continue without connecting" }).click();

  await expect(page.getByRole("heading", { name: "You’re ready" })).toBeVisible();
  const enter = page.getByRole("button", { name: /Enter my dashboard/ });
  await expect(enter).toBeDisabled();
  await page.getByRole("checkbox", { name: /I understand the risks/ }).click();
  await expect(page.getByRole("checkbox", { name: /Premium trial/ })).toHaveAttribute("aria-checked", "true");
  await enter.click();

  await expect(page).toHaveURL(/\/app\?welcome=trial/);
  const health = page.getByRole("heading", { name: "Your Account Health" });
  await expect(health).toBeVisible();
  await expect(page.getByText(/72-hour Premium trial is active/)).toBeVisible();
  // Account Health is the first section of the dashboard.
  const firstSection = page.locator("main section").first();
  await expect(firstSection).toContainText("Your Account Health");
  // Without a market-data provider nothing pretends to be live: charts are badged and explained.
  await expect(page.getByText(/sample candles until the market-data provider is connected/)).toBeVisible();
  await expect(page.getByText(/Nothing is invented in the meantime/)).toBeVisible();

  // Every section in the navigation opens a real page.
  for (const [path, heading] of [["/app/macro", "Macro Desk"], ["/app/markets", "Markets"], ["/app/news", "Global News"], ["/app/ai-analysis", "AI Chart Analysis"], ["/app/journal", "Journal"], ["/app/coach", "AI Coach"], ["/app/community", "Community"], ["/app/calendar", "Economic Calendar"], ["/app/settings/accounts", "Settings"]] as const) {
    await page.goto(path);
    await expect(page.getByRole("heading", { level: 1, name: heading })).toBeVisible();
  }
  await page.goto("/app");

  // Onboarding is finished, so it now redirects to the app.
  await page.goto("/onboarding");
  await expect(page).toHaveURL(/\/app$/);

  await page.goto("/app/settings/profile");
  await page.getByLabel("Bio").fill("Gold and DXY, London session.");
  await page.getByRole("button", { name: "Save profile" }).click();
  await expect(page.getByText("Profile saved.")).toBeVisible();
  await expect(page.getByRole("switch", { name: "Public profile" })).toHaveAttribute("aria-checked", "false");

  await page.goto("/app/settings/plan");
  await expect(page.getByText("Trial", { exact: true })).toBeVisible();
  await expect(page.getByText(/returns to Free automatically/)).toBeVisible();

  await page.goto("/app/settings/security");
  await page.getByRole("button", { name: "Set up" }).click();
  await page.getByLabel("Confirm your password").fill(password);
  await page.getByRole("button", { name: "Continue" }).click();
  const secret = (await page.locator("code").first().innerText()).replace(/\s/g, "");
  expect(secret.length).toBeGreaterThanOrEqual(16);
  await page.getByLabel("6-digit code").fill(totp(secret));
  await page.getByRole("button", { name: "Verify and turn on" }).click();
  await expect(page.getByText(/Two-step sign-in is on/)).toBeVisible();
  await page.getByRole("button", { name: "Done" }).click();

  await page.getByRole("button", { name: "Account menu" }).click();
  await page.getByRole("menuitem", { name: "Sign out" }).click();
  await expect(page).toHaveURL(/\/login/);

  await page.goto("/app/settings/security");
  await expect(page).toHaveURL(/\/login\?next=%2Fapp%2Fsettings%2Fsecurity/);
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByRole("button", { name: /^Sign in$/ }).click();
  await expect(page).toHaveURL(/\/login\/two-factor/);
  await page.getByLabel(/6-digit code/).fill(totp(secret));
  await page.getByRole("button", { name: "Verify" }).click();
  await expect(page).toHaveURL(/\/app\/settings\/security/);
  await expect(page.getByText("Protected")).toBeVisible();
});

test("protected pages send signed-out visitors to sign-in", async ({ page }) => {
  await page.goto("/app");
  await expect(page).toHaveURL(/\/login\?next=%2Fapp/);
  const res = await page.request.get("/api/account/export");
  expect(res.status()).toBe(401);
});
