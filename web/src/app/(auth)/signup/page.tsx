import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AuthCard } from "@/components/auth/auth-ui";
import { SignupForm } from "@/components/auth/signup-form";
import { enabledProviders } from "@/server/auth";
import { getSession } from "@/server/session";

export const metadata: Metadata = { title: "Create your account", robots: { index: false } };

export default async function Page({ searchParams }: { searchParams: Promise<{ plan?: string }> }) {
  if (await getSession()) redirect("/app");
  const { plan } = await searchParams;
  return (
    <AuthCard
      title="Create your account"
      subtitle="Then answer a few short questions to request your place. Treidify is opening to members in stages."
      footer={<>Already have an account? <Link href="/login" className="font-medium text-accent hover:underline">Sign in</Link></>}
    >
      <SignupForm providers={enabledProviders} plan={plan === "essential" || plan === "premium" ? plan : null} />
    </AuthCard>
  );
}
