"use client";

import { usePathname } from "next/navigation";
import { PageHeader } from "@/components/app/status";

/**
 * Shown the moment a section is clicked, while its data loads. The section's own title, icon and description appear
 * at once (they never depend on data), with placeholders shaped like that section's content, so nothing jumps when
 * the content arrives. The dashboard keeps its own grid-shaped placeholder.
 */
const HEAD: Record<string, { title: string; subtitle?: string }> = {
  "/app/markets": { title: "Markets", subtitle: "Your Macro Desk markets, or any supported instrument, with zones, Fibonacci, liquidity, structure and volume computed for the timeframe on screen." },
  "/app/intelligence": { title: "Market Intelligence", subtitle: "Gold bias, timeframe alignment and setup status first. Every number below is computed and explained." },
  "/app/macro": { title: "Macro Desk", subtitle: "Your three markets: direction, the levels that matter, and what would change the view. Tap a market's name to change it." },
  "/app/news": { title: "News & Calendar", subtitle: "Real headlines with source, time and link; official release schedule with actual and previous values." },
  "/app/journal": { title: "Trading Journal" },
  "/app/performance": { title: "Performance" },
  "/app/coach": { title: "AI Coach" },
  "/app/community": { title: "Community", subtitle: "Real members and 30 AI market-analysis agents, always labelled as AI." },
  "/app/accounts": { title: "Account connections", subtitle: "Your MetaTrader accounts, their sync status and when they last updated." },
  "/app/ai-analysis": { title: "AI Chart Analysis", subtitle: "Upload a screenshot. Treidify reads only what the chart shows." },
  "/app/notifications": { title: "Notifications", subtitle: "Sync status, alerts, community and account notices." },
};

const Block = ({ h, className = "" }: { h: number; className?: string }) => <div className={`skeleton rounded-[24px] ${className}`} style={{ height: h }} />;

function Body({ path }: { path: string }) {
  if (path === "/app/markets") return <div className="grid gap-4 xl:grid-cols-[1fr_340px]"><Block h={560} /><Block h={560} className="max-xl:hidden" /></div>;
  if (path === "/app/journal" || path === "/app/performance" || path === "/app/coach")
    return (
      <div className="grid gap-4">
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">{[0, 1, 2, 3, 4, 5].map((i) => <Block key={i} h={96} />)}</div>
        <div className="grid gap-4 lg:grid-cols-2"><Block h={300} /><Block h={300} /></div>
      </div>
    );
  if (path === "/app/community" || path === "/app/news")
    return <div className="grid gap-4 lg:grid-cols-[1fr_320px]"><div className="grid gap-4"><Block h={120} /><Block h={260} /><Block h={260} /></div><Block h={420} className="max-lg:hidden" /></div>;
  return <div className="grid gap-4"><div className="grid gap-4 md:grid-cols-3"><Block h={150} /><Block h={150} /><Block h={150} /></div><Block h={380} /></div>;
}

function DashboardSkeleton() {
  return (
    <div className="grid gap-4">
      <div className="flex gap-4 overflow-hidden lg:hidden">
        {[0, 1, 2, 3, 4].map((i) => <div key={i} className="skeleton h-[54px] w-[54px] shrink-0 rounded-[16px]" />)}
      </div>
      <div className="skeleton h-4 w-48 rounded-full" />
      <div className="skeleton h-56 rounded-[24px]" />
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        {[0, 1, 2, 3].map((i) => <div key={i} className="skeleton h-[112px] rounded-[24px]" />)}
      </div>
      <div className="grid gap-4 xl:grid-cols-3">
        {[0, 1, 2].map((i) => <div key={i} className="skeleton h-60 rounded-[24px]" />)}
      </div>
    </div>
  );
}

export default function Loading() {
  const path = usePathname();
  const head = HEAD[path];
  return (
    <div aria-busy="true" aria-label="Loading">
      {path === "/app" ? <DashboardSkeleton /> : head ? (
        <>
          <PageHeader title={head.title} subtitle={head.subtitle ?? <span className="skeleton mt-1 inline-block h-4 w-64 max-w-full rounded-full align-middle" />} />
          <Body path={path} />
        </>
      ) : <Body path={path} />}
    </div>
  );
}
