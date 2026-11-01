"use client";

import { X } from "lucide-react";
import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/cn";

/** Glass modal: focus-trapped enough for our use (focus moves in, Escape and scrim close, focus returns). */
export function Modal({ open, onClose, title, subtitle, children, className }: { open: boolean; onClose: () => void; title: string; subtitle?: React.ReactNode; children: React.ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const prev = document.activeElement as HTMLElement | null;
    ref.current?.focus();
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    const overflow = document.body.style.overflow; document.body.style.overflow = "hidden";
    return () => { document.removeEventListener("keydown", onKey); document.body.style.overflow = overflow; prev?.focus?.(); };
  }, [open, onClose]);
  if (!open || typeof document === "undefined") return null;
  return createPortal(
    <div className="scrim-in fixed inset-0 z-[70] grid place-items-end bg-[rgba(14,8,32,0.36)] backdrop-blur-[6px] sm:place-items-center sm:p-6" onMouseDown={onClose}>
      <div ref={ref} tabIndex={-1} role="dialog" aria-modal="true" aria-label={title} onMouseDown={(e) => e.stopPropagation()}
        className={cn("glass glass-strong sheet-in relative max-h-[88dvh] w-full overflow-y-auto rounded-t-[32px] p-5 outline-none shadow-[var(--shadow-lg)] sm:max-w-xl sm:rounded-[32px] sm:p-7", className)}>
        <div className="mb-4 flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h2 className="text-[19px] font-semibold tracking-[-0.02em] text-ink">{title}</h2>
            {subtitle && <div className="mt-0.5 text-[13px] text-ink-3">{subtitle}</div>}
          </div>
          <button onClick={onClose} aria-label="Close" className="glass press grid h-9 w-9 shrink-0 place-items-center rounded-full text-ink-2 hover:text-ink"><X className="h-4 w-4" /></button>
        </div>
        {children}
      </div>
    </div>,
    document.body,
  );
}
