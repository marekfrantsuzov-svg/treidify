"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Alert, Field, Spinner, inputClass, safeNext } from "./auth-ui";

export function TwoFactorForm({ next }: { next?: string }) {
  const router = useRouter();
  const [mode, setMode] = useState<"totp" | "backup">("totp");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const code = String(f.get("code") ?? "").replace(/\s/g, "");
    setBusy(true); setError(null);
    const res = mode === "totp"
      ? await authClient.twoFactor.verifyTotp({ code, trustDevice: f.get("trust") === "on" })
      : await authClient.twoFactor.verifyBackupCode({ code, trustDevice: f.get("trust") === "on" });
    setBusy(false);
    if (res.error) return setError(res.error.status === 429 ? "Too many attempts. Wait a minute." : "That code is not valid.");
    router.push(safeNext(next));
    router.refresh();
  }
  return (
    <form onSubmit={onSubmit} className="grid gap-4">
      <Field label={mode === "totp" ? "6-digit code from your authenticator app" : "Backup code"}>
        <input name="code" required autoFocus inputMode={mode === "totp" ? "numeric" : "text"} autoComplete="one-time-code" maxLength={mode === "totp" ? 6 : 32} className={`${inputClass} num text-center text-lg tracking-[0.4em]`} />
      </Field>
      <label className="flex items-center gap-2.5 text-sm text-ink-2"><input type="checkbox" name="trust" className="h-4 w-4 accent-[var(--accent)]" /> Trust this device for 30 days</label>
      {error && <Alert>{error}</Alert>}
      <Button type="submit" size="lg" disabled={busy} className="w-full">{busy && <Spinner />}Verify</Button>
      <button type="button" onClick={() => setMode(mode === "totp" ? "backup" : "totp")} className="text-sm text-accent hover:underline">
        {mode === "totp" ? "Use a backup code instead" : "Use your authenticator app"}
      </button>
    </form>
  );
}
