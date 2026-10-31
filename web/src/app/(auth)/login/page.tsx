import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AuthCard, Alert } from "@/components/auth/auth-ui";
import { LoginForm } from "@/components/auth/login-form";
import { enabledProviders } from "@/server/auth";
import { getSession } from "@/server/session";

export const metadata: Metadata = { title: "Sign in", robots: { index: false } };

export default async function Page({ searchParams }: { searchParams: Promise<{ next?: string; reset?: string; error?: string }> }) {
  if (await getSession()) redirect("/app");
  const { next, reset, error } = await searchParams;
  return (
    <AuthCard title="Welcome back" subtitle="Sign in to Treidify." footer={<>New to Treidify? <Link href="/signup" className="font-medium text-accent hover:underline">Create a free account</Link></>}>
      {reset && <div className="mb-4"><Alert tone="up">Password updated. Sign in with your new password.</Alert></div>}
      {error && <div className="mb-4"><Alert>{error === "INVALID_TOKEN" ? "That link has expired or was already used." : "Sign-in failed. Please try again."}</Alert></div>}
      <LoginForm providers={enabledProviders} next={next} />
    </AuthCard>
  );
}
