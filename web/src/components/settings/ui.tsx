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
        className={cn("group relative mt-0.5 h-7 w-12 shrink-0 rounded-full border border-[var(--border-strong)] bg-inset transition-[background,border-color,box-shadow] duration-300 ease-[var(--ease-out-3)] hover:border-[color-mix(in_oklab,var(--accent)_35%,var(--border-strong))] disabled:cursor-not-allowed", checked && "bg-brand border-transparent shadow-[0_4px_14px_-4px_var(--accent-glow)]")}
      >
        {/* The knob stretches while pressed and springs across, like the reference toggles. */}
        <span className={cn("absolute left-0.5 top-0.5 h-[22px] w-[22px] rounded-full bg-white shadow-[0_2px_6px_rgba(20,10,50,0.25)] transition-[transform,width] duration-300 ease-[var(--ease-spring)] group-active:w-[27px]", checked && "translate-x-5 group-active:translate-x-[15px]")} />
      </button>
    </label>
  );
}
