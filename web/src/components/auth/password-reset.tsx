"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Alert, Field, PasswordInput, Spinner, inputClass } from "./auth-ui";

export function ForgotForm() {
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    const email = String(new FormData(e.currentTarget).get("email") ?? "").trim();
    await authClient.requestPasswordReset({ email, redirectTo: "/reset-password" });
    setBusy(false);
    setSent(true); // Same message whether or not the account exists, to avoid account enumeration.
  }
  if (sent) return <Alert tone="up">If an account exists for that email, a reset link is on its way. It expires in one hour.</Alert>;
  return (
    <form onSubmit={onSubmit} className="grid gap-4">
      <Field label="Email"><input name="email" type="email" required autoComplete="email" className={inputClass} /></Field>
      <Button type="submit" size="lg" disabled={busy} className="w-full">{busy && <Spinner />}Send reset link</Button>
    </form>
  );
}

export function ResetForm({ token }: { token: string | null }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(token ? null : "This reset link is invalid or has expired. Request a new one.");
  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const a = String(f.get("password") ?? ""), b = String(f.get("confirm") ?? "");
    if (a.length < 10) return setError("Use at least 10 characters.");
    if (a !== b) return setError("The passwords do not match.");
    setBusy(true); setError(null);
    const { error } = await authClient.resetPassword({ newPassword: a, token: token ?? "" });
    setBusy(false);
    if (error) return setError("This reset link is invalid or has expired. Request a new one.");
    router.push("/login?reset=1");
  }
  return (
    <form onSubmit={onSubmit} className="grid gap-4">
      <Field label="New password"><PasswordInput name="password" required minLength={10} autoComplete="new-password" /></Field>
      <Field label="Confirm new password"><PasswordInput name="confirm" required minLength={10} autoComplete="new-password" /></Field>
      {error && <Alert>{error}</Alert>}
      <Button type="submit" size="lg" disabled={busy || !token} className="w-full">{busy && <Spinner />}Update password</Button>
      <p className="text-center text-xs text-ink-3">Updating your password signs you out of every other device.</p>
    </form>
  );
}
