"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";
import { SlidingPill } from "@/components/ui/sliding-pill";

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
    <nav aria-label="Settings" className="inset relative mb-5 flex max-w-full gap-1 overflow-x-auto rounded-full p-1 [scrollbar-width:none]">
      <SlidingPill watch={path} className="rounded-full bg-[var(--surface-strong)] shadow-[var(--shadow),0_0_0_1px_color-mix(in_oklab,var(--accent)_14%,transparent)]" />
      {settingsNav.map((n) => (
        <Link key={n.href} href={n.href} data-active={path === n.href} aria-current={path === n.href ? "page" : undefined} className={cn("relative z-[1] shrink-0 rounded-full px-4 py-2 text-sm text-ink-2 transition-[color,transform] duration-200 hover:text-ink active:scale-[0.97]", path === n.href && "font-medium text-accent")}>
          {n.label}
        </Link>
      ))}
    </nav>
  );
}
