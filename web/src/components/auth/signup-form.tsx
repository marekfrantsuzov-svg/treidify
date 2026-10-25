"use client";

import Link from "next/link";
import { useState } from "react";
import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Alert, Divider, Field, PasswordInput, SocialButtons, Spinner, inputClass } from "./auth-ui";

function strength(pw: string) {
  let s = 0;
  if (pw.length >= 10) s++;
  if (pw.length >= 14) s++;
  if (/[a-z]/.test(pw) && /[A-Z]/.test(pw)) s++;
  if (/\d/.test(pw)) s++;
  if (/[^A-Za-z0-9]/.test(pw)) s++;
  return Math.min(4, s);
}

export function SignupForm({ providers, trial }: { providers: { google: boolean; apple: boolean }; trial: boolean }) {
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [pw, setPw] = useState("");
  const callbackURL = trial ? "/onboarding?trial=1" : "/onboarding";

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const name = String(f.get("name") ?? "").trim(), email = String(f.get("email") ?? "").trim(), password = String(f.get("password") ?? "");
    if (!f.get("accept")) return setError("Please accept the Terms and Risk Disclosure to continue.");
    if (password.length < 10) return setError("Use at least 10 characters for your password.");
    setBusy("email"); setError(null);
    const { error } = await authClient.signUp.email({ name, email, password, callbackURL });
    setBusy(null);
    if (error) return setError(error.status === 422 || error.code === "USER_ALREADY_EXISTS" ? "An account with this email already exists. Try signing in." : error.message ?? "Could not create your account.");
    setSentTo(email);
  }

  async function social(provider: "google" | "apple") {
    setBusy(provider); setError(null);
    const { error } = await authClient.signIn.social({ provider, callbackURL, newUserCallbackURL: callbackURL });
    if (error) { setBusy(null); setError(error.message ?? "Sign-in failed."); }
  }

  if (sentTo) {
    return (
      <div className="grid gap-4 text-center">
        <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-accent-soft text-2xl">✉️</div>
        <h2 className="text-lg font-semibold text-ink">Check your inbox</h2>
        <p className="text-[15px] text-ink-2">We sent a confirmation link to <span className="font-medium text-ink">{sentTo}</span>. Open it to finish creating your account. The link expires in 24 hours.</p>
        <button type="button" className="text-sm text-accent hover:underline" onClick={async () => { await authClient.sendVerificationEmail({ email: sentTo, callbackURL }); }}>Resend the email</button>
      </div>
    );
  }

  const s = strength(pw);
  return (
    <div>
      <SocialButtons enabled={providers} onSelect={social} busy={busy} />
      <Divider label="or with email" />
      <form onSubmit={onSubmit} className="grid gap-4" noValidate>
        <Field label="Name"><input name="name" required autoComplete="name" className={inputClass} /></Field>
        <Field label="Email"><input name="email" type="email" required autoComplete="email" className={inputClass} /></Field>
        <Field label="Password">
          <PasswordInput name="password" required minLength={10} autoComplete="new-password" value={pw} onChange={(e) => setPw(e.target.value)} />
          <div className="mt-1 flex gap-1" aria-hidden>
            {[0, 1, 2, 3].map((i) => <span key={i} className={`h-1 flex-1 rounded-full ${i < s ? (s >= 3 ? "bg-up" : s === 2 ? "bg-warn" : "bg-down") : "bg-[var(--border-strong)]"}`} />)}
          </div>
          <span className="text-xs font-normal text-ink-3">At least 10 characters. A passphrase is best.</span>
        </Field>
        <label className="flex items-start gap-3 text-sm text-ink-2">
          <input type="checkbox" name="accept" className="mt-0.5 h-4 w-4 accent-[var(--accent)]" />
          <span>I accept the <Link href="/legal/terms" className="text-accent hover:underline">Terms</Link> and have read the <Link href="/legal/risk-disclosure" className="text-accent hover:underline">Risk Disclosure</Link> and <Link href="/legal/privacy" className="text-accent hover:underline">Privacy Policy</Link>.</span>
        </label>
        {error && <Alert>{error}</Alert>}
        <Button type="submit" size="lg" disabled={!!busy} className="w-full">{busy === "email" && <Spinner />}Create free account</Button>
        <p className="text-center text-xs text-ink-3">No payment details needed.</p>
      </form>
    </div>
  );
}
