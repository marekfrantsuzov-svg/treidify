import type { Metadata } from "next";
import { AuthCard } from "@/components/auth/auth-ui";
import { ResetForm } from "@/components/auth/password-reset";

export const metadata: Metadata = { title: "Choose a new password", robots: { index: false } };

export default async function Page({ searchParams }: { searchParams: Promise<{ token?: string; error?: string }> }) {
  const { token, error } = await searchParams;
  return (
    <AuthCard title="Choose a new password">
      <ResetForm token={error ? null : (token ?? null)} />
    </AuthCard>
  );
}
