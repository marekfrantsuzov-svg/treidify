"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";

export const settingsNav = [
  { href: "/app/settings/profile", label: "Profile and privacy" },
  { href: "/app/settings/preferences", label: "Preferences" },
  { href: "/app/accounts", label: "Trading accounts" },
  { href: "/app/settings/security", label: "Security" },
  { href: "/app/settings/plan", label: "Plan" },
] as const;

export function SettingsNav() {
  const path = usePathname();
  return (
    <nav aria-label="Settings" className="inset mb-5 flex max-w-full gap-1 overflow-x-auto rounded-full p-1 [scrollbar-width:none]">
      {settingsNav.map((n) => (
        <Link key={n.href} href={n.href} aria-current={path === n.href ? "page" : undefined} className={cn("shrink-0 rounded-full px-4 py-2 text-sm text-ink-2 transition-colors hover:text-ink", path === n.href && "bg-surface-strong font-medium text-ink shadow-sm")}>
          {n.label}
        </Link>
      ))}
    </nav>
  );
}
