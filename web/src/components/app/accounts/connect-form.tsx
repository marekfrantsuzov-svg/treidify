"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { track } from "@/lib/track";
import { connectTradingAccount } from "@/server/actions/accounts";
import type { ActionResult } from "@/server/actions/settings";
import { Alert, Field, PasswordInput, Spinner, inputClass } from "@/components/auth/auth-ui";
import { Segmented } from "@/components/onboarding/onboarding-flow";
import { Button } from "@/components/ui/button";

/** Read-only MetaTrader connection. Disabled, with the reason, while the sync provider is not switched on. */
export function ConnectForm({ enabled }: { enabled: boolean }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [platform, setPlatform] = useState<"mt5" | "mt4">("mt5");
  const [r, setR] = useState<ActionResult | null>(null);
  return (
    <form
      className="grid gap-4"
      onSubmit={(e) => {
        e.preventDefault();
        const f = new FormData(e.currentTarget);
        start(async () => {
          const x = await connectTradingAccount({ platform, server: String(f.get("server") ?? ""), login: String(f.get("login") ?? ""), investorPassword: String(f.get("investorPassword") ?? ""), confirmReadOnly: (f.get("confirm") === "on") as true });
          setR(x);
          if (x.ok) { track("Account connect requested", { platform }); (e.target as HTMLFormElement).reset(); router.refresh(); }
        });
      }}
    >
      <fieldset disabled={!enabled || pending} className="grid gap-4 disabled:opacity-60">
        <Segmented label="Platform" value={platform} onChange={setPlatform} options={[{ id: "mt5", label: "MetaTrader 5" }, { id: "mt4", label: "MetaTrader 4" }]} />
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Broker server"><input name="server" autoComplete="off" placeholder="Broker-Live01" className={inputClass} /></Field>
          <Field label="Login (account number)"><input name="login" inputMode="numeric" autoComplete="off" placeholder="12345678" className={inputClass} /></Field>
        </div>
        <Field label="Investor password" hint="The read-only password. Never your master password.">
          <PasswordInput name="investorPassword" autoComplete="off" />
        </Field>
        <label className="flex items-start gap-2.5 text-sm text-ink-2">
          <input type="checkbox" name="confirm" className="mt-0.5 h-4 w-4 accent-[var(--accent)]" />
          I confirm this is the investor password, which can view the account but cannot trade or withdraw.
        </label>
      </fieldset>
      {r && <Alert tone={r.ok ? "up" : "down"}>{r.ok ? r.message : r.error}</Alert>}
      <div><Button type="submit" disabled={!enabled || pending}>{pending && <Spinner />}Connect read-only</Button></div>
    </form>
  );
}
