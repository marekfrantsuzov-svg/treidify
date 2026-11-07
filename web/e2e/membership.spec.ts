import { expect, test } from "@playwright/test";
import { bindOwner, signUp } from "./helpers";

/**
 * Owner admin panel end to end, with two real accounts in two browser sessions:
 * a member registers and waits; the owner approves them for 3 days of Premium from Settings › Members; the member
 * gets in with Premium features; the owner extends; the member sends feedback that the owner sees; a normal member
 * cannot reach the panel; suspension blocks the member immediately. Runs once (desktop project) because the owner
 * slot is global; the panel's phone layout is checked at the end in the same run.
 */
test("owner approves a waitlisted member, extends, sees feedback, suspends", async ({ browser }, info) => {
  test.skip(info.project.name !== "desktop", "The owner slot is global; this journey runs once.");
  test.setTimeout(240_000);

  const ownerCtx = await browser.newContext();
  const owner = await ownerCtx.newPage();
  const ownerEmail = await signUp(owner, "owner", { approve: false, name: "Olivia Owner" });
  await bindOwner(ownerEmail);
  await owner.goto("/app/settings/members");
  await expect(owner.getByRole("navigation", { name: "Members admin" })).toBeVisible({ timeout: 30_000 });

  const memberCtx = await browser.newContext();
  const member = await memberCtx.newPage();
  const memberName = `John Smith ${Date.now().toString(36)}`;
  const memberEmail = await signUp(member, "john", { approve: false, name: memberName });
  await expect(member.getByRole("heading", { name: "You're on the Treidify Waitlist" })).toBeVisible();
  await member.goto("/app/settings/members");
  await expect(member).toHaveURL(/\/waitlist/);

  // Owner: the registration is in Pending Approval, with the plan they chose.
  await owner.goto(`/app/settings/members?tab=pending&q=${encodeURIComponent(memberName)}`);
  const row = owner.getByTestId("members-table").getByRole("row", { name: new RegExp(memberName) });
  await expect(row).toContainText("Premium");
  await expect(row).toContainText("Pending");
  await expect(row).toContainText("Not provided");
  await row.getByRole("link", { name: "Manage" }).click();

  // Approve → Complimentary Premium → 3 days → Confirm.
  const panel = owner.getByTestId("member-panel");
  await expect(panel).toBeVisible();
  await panel.getByRole("radio", { name: "Complimentary Premium" }).click();
  await panel.getByRole("radio", { name: "3 days" }).click();
  await panel.getByRole("button", { name: "Approve", exact: true }).click();
  await expect(panel.getByRole("alertdialog")).toContainText("for 3 days");
  await panel.getByRole("button", { name: "Confirm" }).click();
  await expect(panel.getByTestId("member-state")).toHaveText("Active", { timeout: 20_000 });
  await expect(panel.getByTestId("member-remaining")).toHaveText(/^2 days 23 h left$/);
  await expect(panel.getByTestId("member-history")).toContainText("Approved and granted access");
  // No email provider in CI: recorded honestly as not configured.
  await expect(panel).toContainText("Not configured");

  // Member: now inside, with Premium features.
  await member.goto("/app");
  await expect(member).toHaveURL(/\/app$/);
  await member.goto("/app/coach");
  await expect(member.getByRole("heading", { level: 1, name: "AI Coach" })).toBeVisible();
  await member.goto("/app/settings/plan");
  await expect(member.getByRole("main").getByText(/Complimentary access from Treidify until/)).toBeVisible();
  // An approved ordinary member still cannot open the admin panel.
  await member.goto("/app/settings/members");
  await expect(member).toHaveURL(/\/app$/);
  await expect(member.getByRole("link", { name: "Members (Admin Panel)" })).toHaveCount(0);

  // Owner: extend by 7 days.
  await panel.getByRole("radio", { name: "7 days" }).last().click();
  await panel.getByRole("button", { name: "Extend", exact: true }).click();
  await panel.getByRole("button", { name: "Confirm" }).click();
  await expect(panel.getByTestId("member-remaining")).toHaveText(/^9 days 23 h left$/, { timeout: 20_000 });

  // Member sends feedback; owner sees it.
  await member.goto("/app/settings/feedback");
  await member.getByRole("radio", { name: /Bug report/ }).click();
  const msg = `The gold chart froze after switching to 1H (${Date.now()})`;
  await member.getByLabel("Message").fill(msg);
  await member.getByRole("button", { name: "Send feedback" }).click();
  await expect(member.getByText("Thank you. Your feedback was sent")).toBeVisible();
  await owner.goto("/app/settings/members?tab=feedback");
  const item = owner.getByTestId("feedback-item").filter({ hasText: msg });
  await expect(item).toContainText(memberName);
  await expect(item).toContainText("Bug report");
  await item.getByRole("combobox", { name: "Feedback status" }).selectOption("reviewing");
  await expect(owner.getByText("Marked reviewing.")).toBeVisible();

  // Owner: activity log records who did what.
  await owner.goto("/app/settings/members?tab=activity");
  await expect(owner.getByTestId("activity-log")).toContainText("Extended access");
  await expect(owner.getByTestId("activity-log")).toContainText("by Olivia Owner");

  // Owner suspends; the member is out on the next request and sees the suspended screen after signing in.
  await owner.goto(`/app/settings/members?tab=active&q=${encodeURIComponent(memberName)}`);
  await owner.getByTestId("members-table").getByRole("link", { name: "Manage" }).click();
  await panel.getByRole("button", { name: "Suspend" }).click();
  await panel.getByRole("button", { name: "Confirm" }).click();
  await expect(panel.getByTestId("member-state")).toHaveText("Suspended", { timeout: 20_000 });
  await member.goto("/app");
  await expect(member).not.toHaveURL(/\/app$/);
  const res = await member.request.get("/api/market/candles?symbol=XAUUSD&tf=1H");
  expect([401, 403]).toContain(res.status());

  // The panel on a phone: cards instead of the table, tabs scroll.
  await owner.setViewportSize({ width: 390, height: 844 });
  await owner.goto(`/app/settings/members?tab=all&q=${encodeURIComponent(memberName)}`);
  await expect(owner.getByTestId("members-cards")).toBeVisible();
  await expect(owner.getByTestId("members-cards")).toContainText("Suspended");
  await expect(owner.getByTestId("members-table")).toBeHidden();
  void memberEmail;
  await ownerCtx.close();
  await memberCtx.close();
});
