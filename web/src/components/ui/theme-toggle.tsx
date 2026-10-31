"use client";

import { Monitor, Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { cn } from "@/lib/cn";
import { SlidingPill } from "@/components/ui/sliding-pill";

const options = [
  { id: "light", label: "Light", Icon: Sun },
  { id: "dark", label: "Dark", Icon: Moon },
  { id: "system", label: "System", Icon: Monitor },
] as const;

export function ThemeToggle({ className }: { className?: string }) {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return (
    <div role="radiogroup" aria-label="Theme" className={cn("inset relative inline-flex rounded-full p-0.5", className)}>
      <SlidingPill watch={mounted ? theme : null} className="rounded-full bg-[var(--surface-strong)] shadow-[var(--shadow),0_0_0_1px_color-mix(in_oklab,var(--accent)_14%,transparent)]" />
      {options.map(({ id, label, Icon }) => {
        const active = mounted && theme === id;
        return (
          <button
            key={id}
            role="radio"
            aria-checked={active}
            aria-label={label}
            title={label}
            onClick={() => setTheme(id)}
            data-active={active}
            className={cn("relative z-[1] grid h-7 w-7 place-items-center rounded-full text-ink-3 transition-[color,transform] duration-200 hover:text-ink active:scale-90", active && "text-accent")}
          >
            <Icon className="h-3.5 w-3.5" />
          </button>
        );
      })}
    </div>
  );
}
