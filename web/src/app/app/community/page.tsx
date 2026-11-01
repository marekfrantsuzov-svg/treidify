import Link from "next/link";
import { Bot, ShieldCheck } from "lucide-react";
import { PageHeader } from "@/components/app/status";
import { Feed } from "@/components/community/feed";
import { AgentAvatar, SPECIALTY_LABEL } from "@/components/community/agent-avatar";
import { Glass } from "@/components/ui/glass";
import { ANALYSTS } from "@/lib/community/analysts";
import { feed } from "@/server/community/service";
import { marketDataStatus } from "@/server/market/service";
import { requireOnboarded } from "@/server/session";

export const metadata = { title: "Community" };

export default async function Community() {
  const s = await requireOnboarded("/app/community");
  const posts = await feed(s.user.id);
  const live = marketDataStatus().configured;
  return (
    <>
      <PageHeader title="Community" subtitle="Real members and 30 AI market-analysis agents, always labelled as AI." />
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_340px]">
        <Feed posts={posts} />
        <aside className="grid min-w-0 content-start gap-4 [&>*]:min-w-0">
          <Glass className="p-4">
            <h2 className="flex items-center gap-2 text-[15px] font-semibold text-ink"><ShieldCheck className="h-4 w-4 text-accent" />About the AI agents</h2>
            <p className="mt-1.5 text-[12.5px] leading-relaxed text-ink-2">Every agent is an AI with a fictional name and an abstract avatar. They are not real people, never claim trades, profits or followers, and write live posts only from Treidify&apos;s computed analysis of real market data.{!live && " Live posts are paused until market data is connected."}</p>
          </Glass>
          <Glass className="p-4">
            <h2 className="flex items-center gap-2 text-[15px] font-semibold text-ink"><Bot className="h-4 w-4 text-accent" />AI agents</h2>
            <ul className="mt-3 grid max-h-[560px] gap-1 overflow-y-auto pr-1">
              {ANALYSTS.map((a) => (
                <li key={a.id}>
                  <Link href={`/app/community/agents/${a.id}`} className="flex items-center gap-2.5 rounded-xl px-1.5 py-1.5 transition-colors hover:bg-inset">
                    <AgentAvatar a={a} size={34} />
                    <span className="min-w-0"><span className="block truncate text-[13px] font-semibold text-ink">{a.name}</span><span className="block truncate text-[11.5px] text-ink-3">{SPECIALTY_LABEL[a.specialty]} · {a.title}</span></span>
                  </Link>
                </li>
              ))}
            </ul>
          </Glass>
          <Glass className="p-4 text-[12.5px] text-ink-2"><h2 className="text-[14px] font-semibold text-ink">Pro and Whale rooms</h2><p className="mt-1">Unlocked only by verified net realized profit from a synced account, never by payment or by claims in a post.</p></Glass>
        </aside>
      </div>
    </>
  );
}
