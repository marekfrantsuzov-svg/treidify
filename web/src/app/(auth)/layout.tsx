import Link from "next/link";
import { Wordmark } from "@/components/ui/wordmark";
import { ThemeToggle } from "@/components/ui/theme-toggle";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="flex items-center justify-between px-5 py-5 sm:px-8">
        <Wordmark />
        <ThemeToggle />
      </header>
      <main id="main" className="grid flex-1 place-items-center px-4 py-8">
        <div className="rise w-full max-w-[440px]">{children}</div>
      </main>
      <footer className="flex flex-wrap justify-center gap-4 px-4 py-6 text-xs text-ink-3">
        <Link href="/legal/terms" className="hover:text-ink">Terms</Link>
        <Link href="/legal/privacy" className="hover:text-ink">Privacy</Link>
        <Link href="/legal/risk-disclosure" className="hover:text-ink">Risk Disclosure</Link>
        <Link href="/help" className="hover:text-ink">Help</Link>
      </footer>
    </div>
  );
}
