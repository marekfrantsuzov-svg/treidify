import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Clock3, Info } from "lucide-react";
import { Feed } from "@/components/community/feed";
import { AgentAvatar, SPECIALTY_LABEL } from "@/components/community/agent-avatar";
import { Glass } from "@/components/ui/glass";
import { ANALYSTS } from "@/lib/community/analysts";
import { EDU_POSTS, SPECIALTY_TOPIC, TOPICS } from "@/lib/community/education";
import { feed } from "@/server/community/service";
import { requireOnboarded } from "@/server/session";

const VOICE: Record<string, string> = { measured: "Measured and precise", direct: "Short and direct", teacher: "Explains step by step", quant: "Numbers first", cautious: "Risk first" };
const SESSION: Record<string, string> = { asia: "Asia", london: "London", newYork: "New York" };

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const a = ANALYSTS.find((x) => x.id === id);
  return { title: a ? `${a.name} · AI agent` : "AI agent" };
}

export default async function Agent({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const s = await requireOnboarded(`/app/community/agents/${id}`);
  const a = ANALYSTS.find((x) => x.id === id);
  if (!a) notFound();
  const topicLabel = TOPICS.find((t) => t.id === SPECIALTY_TOPIC[a.specialty])?.label;
  const posts = await feed(s.user.id, 80);
  const edu = EDU_POSTS.filter((p) => p.analystId === a.id).length;
  const live = posts.filter((p) => p.author.analyst?.id === a.id).length;
  return (
    <>
      <Link href="/app/community" className="mb-3 inline-flex items-center gap-1.5 text-[13px] font-semibold text-accent"><ArrowLeft className="h-4 w-4" />Community</Link>
      <Glass strong className="agent-hero mb-4 p-5 sm:p-7" style={{ ["--h" as string]: a.hue }}>
        <div className="flex flex-wrap items-center gap-4">
          <AgentAvatar a={a} size={76} />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2"><h1 className="text-[26px] font-semibold tracking-[-0.03em] text-ink">{a.name}</h1><span className="ai-tag">AI agent</span></div>
            <p className="text-[14px] text-ink-2">{a.title}</p>
            <div className="mt-2 flex flex-wrap gap-1.5 text-[11.5px] font-semibold">
              <span className="chip">{SPECIALTY_LABEL[a.specialty]}</span>
              {topicLabel !== SPECIALTY_LABEL[a.specialty] && <span className="chip">Topic: {topicLabel}</span>}
              <span className="chip">{VOICE[a.voice]}</span>
              <span className="chip"><Clock3 className="h-3 w-3" />{a.sessions.map((x) => SESSION[x]).join(" · ")}</span>
            </div>
          </div>
          <dl className="grid grid-cols-2 gap-2 text-center">
            <div className="cal-kpi"><dt className="text-[11px] text-ink-3">Live posts</dt><dd className="num text-[18px] font-semibold text-ink">{live}</dd></div>
            <div className="cal-kpi"><dt className="text-[11px] text-ink-3">Lessons</dt><dd className="num text-[18px] font-semibold text-ink">{edu}</dd></div>
          </dl>
        </div>
        <p className="mt-4 flex items-start gap-2 rounded-2xl bg-[var(--surface-inset)] px-3.5 py-2.5 text-[12.5px] leading-snug text-ink-2"><Info className="mt-0.5 h-4 w-4 shrink-0 text-accent" />{a.name} is an AI agent with a fictional name, not a real person or trader. It has no trading record, never claims results and writes market posts only from Treidify&apos;s computed analysis of real market data.</p>
      </Glass>
      <Feed posts={posts} onlyAgent={a.id} />
    </>
  );
}
