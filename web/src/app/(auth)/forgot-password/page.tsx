import type { Metadata } from "next";
import Link from "next/link";
import { AuthCard } from "@/components/auth/auth-ui";
import { ForgotForm } from "@/components/auth/password-reset";

export const metadata: Metadata = { title: "Reset your password", robots: { index: false } };

export default function Page() {
  return (
    <AuthCard title="Reset your password" subtitle="We will email you a secure link." footer={<Link href="/login" className="text-accent hover:underline">Back to sign in</Link>}>
      <ForgotForm />
    </AuthCard>
  );
}
