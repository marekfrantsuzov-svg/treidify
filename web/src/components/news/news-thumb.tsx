"use client";

import { Bitcoin, Coins, DollarSign, Globe2, Landmark, LineChart, Newspaper, Percent, Users } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/cn";

const ICON = { "central-banks": Landmark, inflation: Percent, employment: Users, rates: LineChart, geopolitics: Globe2, currencies: DollarSign, commodities: Coins, equities: LineChart, crypto: Bitcoin } as const;

/**
 * Publisher image from the feed, loaded straight from the publisher, with an even rounded frame. If there is no image,
 * or it fails to load (hotlink protection, 404), a branded category tile is shown instead of a broken image.
 */
export function NewsThumb({ src, category, className, priority }: { src: string | null; category?: string; className?: string; priority?: boolean }) {
  const [failed, setFailed] = useState(false);
  const Icon = (category && ICON[category as keyof typeof ICON]) || Newspaper;
  return (
    <span className={cn("news-thumb relative block shrink-0 overflow-hidden rounded-xl bg-[var(--surface-inset)]", className)}>
      {src && !failed ? (
        // eslint-disable-next-line @next/next/no-img-element -- third-party publisher image, not optimisable
        <img src={src} alt="" loading={priority ? "eager" : "lazy"} decoding="async" referrerPolicy="no-referrer" onError={() => setFailed(true)}
          onLoad={(e) => { if ((e.currentTarget.naturalWidth || 0) < 8) setFailed(true); }} className="absolute inset-0 h-full w-full object-cover" />
      ) : (
        <span className="news-thumb-ph absolute inset-0 grid place-items-center" aria-hidden><Icon className="h-[38%] w-[38%] max-h-10 max-w-10 text-accent" strokeWidth={1.6} /></span>
      )}
    </span>
  );
}
