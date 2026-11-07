"use client";

import { ImagePlus, Send, X } from "lucide-react";
import { useRef, useState, useTransition } from "react";
import { submitFeedback, type FeedbackResult } from "@/server/actions/feedback";
import { Alert, Spinner, inputClass } from "@/components/auth/auth-ui";
import { Choice } from "@/components/onboarding/onboarding-flow";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";
import { Section } from "./ui";

const CATEGORIES = [
  { id: "bug", title: "Bug report", note: "Something broke or looks wrong." },
  { id: "feature", title: "Feature suggestion", note: "Something Treidify should do." },
  { id: "general", title: "General feedback", note: "Anything else on your mind." },
] as const;

export function FeedbackForm() {
  const [category, setCategory] = useState<(typeof CATEGORIES)[number]["id"] | null>(null);
  const [message, setMessage] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [result, setResult] = useState<FeedbackResult | null>(null);
  const [pending, start] = useTransition();
  const fileRef = useRef<HTMLInputElement>(null);
  return (
    <Section title="Send feedback" description="You're one of Treidify's early testers. Tell us what works, what doesn't and what you'd like next. The team reads every message.">
      <form
        className="grid gap-4"
        onSubmit={(e) => {
          e.preventDefault();
          if (!category) return setResult({ ok: false, error: "Choose a feedback type." });
          const fd = new FormData();
          fd.set("category", category);
          fd.set("message", message);
          if (file) fd.set("screenshot", file);
          start(async () => {
            const r = await submitFeedback(fd);
            setResult(r);
            if (r.ok) { setMessage(""); setFile(null); setCategory(null); }
          });
        }}
      >
        <div role="radiogroup" aria-label="Feedback type" className="grid gap-2.5 sm:grid-cols-3">
          {CATEGORIES.map((c) => <Choice key={c.id} selected={category === c.id} onClick={() => setCategory(c.id)} title={c.title} note={c.note} />)}
        </div>
        <label className="grid gap-1.5">
          <span className="text-sm font-medium text-ink">Message</span>
          <textarea value={message} onChange={(e) => setMessage(e.target.value)} rows={6} maxLength={4000} required className={cn(inputClass, "h-auto min-h-36 py-3")} placeholder="What happened, or what would you like to see?" />
          <span className="text-right text-[12px] text-ink-3">{message.length} / 4000</span>
        </label>
        <div className="flex flex-wrap items-center gap-2">
          <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp" className="sr-only" aria-label="Attach a screenshot" onChange={(e) => { setFile(e.target.files?.[0] ?? null); e.target.value = ""; }} />
          {file ? (
            <span className="inset inline-flex items-center gap-2 rounded-full py-1.5 pl-3.5 pr-1.5 text-[13px] text-ink-2">
              <span className="max-w-56 truncate">{file.name}</span>
              <button type="button" aria-label="Remove screenshot" onClick={() => setFile(null)} className="grid h-7 w-7 place-items-center rounded-full hover:text-ink"><X className="h-3.5 w-3.5" /></button>
            </span>
          ) : (
            <Button variant="secondary" size="sm" onClick={() => fileRef.current?.click()}><ImagePlus className="h-4 w-4" />Attach screenshot (optional)</Button>
          )}
          <Button type="submit" className="ml-auto" disabled={pending || message.trim().length < 5}>{pending ? <Spinner /> : <Send className="h-4 w-4" />}Send feedback</Button>
        </div>
        {result && <Alert tone={result.ok ? "up" : "down"}>{result.ok ? result.message : result.error}</Alert>}
      </form>
    </Section>
  );
}
