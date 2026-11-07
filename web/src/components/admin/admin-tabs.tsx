"use client";

import Link from "next/link";
import { SlidingPill } from "@/components/ui/sliding-pill";
import { cn } from "@/lib/cn";

const TABS = [
  { id: "overview", label: "Overview" },
  { id: "all", label: "All Members" },
  { id: "pending", label: "Pending Approval" },
  { id: "active", label: "Active Members" },
  { id: "inactive", label: "Expired / Suspended" },
  { id: "feedback", label: "Feedback" },
  { id: "activity", label: "Activity Log" },
] as const;

export function AdminTabs({ active, pending }: { active: string; pending: number }) {
  return (
    <nav aria-label="Members admin" className="inset relative flex max-w-full gap-1 overflow-x-auto rounded-full p-1 [scrollbar-width:none]">
      <SlidingPill watch={active} className="rounded-full bg-[var(--surface-strong)] shadow-[var(--shadow),0_0_0_1px_color-mix(in_oklab,var(--accent)_14%,transparent)]" />
      {TABS.map((t) => (
        <Link
          key={t.id}
          href={t.id === "overview" ? "/app/settings/members" : `/app/settings/members?tab=${t.id}`}
          data-active={active === t.id}
          aria-current={active === t.id ? "page" : undefined}
          className={cn("relative z-[1] inline-flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-2 text-[13.5px] text-ink-2 transition-[color,transform] duration-200 hover:text-ink active:scale-[0.97]", active === t.id && "font-medium text-accent")}
        >
          {t.label}
          {t.id === "pending" && pending > 0 && <span className="grid h-5 min-w-5 place-items-center rounded-full bg-brand px-1.5 text-[11px] font-semibold text-white">{pending}</span>}
        </Link>
      ))}
    </nav>
  );
}
