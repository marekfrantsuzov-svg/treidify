"use client";

import { useEffect, useRef, useState } from "react";
import { CircleCheck } from "lucide-react";
import { cn } from "@/lib/cn";
import { Laptop, Shot, type ShotName } from "./shot";

const ITEMS: { shot: ShotName; kicker: string; title: string; body: string; points: string[]; alt: string }[] = [
  { shot: "macro", kicker: "Gold, DXY and Silver", title: "Three markets, one clear read.", body: "Bias, structure on 4H, 1H, 15M and 5M, momentum and liquidity for each market, with how the dollar and silver relate to gold right now.", points: ["Timeframe pills show agreement at a glance", "DXY link measured, never assumed", "Silver confirms or diverges from gold"], alt: "Macro Desk market cards for Gold, DXY and Silver with timeframe pills, structure, momentum and liquidity." },
  { shot: "zones", kicker: "Key buy and sell zones", title: "Zones with a reason and a limit.", body: "Every zone says why it exists, which Fibonacci and liquidity sit inside it, what confirms it and what invalidates it.", points: ["Stop placed at structural invalidation", "XAUUSD stops over 50 pips mean WAIT", "The stop is never tightened to fit"], alt: "Key zone card for XAUUSD showing the zone range, a stop meter at 647 of 50 pips and WAIT." },
  { shot: "health", kicker: "Automated performance tracking", title: "Your MT5 account, measured.", body: "Connect read-only. Treidify syncs your history and computes P&L, win rate, profit factor, drawdown and an account health score from your own trades.", points: ["Deposits are never counted as profit", "Session, weekday and instrument breakdowns", "Equity curve and drawdown from peak"], alt: "Performance page with equity curve, drawdown and monthly profit, shown with a sample account." },
  { shot: "coach", kicker: "AI trading coach", title: "Coaching from evidence, not guesses.", body: "The coach finds measurable patterns in your synced trades, like rule breaks, session costs and size after losses, and shows the sample behind each one.", points: ["Weekly reviews with a clear next step", "Every insight links to its evidence", "It never invents emotions or results"], alt: "AI Coach weekly review listing rulebook exceptions and session performance." },
];

/** Scroll-driven product tour: text on the left, the matching real screen crossfades in a sticky laptop on the right. */
export function Showcase({ syncLive, marketLive }: { syncLive: boolean; marketLive: boolean }) {
  const [active, setActive] = useState(0);
  const refs = useRef<(HTMLDivElement | null)[]>([]);
  useEffect(() => {
    const io = new IntersectionObserver((entries) => {
      for (const e of entries) if (e.isIntersecting) setActive(Number((e.target as HTMLElement).dataset.i));
    }, { rootMargin: "-45% 0px -45% 0px" });
    refs.current.forEach((r) => r && io.observe(r));
    return () => io.disconnect();
  }, []);
  return (
    <div className="grid gap-10 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] lg:gap-14">
      <div>
        {ITEMS.map((it, i) => (
          <div key={it.shot} ref={(el) => { refs.current[i] = el; }} data-i={i} className={cn("tour-step", active === i && "is-active")}>
            <p className="text-[13px] font-semibold uppercase tracking-[0.14em] text-accent">{it.kicker}</p>
            <h3 className="mt-3 text-[28px] font-semibold leading-[1.1] tracking-[-0.03em] text-ink sm:text-[34px]">{it.title}</h3>
            <p className="mt-3 text-[16px] leading-relaxed text-ink-2">{it.body}</p>
            {((it.shot === "health" || it.shot === "coach") && !syncLive) || ((it.shot === "macro" || it.shot === "zones") && !marketLive) ? <p className="mt-3 text-[13px] font-medium text-ink-3">{it.shot === "health" || it.shot === "coach" ? "MT5 sync opening soon. Try it now with a labelled demo account." : "Live market data coming soon. Shown here on labelled sample data."}</p> : null}
            <ul className="mt-4 grid gap-2">{it.points.map((p) => <li key={p} className="flex items-start gap-2 text-[15px] text-ink"><CircleCheck className="mt-0.5 h-[18px] w-[18px] shrink-0 text-accent" />{p}</li>)}</ul>
            <div className="mt-6 lg:hidden"><Laptop><Shot name={it.shot} alt={it.alt} /></Laptop></div>
          </div>
        ))}
      </div>
      <div className="hidden lg:block">
        <div className="sticky top-[14vh]">
          <Laptop>
            <div className="relative">
              {ITEMS.map((it, i) => (
                <div key={it.shot} className={cn("tour-frame", i === 0 ? "relative" : "absolute inset-0", active === i && "is-active")} aria-hidden={active !== i}>
                  <Shot name={it.shot} alt={it.alt} />
                </div>
              ))}
            </div>
          </Laptop>
          <div className="mt-4 flex justify-center gap-1.5" aria-hidden>{ITEMS.map((it, i) => <span key={it.shot} className={cn("tour-dot", active === i && "is-active")} />)}</div>
        </div>
      </div>
    </div>
  );
}
