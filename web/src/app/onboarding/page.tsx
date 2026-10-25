import type { Metadata } from "next";
import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { OnboardingFlow } from "@/components/onboarding/onboarding-flow";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { Wordmark } from "@/components/ui/wordmark";
import { db, schema } from "@/server/db";
import { getPlanState } from "@/server/entitlements";
import { syncProviderConfigured } from "@/server/providers";
import { requireUser } from "@/server/session";

export const metadata: Metadata = { title: "Set up your account", robots: { index: false } };

export default async function Page({ searchParams }: { searchParams: Promise<{ trial?: string }> }) {
  const s = await requireUser("/onboarding");
  const [p] = await db.select().from(schema.profile).where(eq(schema.profile.userId, s.user.id));
  if (p?.onboardedAt) redirect("/app");
  const plan = await getPlanState(s.user.id);
  const { trial } = await searchParams;
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="flex items-center justify-between px-5 py-5 sm:px-8">
        <Wordmark href="/onboarding" />
        <ThemeToggle />
      </header>
      <main id="main" className="grid flex-1 place-items-center px-4 pb-16 pt-4">
        <OnboardingFlow
          initial={{
            step: p?.onboardingStep ?? 0,
            name: s.user.name ?? "",
            username: s.user.displayUsername ?? s.user.username ?? "",
            experience: p?.experience ?? null,
            instruments: p?.instruments ?? [],
            timezone: p?.timezone ?? "UTC",
            prefs: p?.dashboardPrefs ?? { density: "comfortable", defaultTimeframe: "4H", showSessions: true, startPage: "dashboard" },
            trialAvailable: plan.trialAvailable,
            wantsTrial: trial === "1",
            syncAvailable: syncProviderConfigured(),
          }}
        />
      </main>
    </div>
  );
}
