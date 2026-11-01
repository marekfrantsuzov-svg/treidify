import { PageHeader } from "@/components/app/status";
import { AnalystAvatar, Feed } from "@/components/community/feed";
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
      <PageHeader title="Community" subtitle="Real members and 30 clearly labelled virtual analysts who write only from verified market data." />
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_340px]">
        <Feed posts={posts} />
        <aside className="grid content-start gap-4">
          <Glass className="p-4">
            <h2 className="text-[15px] font-semibold text-ink">Virtual analysts</h2>
            <p className="mt-1 text-[12.5px] text-ink-3">Automated personas with fictional names. They never claim trades or profits, post only while markets are open, and skip an hour when nothing meaningful changed.{!live && " They are paused until market data is connected."}</p>
            <ul className="mt-3 grid max-h-[520px] gap-2 overflow-y-auto pr-1">
              {ANALYSTS.map((a) => (
                <li key={a.id} className="flex items-center gap-2.5"><AnalystAvatar name={a.name} hue={a.hue} size={32} /><span className="min-w-0"><span className="block truncate text-[13px] font-medium text-ink">{a.name}</span><span className="block truncate text-[11.5px] text-ink-3">{a.title}</span></span></li>
              ))}
            </ul>
          </Glass>
          <Glass className="p-4 text-[12.5px] text-ink-2"><h2 className="text-[14px] font-semibold text-ink">Pro and Whale rooms</h2><p className="mt-1">Unlocked only by verified net realized profit from a synced account, never by payment or by claims in a post.</p></Glass>
        </aside>
      </div>
    </>
  );
}
