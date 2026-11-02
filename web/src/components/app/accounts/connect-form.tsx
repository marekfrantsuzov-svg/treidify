"use client";

import { Check, Circle, Loader2, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { track } from "@/lib/track";
import { cn } from "@/lib/cn";
import { connectionProgress, connectTradingAccount, type ConnectionProgress } from "@/server/actions/accounts";
import type { ActionResult } from "@/server/actions/settings";
import { Alert, Field, PasswordInput, Spinner, inputClass } from "@/components/auth/auth-ui";
import { Segmented } from "@/components/onboarding/onboarding-flow";
import { Button } from "@/components/ui/button";

type Step = { label: string; state: "done" | "active" | "todo" | "failed" };

/** Progress after a connection is created: MetaApi connects, read-only access is proven, then history imports. */
function ConnectProgress({ accountId, onDone }: { accountId: string; onDone: (p: ConnectionProgress) => void }) {
  const [p, setP] = useState<ConnectionProgress | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const done = useRef(false);
  useEffect(() => {
    let stop = false;
    const started = Date.now();
    const tick = async () => {
      if (stop || done.current) return;
      try {
        const r = await connectionProgress(accountId);
        if (stop) return;
        setP(r);
        if (r.phase === "synced" || r.phase === "refused" || r.phase === "broker_rejected" || r.phase === "inactive") { done.current = true; onDone(r); return; }
      } catch { /* keep polling */ }
      setElapsed(Math.round((Date.now() - started) / 1000));
      if (Date.now() - started < 4 * 60_000) setTimeout(tick, 5000);
    };
    tick();
    return () => { stop = true; };
  }, [accountId, onDone]);

  const phase = p?.phase ?? "connecting";
  const failed = phase === "refused" || phase === "broker_rejected" || phase === "inactive";
  const steps: Step[] = [
    { label: "Connection created at MetaApi", state: "done" },
    { label: "MetaApi connecting to your broker", state: phase === "connecting" ? "active" : phase === "broker_rejected" ? "failed" : "done" },
    { label: "Proving read-only access", state: phase === "connecting" || phase === "broker_rejected" ? "todo" : phase === "refused" ? "failed" : phase === "synced" ? "done" : "active" },
    { label: "Importing balance, positions and history", state: phase === "synced" ? "done" : failed ? "todo" : phase === "verifying" || phase === "error" ? "active" : "todo" },
  ];
  return (
    <div className="grid gap-3" role="status" aria-live="polite">
      <ol className="grid gap-2">
        {steps.map((s) => (
          <li key={s.label} className={cn("flex items-center gap-2.5 text-[13.5px]", s.state === "todo" ? "text-ink-3" : s.state === "failed" ? "text-down" : "text-ink")}>
            {s.state === "done" ? <Check className="h-4 w-4 text-up" /> : s.state === "active" ? <Loader2 className="h-4 w-4 animate-spin text-accent" /> : s.state === "failed" ? <X className="h-4 w-4" /> : <Circle className="h-4 w-4" />}
            {s.label}
          </li>
        ))}
      </ol>
      {phase === "synced" && <Alert tone="up">Connected{p?.accessMode === "master" ? " with the owner's master password. Treidify still only reads data" : " read-only (investor password confirmed by MetaApi)"}. Your dashboard now shows real broker data.</Alert>}
      {failed && p?.message && <Alert tone="down">{p.message}</Alert>}
      {!failed && phase !== "synced" && <p className="text-xs text-ink-3">{elapsed < 20 ? "This usually takes one to three minutes." : `Still working (${elapsed}s). You can close this; the connection continues in the background.`}</p>}
    </div>
  );
}

/**
 * MetaTrader connection. Normal users can only submit an investor password (and MetaApi must confirm it). The master
 * option is rendered only for the verified owner, and the server re-checks ownership on submit regardless.
 */
export function ConnectForm({ enabled, owner = false, defaults }: { enabled: boolean; owner?: boolean; defaults?: { platform: "mt4" | "mt5"; server: string; login: string } }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [platform, setPlatform] = useState<"mt5" | "mt4">(defaults?.platform ?? "mt5");
  const [credential, setCredential] = useState<"investor" | "master">("investor");
  const [r, setR] = useState<ActionResult | null>(null);
  const [accountId, setAccountId] = useState<string | null>(null);
  const master = owner && credential === "master";

  if (accountId) return <ConnectProgress accountId={accountId} onDone={(p) => { track("Account connect finished", { phase: p.phase }); router.refresh(); }} />;

  return (
    <form
      className="grid gap-4"
      autoComplete="off"
      onSubmit={(e) => {
        e.preventDefault();
        const form = e.currentTarget;
        const f = new FormData(form);
        start(async () => {
          const x = await connectTradingAccount({ platform, credential: master ? "master" : "investor", server: String(f.get("server") ?? ""), login: String(f.get("login") ?? ""), password: String(f.get("password") ?? ""), confirmReadOnly: (f.get("confirm") === "on") as true });
          form.reset();
          setR(x);
          if (x.ok && x.accountId) { track("Account connect requested", { platform }); setAccountId(x.accountId); }
        });
      }}
    >
      <fieldset disabled={!enabled || pending} className="grid gap-4 disabled:opacity-60">
        <Segmented label="Platform" value={platform} onChange={setPlatform} options={[{ id: "mt5", label: "MetaTrader 5" }, { id: "mt4", label: "MetaTrader 4" }]} />
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Broker server"><input name="server" defaultValue={defaults?.server} readOnly={!!defaults} autoComplete="off" autoCapitalize="none" spellCheck={false} placeholder="Broker-Live01" className={inputClass} /></Field>
          <Field label="Login (account number)"><input name="login" defaultValue={defaults?.login} readOnly={!!defaults} inputMode="numeric" autoComplete="off" placeholder="12345678" className={inputClass} /></Field>
        </div>
        {owner && (
          <Segmented label="Password type (owner account)" value={credential} onChange={setCredential} options={[{ id: "investor", label: "Investor (read-only)" }, { id: "master", label: "Master" }]} />
        )}
        <Field label={master ? "Master password" : "Investor password"} hint={master ? "Owner only. Treidify still never places, modifies or closes trades." : "The read-only password. Never your master password."}>
          <PasswordInput name="password" autoComplete="new-password" />
        </Field>
        <label className="flex items-start gap-2.5 text-sm text-ink-2">
          <input type="checkbox" name="confirm" className="mt-0.5 h-4 w-4 accent-[var(--accent)]" />
          {master ? "I am the account holder and understand Treidify only reads this account." : "I confirm this is the investor password, which can view the account but cannot trade or withdraw."}
        </label>
      </fieldset>
      {r && !r.ok && <Alert tone="down">{r.error}</Alert>}
      <div><Button type="submit" disabled={!enabled || pending}>{pending && <Spinner />}{pending ? "Checking with your broker…" : defaults ? "Reconnect" : master ? "Connect (read-only use)" : "Connect read-only"}</Button></div>
    </form>
  );
}
