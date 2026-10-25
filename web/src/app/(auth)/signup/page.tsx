import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AuthCard } from "@/components/auth/auth-ui";
import { SignupForm } from "@/components/auth/signup-form";
import { enabledProviders } from "@/server/auth";
import { getSession } from "@/server/session";

export const metadata: Metadata = { title: "Create your free account", robots: { index: false } };

export default async function Page({ searchParams }: { searchParams: Promise<{ trial?: string }> }) {
  if (await getSession()) redirect("/app");
  const { trial } = await searchParams;
  return (
    <AuthCard
      title="Create your free account"
      subtitle={trial ? "Then start your 72-hour Premium trial. No card, no automatic billing." : "Free forever. Upgrade only if you want to."}
      footer={<>Already have an account? <Link href="/login" className="font-medium text-accent hover:underline">Sign in</Link></>}
    >
      <SignupForm providers={enabledProviders} trial={trial === "1"} />
    </AuthCard>
  );
}
