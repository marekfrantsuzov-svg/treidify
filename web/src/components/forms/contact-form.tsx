"use client";

import { CheckCircle2, Loader2 } from "lucide-react";
import { useState } from "react";
import { contactTopics } from "@/lib/contact";
import { Button } from "@/components/ui/button";
import { Glass } from "@/components/ui/glass";

export const fieldClass = "inset h-12 w-full rounded-2xl px-4 text-[15px] text-ink outline-none transition-shadow placeholder:text-ink-3 focus:shadow-[0_0_0_3px_var(--accent-soft)] focus:border-accent";

export function ContactForm() {
  const [state, setState] = useState<{ status: "idle" | "sending" | "sent" | "error"; message?: string; fields?: Record<string, string[] | undefined>; reference?: string }>({ status: "idle" });

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setState({ status: "sending" });
    const data = Object.fromEntries(new FormData(e.currentTarget));
    try {
      const res = await fetch("/api/contact", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
      const json = await res.json();
      if (res.ok) setState({ status: "sent", reference: json.reference });
      else setState({ status: "error", message: json.error, fields: json.fields });
    } catch {
      setState({ status: "error", message: "Network error. Please check your connection and try again." });
    }
  }

  if (state.status === "sent") {
    return (
      <Glass className="p-8 text-center">
        <CheckCircle2 className="mx-auto h-10 w-10 text-up" />
        <h2 className="mt-4 text-xl font-semibold text-ink">Message sent</h2>
        <p className="mt-2 text-ink-2">We usually reply within one business day.{state.reference && <> Your reference is <span className="num font-semibold text-ink">{state.reference}</span>.</>}</p>
      </Glass>
    );
  }
  const err = (k: string) => state.fields?.[k]?.[0];
  return (
    <Glass className="p-6 sm:p-8">
      <form onSubmit={onSubmit} noValidate className="grid gap-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="grid gap-1.5 text-sm font-medium text-ink">Name<input name="name" required autoComplete="name" className={fieldClass} aria-invalid={!!err("name")} />{err("name") && <span className="text-xs text-down">{err("name")}</span>}</label>
          <label className="grid gap-1.5 text-sm font-medium text-ink">Email<input name="email" type="email" required autoComplete="email" className={fieldClass} aria-invalid={!!err("email")} />{err("email") && <span className="text-xs text-down">{err("email")}</span>}</label>
        </div>
        <label className="grid gap-1.5 text-sm font-medium text-ink">Topic
          <select name="topic" className={fieldClass} defaultValue={contactTopics[0]}>{contactTopics.map((t) => <option key={t}>{t}</option>)}</select>
        </label>
        <label className="grid gap-1.5 text-sm font-medium text-ink">Message<textarea name="message" required rows={6} className={`${fieldClass} h-auto py-3`} aria-invalid={!!err("message")} />{err("message") && <span className="text-xs text-down">{err("message")}</span>}</label>
        <input name="website" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden />
        <p className="text-xs text-ink-3">Never send passwords, investor passwords or card numbers. We use your message only to reply to you. See our <a href="/legal/privacy" className="text-accent hover:underline">Privacy Policy</a>.</p>
        {state.status === "error" && <p role="alert" className="rounded-2xl bg-down-soft px-4 py-3 text-sm text-down">{state.message}</p>}
        <Button type="submit" size="lg" disabled={state.status === "sending"} className="justify-self-start">
          {state.status === "sending" && <Loader2 className="h-4 w-4 animate-spin" />}Send message
        </Button>
      </form>
    </Glass>
  );
}
