"use client";

import { useEffect, useState } from "react";
import { marketLine } from "@/components/app/app-shell";

/** Phone greeting (reference 1 mobile). On desktop the greeting sits in the header instead. */
export function MobileGreeting({ greeting, name }: { greeting: string; name: string }) {
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => { setNow(new Date()); const id = setInterval(() => setNow(new Date()), 60_000); return () => clearInterval(id); }, []);
  return (
    <header className="mb-3.5 px-0.5 pt-1 lg:hidden">
      <h1 className="t-title text-ink">{greeting}, {name} <span aria-hidden>👋</span></h1>
      <p className="mt-0.5 text-[13.5px] leading-snug text-ink-2" suppressHydrationWarning>{now ? marketLine(now) : " "}</p>
    </header>
  );
}
