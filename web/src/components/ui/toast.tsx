"use client";

import { CheckCircle2, Info, TriangleAlert, X } from "lucide-react";
import { useEffect, useState } from "react";
import { cn } from "@/lib/cn";

export interface Toast { id: number; text: string; tone: "info" | "success" | "warn" }
let seq = 0;
const subs = new Set<(t: Toast[]) => void>();
let list: Toast[] = [];
const emit = () => subs.forEach((s) => s(list));

/** Show a short confirmation. Polite live region, auto-dismissed after 3.5s. */
export function toast(text: string, tone: Toast["tone"] = "info") {
  const t = { id: ++seq, text, tone };
  list = [...list.slice(-2), t];
  emit();
  setTimeout(() => { list = list.filter((x) => x.id !== t.id); emit(); }, 3500);
}

const ICON = { info: Info, success: CheckCircle2, warn: TriangleAlert } as const;

export function Toaster() {
  const [items, setItems] = useState<Toast[]>([]);
  useEffect(() => { subs.add(setItems); return () => { subs.delete(setItems); }; }, []);
  return (
    <div aria-live="polite" role="status" className="pointer-events-none fixed inset-x-0 bottom-[calc(84px+env(safe-area-inset-bottom))] z-[70] grid justify-items-center gap-2 px-4 lg:bottom-6 lg:right-6 lg:left-auto lg:justify-items-end">
      {items.map((t) => {
        const I = ICON[t.tone];
        return (
          <div key={t.id} className="glass glass-strong pop-in pointer-events-auto flex max-w-sm items-center gap-2.5 rounded-2xl py-2.5 pl-3.5 pr-2 text-[13.5px] font-medium text-ink shadow-[var(--shadow-lg)]">
            <I className={cn("h-4 w-4 shrink-0", t.tone === "success" ? "text-up" : t.tone === "warn" ? "text-warn" : "text-accent")} />
            <span className="min-w-0 flex-1">{t.text}</span>
            <button onClick={() => { list = list.filter((x) => x.id !== t.id); emit(); }} aria-label="Dismiss" className="grid h-7 w-7 place-items-center rounded-full text-ink-3 hover:text-ink"><X className="h-3.5 w-3.5" /></button>
          </div>
        );
      })}
    </div>
  );
}
