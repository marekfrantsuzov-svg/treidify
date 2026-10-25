import type { Metadata } from "next";
import { and, count, eq, isNull } from "drizzle-orm";
import { AppShell } from "@/components/app/app-shell";
import { listAccounts } from "@/server/account-data";
import { db, schema } from "@/server/db";
import { getPlanState } from "@/server/entitlements";
import { requireOnboarded } from "@/server/session";

export const metadata: Metadata = { title: { default: "Dashboard", template: "%s · Treidify" }, robots: { index: false } };

function greetingFor(tz: string) {
  const h = Number(new Intl.DateTimeFormat("en-US", { timeZone: tz, hour: "numeric", hourCycle: "h23" }).format(new Date()));
  return h < 5 ? "Good evening" : h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening";
}

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const s = await requireOnboarded("/app");
  const [plan, accounts, [{ n } = { n: 0 }]] = await Promise.all([
    getPlanState(s.user.id),
    listAccounts(s.user.id),
    db.select({ n: count() }).from(schema.notification).where(and(eq(schema.notification.userId, s.user.id), isNull(schema.notification.readAt))),
  ]);
  return (
    <AppShell
      user={{ name: s.user.name, username: s.user.displayUsername ?? s.user.username ?? null, email: s.user.email, avatar: s.profile.avatar, isAdmin: s.user.role === "admin" }}
      plan={{ plan: plan.plan, source: plan.source, trialEndsAt: plan.trialEndsAt?.toISOString() ?? null }}
      account={accounts[0] ? { label: accounts[0].label, status: accounts[0].status, sample: accounts[0].source === "sample" } : null}
      timezone={s.profile.timezone}
      greeting={greetingFor(s.profile.timezone)}
      unread={n}
    >
      {children}
    </AppShell>
  );
}
