"use client";

import { cn } from "@/lib/cn";
import { Glass } from "@/components/ui/glass";

export function Section({ title, description, children, className }: { title: string; description?: React.ReactNode; children: React.ReactNode; className?: string }) {
  return (
    <Glass as="section" className={cn("p-5 sm:p-6", className)}>
      <h2 className="text-[17px] font-semibold tracking-[-0.01em] text-ink">{title}</h2>
      {description && <p className="mt-1 text-sm text-ink-2">{description}</p>}
      <div className="mt-5">{children}</div>
    </Glass>
  );
}

export function Toggle({ checked, onChange, label, note, disabled }: { checked: boolean; onChange: (v: boolean) => void; label: string; note?: string; disabled?: boolean }) {
  return (
    <label className={cn("flex cursor-pointer items-start justify-between gap-4 py-3", disabled && "cursor-not-allowed opacity-50")}>
      <span className="min-w-0">
        <span className="block text-[15px] text-ink">{label}</span>
        {note && <span className="block text-[13px] text-ink-3">{note}</span>}
      </span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={cn("relative mt-0.5 h-7 w-12 shrink-0 rounded-full border border-[var(--border-strong)] bg-inset transition-colors", checked && "border-accent bg-accent")}
      >
        <span className={cn("absolute left-0.5 top-0.5 h-[22px] w-[22px] rounded-full bg-white shadow transition-transform duration-200 ease-[var(--ease-spring)]", checked && "translate-x-5")} />
      </button>
    </label>
  );
}
