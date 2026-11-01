"use client";

import { useState } from "react";
import type { IntelSnapshot } from "@/server/market/intelligence";
import { cn } from "@/lib/cn";
import { Glass } from "@/components/ui/glass";
import { SlidingPill } from "@/components/ui/sliding-pill";
import { IntelBubbles } from "./bubbles";
import { IntelChart } from "./intel-chart";
import { biasText } from "./gauge";

const SYMS = [{ id: "XAUUSD", label: "Gold" }, { id: "DXY", label: "DXY" }, { id: "XAGUSD", label: "Silver" }] as const;
type Sym = (typeof SYMS)[number]["id"];

export function ChartWorkspace({ snap, initial }: { snap: IntelSnapshot; initial: Sym }) {
  const [sym, setSym] = useState<Sym>(initial);
  const intel = sym === "XAUUSD" ? snap.gold : sym === "DXY" ? snap.dxy : snap.silver;
  return (
    <Glass className="p-4 sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div role="tablist" aria-label="Instrument" className="inset relative flex rounded-full p-1">
          <SlidingPill watch={sym} className="rounded-full bg-[var(--surface-strong)] shadow-[var(--shadow)]" />
          {SYMS.map((x) => <button key={x.id} role="tab" aria-selected={sym === x.id} data-active={sym === x.id} onClick={() => setSym(x.id)} className={cn("relative z-[1] rounded-full px-4 py-1.5 text-[13px] font-semibold text-ink-3", sym === x.id && "text-ink")}>{x.label}</button>)}
        </div>
        <span className="text-[13px] text-ink-2">{biasText[intel.bias]}{intel.score !== null ? ` · score ${intel.score > 0 ? "+" : ""}${intel.score}` : ""}</span>
      </div>
      <div className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1fr)_340px]">
        <IntelChart key={sym} symbol={sym} intel={intel} sample={snap.mode === "sample"} height={560} initialTf="1H" />
        <IntelBubbles intel={intel} sample={snap.mode === "sample"} className="xl:max-h-[610px] xl:overflow-y-auto xl:pr-1" />
      </div>
    </Glass>
  );
}
