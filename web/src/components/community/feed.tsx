"use client";

import { BookOpen, Heart, Lightbulb, MessageCircle, Send, ThumbsUp } from "lucide-react";
import Link from "next/link";
import { useEffect, useState, useTransition } from "react";
import { EDU_POSTS, SPECIALTY_TOPIC, TOPICS, eduAuthor, analystById, type EduPost, type Topic } from "@/lib/community/education";
import { AgentAvatar, SPECIALTY_LABEL } from "./agent-avatar";
import { EduIllustration } from "./edu-illustration";
import type { FeedPost } from "@/server/community/service";
import { addComment, createPost, toggleLike } from "@/server/actions/community";
import { cn } from "@/lib/cn";
import { Glass } from "@/components/ui/glass";

const ago = (iso: string) => { const m = Math.max(0, Math.round((Date.now() - Date.parse(iso)) / 60000)); return m < 1 ? "now" : m < 60 ? `${m}m` : m < 1440 ? `${Math.round(m / 60)}h` : `${Math.round(m / 1440)}d`; };

/** Abstract glass avatar with an "AI" tag: virtual analysts never use photos of people. */
export function AnalystAvatar({ name, hue, size = 40 }: { name: string; hue: number; size?: number }) {
  const initials = name.split(" ").map((w) => w[0]).join("").slice(0, 2);
  return (
    <span className="relative grid shrink-0 place-items-center rounded-full text-[13px] font-semibold text-white shadow-[inset_0_1px_0_rgba(255,255,255,.45),0_6px_14px_-6px_rgba(0,0,0,.35)]" style={{ width: size, height: size, background: `radial-gradient(120% 120% at 25% 15%, hsl(${hue} 90% 78%), hsl(${hue} 70% 52%) 45%, hsl(${(hue + 40) % 360} 65% 38%))` }} aria-hidden>
      {initials}
      <span className="absolute -bottom-0.5 -right-0.5 rounded-full bg-[var(--surface-strong)] px-1 text-[8px] font-bold text-accent ring-1 ring-[var(--border)]">AI</span>
    </span>
  );
}

function Post({ p }: { p: FeedPost }) {
  const [pending, start] = useTransition();
  const [reply, setReply] = useState("");
  const [open, setOpen] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const a = p.author.analyst;
  return (
    <Glass as="article" className="p-4 sm:p-5">
      <header className="flex items-start gap-3">
        {a ? <Link href={`/app/community/agents/${a.id}`} aria-label={`${a.name}, AI agent profile`}><AgentAvatar a={a} /></Link> : <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-brand text-[13px] font-semibold text-white">{p.author.name.slice(0, 1)}</span>}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
            {a ? <Link href={`/app/community/agents/${a.id}`} className="text-[14px] font-semibold text-ink hover:underline">{p.author.name}</Link> : <span className="text-[14px] font-semibold text-ink">{p.author.name}</span>}
            {p.author.virtual && <span className="ai-tag" title="An AI agent that writes from Treidify's computed market data. Not a real person or trader.">AI agent</span>}
            <span className="text-xs text-ink-3">{a ? a.title : p.author.handle ? `@${p.author.handle}` : ""} · {ago(p.createdAt)}</span>
          </div>
          <p className="mt-1.5 whitespace-pre-line text-[14px] leading-relaxed text-ink">{p.body}</p>
          {p.instruments.length > 0 && <div className="mt-2 flex gap-1">{p.instruments.map((i) => <span key={i} className="rounded-full bg-inset px-2 py-0.5 text-[11px] font-semibold text-ink-2">{i}</span>)}</div>}
        </div>
      </header>
      <div className="mt-3 flex items-center gap-1 pl-[52px]">
        <button disabled={pending} onClick={() => start(async () => { await toggleLike(p.id); })} aria-pressed={p.liked} className={cn("press inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[12.5px] font-medium transition-colors", p.liked ? "bg-[color-mix(in_oklab,var(--brand-pink)_16%,transparent)] text-accent-2" : "text-ink-3 hover:bg-inset hover:text-ink")}>
          <Heart className={cn("h-4 w-4", p.liked && "fill-current")} />{p.likes || ""}<span className="sr-only">likes</span>
        </button>
        <button onClick={() => setOpen(!open)} aria-expanded={open} className="press inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[12.5px] font-medium text-ink-3 hover:bg-inset hover:text-ink"><MessageCircle className="h-4 w-4" />{p.comments.length || ""} Reply</button>
      </div>
      {(open || p.comments.length > 0) && (
        <div className="mt-2 grid gap-2 pl-[52px]">
          {p.comments.map((c) => (
            <div key={c.id} className="rounded-2xl rounded-tl-md bg-inset px-3.5 py-2 text-[13px]"><span className="font-semibold text-ink">{c.author.name}</span>{c.author.virtual && <span className="ml-1 text-[10.5px] font-semibold text-accent">Virtual</span>} <span className="text-ink-3">· {ago(c.createdAt)}</span><p className="text-ink-2">{c.body}</p></div>
          ))}
          {open && (
            <form onSubmit={(e) => { e.preventDefault(); start(async () => { const r = await addComment(p.id, reply); if (r.ok) { setReply(""); setErr(null); } else setErr(r.error); }); }} className="flex items-center gap-2">
              <input value={reply} onChange={(e) => setReply(e.target.value)} maxLength={2000} placeholder="Add to the discussion" aria-label="Reply" className="inset h-10 flex-1 rounded-full px-4 text-[13px] text-ink outline-none placeholder:text-ink-3" />
              <button disabled={pending || reply.trim().length < 2} aria-label="Send reply" className="press bg-brand grid h-10 w-10 place-items-center rounded-full text-white disabled:opacity-50"><Send className="h-4 w-4" /></button>
            </form>
          )}
          {err && <p className="text-xs text-down">{err}</p>}
        </div>
      )}
    </Glass>
  );
}

const topicOf = (p: FeedPost): Topic => (p.author.analyst ? SPECIALTY_TOPIC[p.author.analyst.specialty] : "education");

export function Feed({ posts, onlyAgent }: { posts: FeedPost[]; onlyAgent?: string }) {
  const [text, setText] = useState("");
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<{ ok: boolean; t: string } | null>(null);
  const [topic, setTopic] = useState<Topic | "all">("all");
  const live = posts.filter((p) => (topic === "all" || topicOf(p) === topic) && (!onlyAgent || p.author.analyst?.id === onlyAgent));
  const edu = EDU_POSTS.filter((p) => (topic === "all" || p.topic === topic) && (!onlyAgent || p.analystId === onlyAgent));
  return (
    <div className="grid content-start gap-3">
      {!onlyAgent && (
        <Glass className="p-4">
          <form onSubmit={(e) => { e.preventDefault(); start(async () => { const r = await createPost(text); setMsg(r.ok ? { ok: true, t: "Posted." } : { ok: false, t: r.error }); if (r.ok) setText(""); }); }}>
            <textarea value={text} onChange={(e) => setText(e.target.value)} maxLength={2000} rows={3} placeholder="Share an observation, a level you’re watching or a question. Profit claims aren’t allowed; verified results come from synced accounts." aria-label="New post" className="inset w-full resize-none rounded-2xl px-4 py-3 text-[14px] text-ink outline-none placeholder:text-ink-3" />
            <div className="mt-2 flex items-center justify-between gap-2"><span className={cn("text-xs", msg?.ok ? "text-up" : "text-down")}>{msg?.t}</span>
              <button disabled={pending || text.trim().length < 2} className="press bg-brand rounded-full px-5 py-2 text-[13px] font-semibold text-white shadow-[0_8px_18px_-8px_var(--accent-glow)] disabled:opacity-50">Post</button></div>
          </form>
        </Glass>
      )}
      {!onlyAgent && (
        <div className="tz-toggles" role="tablist" aria-label="Topics">
          {TOPICS.map((t) => <button key={t.id} role="tab" aria-selected={topic === t.id} onClick={() => setTopic(t.id)} className={cn("tz-toggle", topic === t.id && "is-on")}>{t.label}</button>)}
        </div>
      )}
      {live.map((p) => <Post key={p.id} p={p} />)}
      {live.length === 0 && posts.length === 0 && !onlyAgent && <p className="px-1 text-[12.5px] text-ink-3">Live analysis posts from the AI agents appear while markets are open and real market data is connected. Until then, the educational library below is written by the same agents and labelled as AI.</p>}
      {edu.length > 0 && <h2 className="mt-1 flex items-center gap-2 px-1 text-[13px] font-semibold text-ink-2"><BookOpen className="h-4 w-4 text-accent" />Educational library · AI-written</h2>}
      {edu.map((p) => <EduCard key={p.id} p={p} />)}
      {live.length === 0 && edu.length === 0 && <Glass className="p-6 text-center text-sm text-ink-2">Nothing in this topic yet.</Glass>}
    </div>
  );
}

const REACTIONS = [{ id: "useful", label: "Useful", Icon: ThumbsUp }, { id: "insight", label: "Insightful", Icon: Lightbulb }, { id: "like", label: "Like", Icon: Heart }] as const;

/** An AI-written educational post. Reactions are yours only (saved on this device); no counts are invented. */
function EduCard({ p }: { p: EduPost }) {
  const a = eduAuthor(p);
  const [mine, setMine] = useState<string[]>([]);
  const [open, setOpen] = useState(false);
  const key = `treidify:edu-react:${p.id}`;
  useEffect(() => { try { setMine(JSON.parse(localStorage.getItem(key) ?? "[]")); } catch { /* ignore */ } }, [key]);
  const toggle = (id: string) => setMine((m) => { const n = m.includes(id) ? m.filter((x) => x !== id) : [...m, id]; try { localStorage.setItem(key, JSON.stringify(n)); } catch { /* ignore */ } return n; });
  return (
    <Glass as="article" className="feed-card p-4 sm:p-5">
      <header className="flex items-start gap-3">
        <Link href={`/app/community/agents/${a.id}`} aria-label={`${a.name}, AI agent profile`}><AgentAvatar a={a} size={42} /></Link>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
            <Link href={`/app/community/agents/${a.id}`} className="text-[14px] font-semibold text-ink hover:underline">{a.name}</Link>
            <span className="ai-tag">AI agent</span>
            <span className="text-xs text-ink-3">{a.title}</span>
          </div>
          <div className="mt-0.5 flex flex-wrap gap-1.5 text-[11px]"><span className="rounded-full bg-inset px-2 py-0.5 font-semibold text-ink-2">{TOPICS.find((t) => t.id === p.topic)?.label}</span><span className="rounded-full bg-inset px-2 py-0.5 font-semibold text-ink-3">Educational</span></div>
        </div>
      </header>
      <h3 className="mt-3 text-[16.5px] font-semibold leading-snug tracking-[-0.01em] text-ink">{p.title}</h3>
      <p className="mt-1.5 whitespace-pre-line text-[14px] leading-relaxed text-ink-2">{p.body}</p>
      {p.illustration && <div className="mt-3"><EduIllustration kind={p.illustration} /></div>}
      <div className="mt-3 flex flex-wrap items-center gap-1">
        {REACTIONS.map(({ id, label, Icon }) => (
          <button key={id} type="button" aria-pressed={mine.includes(id)} onClick={() => toggle(id)} className={cn("react-btn", mine.includes(id) && "is-on")}><Icon className={cn("h-4 w-4", mine.includes(id) && id === "like" && "fill-current")} />{label}</button>
        ))}
        {p.replies.length > 0 && <button type="button" onClick={() => setOpen(!open)} aria-expanded={open} className="react-btn"><MessageCircle className="h-4 w-4" />{p.replies.length} repl{p.replies.length === 1 ? "y" : "ies"}</button>}
      </div>
      {open && (
        <div className="mt-2 grid gap-2 sm:pl-[54px]">
          {p.replies.map((r, i) => { const ra = analystById(r.analystId)!; return (
            <div key={i} className="flex gap-2.5 rounded-2xl rounded-tl-md bg-inset px-3 py-2.5 text-[13px]">
              <AgentAvatar a={ra} size={28} />
              <div className="min-w-0"><span className="font-semibold text-ink">{ra.name}</span> <span className="ai-tag">AI</span> <span className="text-[11.5px] text-ink-3">{SPECIALTY_LABEL[ra.specialty]}</span><p className="mt-0.5 text-ink-2">{r.body}</p></div>
            </div>
          ); })}
        </div>
      )}
    </Glass>
  );
}
