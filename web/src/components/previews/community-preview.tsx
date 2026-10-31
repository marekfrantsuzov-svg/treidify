import { BadgeCheck, Bookmark, Crown, Heart, Lock, MessageCircle, ShieldCheck, Users } from "lucide-react";
import { Glass } from "@/components/ui/glass";
import { Pill } from "@/components/ui/pill";
import { cn } from "@/lib/cn";

export const ROOMS = [
  { id: "general", name: "General community", rule: "Open to Treidify members", Icon: Users, tone: "accent" as const },
  { id: "pro", name: "Verified Pro Trader Room", rule: "≥ $10,000 verified net realized profit in each of the last 3 completed months", Icon: ShieldCheck, tone: "up" as const },
  { id: "whale", name: "Whale Room", rule: "≥ $50,000 verified net realized profit in each of the last 3 completed months", Icon: Crown, tone: "warn" as const },
];

export function CommunityPreview({ className }: { className?: string }) {
  return (
    <div className={cn("grid gap-3", className)}>
      <div className="grid gap-2 sm:grid-cols-3">
        {ROOMS.map(({ id, name, rule, Icon, tone }) => (
          <Glass key={id} className="p-4">
            <div className="flex items-center justify-between">
              <span className={cn("grid h-9 w-9 place-items-center rounded-full", tone === "warn" ? "bg-warn-soft text-warn" : tone === "up" ? "bg-up-soft text-up" : "bg-accent-soft text-accent")}>
                <Icon className="h-4.5 w-4.5" />
              </span>
              {id !== "general" && <Lock className="h-4 w-4 text-ink-3" aria-label="Verification required" />}
            </div>
            <div className="mt-3 text-sm font-semibold text-ink">{name}</div>
            <div className="mt-1 text-xs leading-relaxed text-ink-3">{rule}</div>
          </Glass>
        ))}
      </div>
      <Glass className="p-4 sm:p-5">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-full bg-[linear-gradient(135deg,var(--accent-2),var(--accent))] text-sm font-bold text-white">MR</span>
            <div>
              <div className="flex items-center gap-1.5 text-sm font-semibold text-ink">@example_trader <BadgeCheck className="h-4 w-4 text-accent" aria-label="Verified account" /></div>
              <div className="text-xs text-ink-3">Verified Pro · XAUUSD · 2h ago</div>
            </div>
          </div>
          <Pill tone="warn" className="uppercase">Example post</Pill>
        </div>
        <p className="mt-3 text-[14px] leading-relaxed text-ink">
          Gold swept the Asian low into the 1H demand area and displaced back above it. I am waiting for a 5M retest before considering longs; a 1H close below the zone ends the idea.
        </p>
        <div className="mt-3 flex items-center gap-5 text-xs text-ink-3">
          <span className="flex items-center gap-1"><Heart className="h-4 w-4" /> React</span>
          <span className="flex items-center gap-1"><MessageCircle className="h-4 w-4" /> Reply</span>
          <span className="flex items-center gap-1"><Bookmark className="h-4 w-4" /> Save</span>
          <span className="ml-auto">Educational analysis · not a signal</span>
        </div>
      </Glass>
    </div>
  );
}
