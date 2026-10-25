"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Alert, Divider, Field, PasswordInput, SocialButtons, Spinner, inputClass, safeNext } from "./auth-ui";

export function LoginForm({ providers, next }: { providers: { google: boolean; apple: boolean }; next?: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [unverified, setUnverified] = useState<string | null>(null);
  const [resent, setResent] = useState(false);
  const target = safeNext(next);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const email = String(f.get("email") ?? "").trim(), password = String(f.get("password") ?? "");
    setBusy("email"); setError(null); setUnverified(null);
    const { data, error } = await authClient.signIn.email({ email, password, rememberMe: f.get("remember") === "on", callbackURL: target });
    setBusy(null);
    if (error) {
      if (error.code === "EMAIL_NOT_VERIFIED" || error.status === 403) { setUnverified(email); return; }
      if (error.status === 429) return setError("Too many attempts. Please wait a minute and try again.");
      return setError("Email or password is incorrect.");
    }
    if (data && "twoFactorRedirect" in data && data.twoFactorRedirect) { router.push(`/login/two-factor?next=${encodeURIComponent(target)}`); return; }
    router.push(target);
    router.refresh();
  }

  async function social(provider: "google" | "apple") {
    setBusy(provider); setError(null);
    const { error } = await authClient.signIn.social({ provider, callbackURL: target, newUserCallbackURL: "/onboarding" });
    if (error) { setBusy(null); setError(error.message ?? "Sign-in failed."); }
  }

  return (
    <div>
      <SocialButtons enabled={providers} onSelect={social} busy={busy} />
      <Divider />
      <form onSubmit={onSubmit} className="grid gap-4" noValidate>
        <Field label="Email"><input name="email" type="email" required autoComplete="email" className={inputClass} /></Field>
        <Field label="Password" hint={<Link href="/forgot-password" className="text-xs font-normal text-accent hover:underline">Forgot password?</Link>}>
          <PasswordInput name="password" required autoComplete="current-password" />
        </Field>
        <label className="flex items-center gap-2.5 text-sm text-ink-2"><input type="checkbox" name="remember" defaultChecked className="h-4 w-4 accent-[var(--accent)]" /> Keep me signed in on this device</label>
        {error && <Alert>{error}</Alert>}
        {unverified && (
          <Alert tone="warn">
            Please confirm your email first.{" "}
            {resent ? "We sent a new link." : <button type="button" className="font-semibold underline" onClick={async () => { await authClient.sendVerificationEmail({ email: unverified, callbackURL: target }); setResent(true); }}>Send a new link</button>}
          </Alert>
        )}
        <Button type="submit" size="lg" disabled={!!busy} className="w-full">{busy === "email" && <Spinner />}Sign in</Button>
      </form>
    </div>
  );
}
