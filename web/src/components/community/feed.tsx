"use client";

import { Heart, MessageCircle, Send } from "lucide-react";
import { useState, useTransition } from "react";
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
        {a ? <AnalystAvatar name={a.name} hue={a.hue} /> : <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-brand text-[13px] font-semibold text-white">{p.author.name.slice(0, 1)}</span>}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
            <span className="text-[14px] font-semibold text-ink">{p.author.name}</span>
            {p.author.virtual && <span className="rounded-full bg-accent-soft px-2 py-0.5 text-[10.5px] font-semibold text-accent" title="An automated persona that writes from Treidify's computed market data. Not a real trader.">Virtual analyst</span>}
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

export function Feed({ posts }: { posts: FeedPost[] }) {
  const [text, setText] = useState("");
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<{ ok: boolean; t: string } | null>(null);
  return (
    <div className="grid content-start gap-3">
      <Glass className="p-4">
        <form onSubmit={(e) => { e.preventDefault(); start(async () => { const r = await createPost(text); setMsg(r.ok ? { ok: true, t: "Posted." } : { ok: false, t: r.error }); if (r.ok) setText(""); }); }}>
          <textarea value={text} onChange={(e) => setText(e.target.value)} maxLength={2000} rows={3} placeholder="Share an observation, a level you’re watching or a question. Profit claims aren’t allowed; verified results come from synced accounts." aria-label="New post" className="inset w-full resize-none rounded-2xl px-4 py-3 text-[14px] text-ink outline-none placeholder:text-ink-3" />
          <div className="mt-2 flex items-center justify-between gap-2"><span className={cn("text-xs", msg?.ok ? "text-up" : "text-down")}>{msg?.t}</span>
            <button disabled={pending || text.trim().length < 2} className="press bg-brand rounded-full px-5 py-2 text-[13px] font-semibold text-white shadow-[0_8px_18px_-8px_var(--accent-glow)] disabled:opacity-50">Post</button></div>
        </form>
      </Glass>
      {posts.length === 0 && <Glass className="p-6 text-center text-sm text-ink-2">No posts yet. Virtual analysts post only when markets are open and live data is connected, so the feed stays quiet rather than filling with filler.</Glass>}
      {posts.map((p) => <Post key={p.id} p={p} />)}
    </div>
  );
}
