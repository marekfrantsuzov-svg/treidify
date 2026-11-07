import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AuthCard } from "@/components/auth/auth-ui";
import { SignupForm } from "@/components/auth/signup-form";
import { enabledProviders } from "@/server/auth";
import { getSession } from "@/server/session";

export const metadata: Metadata = { title: "Create your account", robots: { index: false } };

export default async function Page({ searchParams }: { searchParams: Promise<{ trial?: string }> }) {
  if (await getSession()) redirect("/app");
  const { trial } = await searchParams;
  return (
    <AuthCard
      title="Create your account"
      subtitle={trial ? "Then choose Essential or Premium and start your 3-day trial." : "Then choose a plan and start your 3-day trial."}
      footer={<>Already have an account? <Link href="/login" className="font-medium text-accent hover:underline">Sign in</Link></>}
    >
      <SignupForm providers={enabledProviders} trial={trial === "1"} />
    </AuthCard>
  );
}
