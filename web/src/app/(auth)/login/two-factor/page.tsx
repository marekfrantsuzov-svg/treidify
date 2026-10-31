import type { Metadata } from "next";
import { AuthCard } from "@/components/auth/auth-ui";
import { TwoFactorForm } from "@/components/auth/two-factor-form";

export const metadata: Metadata = { title: "Two-step sign-in", robots: { index: false } };

export default async function Page({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  return (
    <AuthCard title="Two-step sign-in" subtitle="Enter the code from your authenticator app to finish signing in.">
      <TwoFactorForm next={next} />
    </AuthCard>
  );
}
