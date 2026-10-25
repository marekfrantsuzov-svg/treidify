import Link from "next/link";
import { AuthCard } from "@/components/auth/auth-ui";

export const metadata = { title: "Account deleted", robots: { index: false } };

export default function Goodbye() {
  return (
    <AuthCard title="Your account has been deleted" subtitle="Your profile, synced trading data, journal and community content have been removed.">
      <p className="text-sm text-ink-2">Thank you for trying Treidify. You can create a new account at any time.</p>
      <Link href="/" className="mt-5 inline-block text-sm font-medium text-accent hover:underline">Back to the home page</Link>
    </AuthCard>
  );
}
