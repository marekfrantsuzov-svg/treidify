import { expect, test } from "@playwright/test";
import { linkFromOutbox, totp, uniqueEmail } from "./helpers";

/**
 * Journey A: a new visitor creates an account with email, verifies it, completes onboarding with the
 * 72-hour trial, reaches the dashboard led by Market Intelligence, edits their profile, protects the
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
  await expect(page.getByText(/72-hour Premium trial is active/)).toBeVisible();
  // Market Intelligence leads the dashboard; Account Health follows it.
  await expect(page.getByText("Market Intelligence Today")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Your Account Health" })).toBeVisible();
  // Without a market-data provider nothing pretends to be live: the engine runs on clearly labelled sample bars.
  await expect(page.getByText(/Market data is not connected\. Everything below runs the real engine on sample bars/)).toBeVisible();

  // Every section in the navigation opens a real page.
  for (const [path, heading] of [["/app/intelligence", "Market Intelligence"], ["/app/macro", "Macro Desk"], ["/app/markets", "Charts"], ["/app/news", "News & Calendar"], ["/app/ai-analysis", "AI Chart Analysis"], ["/app/journal", "Trading Journal"], ["/app/performance", "Performance"], ["/app/coach", "AI Coach"], ["/app/community", "Community"], ["/app/accounts", "Account connections"], ["/app/settings/accounts", "Account connections"]] as const) {
    await page.goto(path);
    await expect(page.getByRole("heading", { level: 1, name: heading })).toBeVisible();
  }
  // The old calendar address now opens the calendar tab of News & Calendar.
  await page.goto("/app/calendar");
  await expect(page).toHaveURL(/\/app\/news\?tab=calendar/);

  // Without a sync provider the connect form is shown but cannot send anything.
  await page.goto("/app/accounts");
  await expect(page.getByText(/Account sync is not switched on yet/)).toBeVisible();
  await page.getByRole("button", { name: "Connect MetaTrader" }).click();
  await expect(page.getByRole("dialog", { name: /Connect MetaTrader/ })).toBeVisible();
  await expect(page.getByRole("button", { name: "Connect read-only" })).toBeDisabled();
  await page.keyboard.press("Escape");

  // One click adds a labelled demo account, and every module then works on it.
  await page.getByRole("button", { name: "Load demo account" }).click();
  await expect(page.getByText(/Demo account added with 140 sample trades/)).toBeVisible();
  await expect(page.getByRole("button", { name: "Remove demo account" })).toBeVisible();

  await page.goto("/app");
  await expect(page.getByText(/^Sample( account)?$/).filter({ visible: true }).first()).toBeVisible();

  await page.goto("/app/performance?period=ALL");
  await expect(page.getByRole("heading", { name: "Equity curve" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "By session" })).toBeVisible();
  await expect(page.getByText("140", { exact: true })).toBeVisible();

  await page.goto("/app/journal?period=ALL");
  await expect(page.getByText("0 / 140")).toBeVisible();
  await page.getByRole("button", { name: /Add notes/ }).first().click();
  await page.getByLabel("Notes", { exact: true }).fill("Waited for the London open retest.");
  await page.getByLabel("Setup tags").fill("retest, london open");
  await page.getByRole("button", { name: "Save entry" }).click();
  await expect(page.getByText("1 / 140")).toBeVisible();
  await page.getByRole("combobox", { name: "Journal notes" }).selectOption("with");
  await expect(page).toHaveURL(/notes=with/);
  await expect(page.getByRole("button", { name: /retest, london open/ })).toBeVisible();
  await expect(page.locator("tbody tr")).toHaveCount(1);

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
