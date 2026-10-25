"use client";

import { Download, KeyRound, Laptop, ShieldCheck, Smartphone, Trash2 } from "lucide-react";
import QRCode from "qrcode";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { authClient } from "@/lib/auth-client";
import { Alert, Field, PasswordInput, Spinner, inputClass } from "@/components/auth/auth-ui";
import { Button, buttonClass } from "@/components/ui/button";
import { Pill } from "@/components/ui/pill";
import { Section } from "./ui";

type Msg = { tone: "up" | "down"; text: string } | null;
const Note = ({ m }: { m: Msg }) => (m ? <Alert tone={m.tone}>{m.text}</Alert> : null);

export function PasswordForm({ hasPassword, email }: { hasPassword: boolean; email: string }) {
  const [busy, setBusy] = useState(false);
  const [m, setM] = useState<Msg>(null);
  if (!hasPassword) {
    return (
      <Section title="Password" description="You sign in with Apple or Google, so there is no Treidify password on this account.">
        <Button variant="secondary" onClick={async () => { await authClient.requestPasswordReset({ email, redirectTo: "/reset-password" }); setM({ tone: "up", text: `We sent a link to ${email} to set a password.` }); }}>Set a password</Button>
        <div className="mt-3"><Note m={m} /></div>
      </Section>
    );
  }
  return (
    <Section title="Password" description="Changing your password signs you out everywhere else.">
      <form
        className="grid gap-4 sm:grid-cols-2"
        onSubmit={async (e) => {
          e.preventDefault();
          const f = new FormData(e.currentTarget), form = e.currentTarget;
          const newPassword = String(f.get("new"));
          if (newPassword.length < 10) return setM({ tone: "down", text: "Use at least 10 characters." });
          setBusy(true); setM(null);
          const { error } = await authClient.changePassword({ currentPassword: String(f.get("current")), newPassword, revokeOtherSessions: true });
          setBusy(false);
          if (error) return setM({ tone: "down", text: error.code === "INVALID_PASSWORD" ? "Your current password is not correct." : (error.message ?? "Could not change the password.") });
          form.reset();
          setM({ tone: "up", text: "Password changed. Other sessions were signed out." });
        }}
      >
        <Field label="Current password"><PasswordInput name="current" autoComplete="current-password" required /></Field>
        <Field label="New password"><PasswordInput name="new" autoComplete="new-password" minLength={10} required /></Field>
        <div className="flex flex-wrap items-center justify-end gap-3 sm:col-span-2"><Note m={m} /><Button type="submit" disabled={busy}>{busy && <Spinner />}Change password</Button></div>
      </form>
    </Section>
  );
}

export function TwoFactorForm({ enabled: initialEnabled, hasPassword }: { enabled: boolean; hasPassword: boolean }) {
  const router = useRouter();
  const [enabled, setEnabled] = useState(initialEnabled);
  const [stage, setStage] = useState<"idle" | "password" | "scan" | "codes" | "disable">("idle");
  const [pw, setPw] = useState("");
  const [uri, setUri] = useState<string | null>(null);
  const [qr, setQr] = useState<string | null>(null);
  const [codes, setCodes] = useState<string[]>([]);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [m, setM] = useState<Msg>(null);

  useEffect(() => { if (uri) QRCode.toDataURL(uri, { margin: 1, width: 200 }).then(setQr); }, [uri]);
  const secret = uri ? new URL(uri).searchParams.get("secret") : null;

  const start = async () => {
    setBusy(true); setM(null);
    const { data, error } = await authClient.twoFactor.enable({ password: pw });
    setBusy(false);
    if (error || !data || data.method !== "totp") return setM({ tone: "down", text: error?.code === "INVALID_PASSWORD" ? "That password is not correct." : (error?.message ?? "Could not start setup.") });
    setUri(data.totpURI); setCodes(data.backupCodes); setStage("scan"); setPw("");
  };
  const verify = async () => {
    setBusy(true); setM(null);
    const { error } = await authClient.twoFactor.verifyTotp({ code: code.replace(/\s/g, "") });
    setBusy(false);
    if (error) return setM({ tone: "down", text: "That code did not match. Check your phone’s clock and try the newest code." });
    setEnabled(true); setStage("codes"); setCode(""); router.refresh();
  };
  const disable = async () => {
    setBusy(true); setM(null);
    const { error } = await authClient.twoFactor.disable({ password: pw });
    setBusy(false);
    if (error) return setM({ tone: "down", text: error.code === "INVALID_PASSWORD" ? "That password is not correct." : (error.message ?? "Could not turn off two-step sign-in.") });
    setEnabled(false); setStage("idle"); setPw(""); setM({ tone: "up", text: "Two-step sign-in is off." }); router.refresh();
  };

  return (
    <Section title="Two-step sign-in" description="Ask for a code from an authenticator app (1Password, Google Authenticator, Authy) each time you sign in on a new device.">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 text-[15px] text-ink"><ShieldCheck className={enabled ? "h-5 w-5 text-up" : "h-5 w-5 text-ink-3"} />{enabled ? "On" : "Off"}{enabled && <Pill tone="up">Protected</Pill>}</div>
        {stage === "idle" && hasPassword && (enabled
          ? <Button variant="secondary" onClick={() => setStage("disable")}>Turn off</Button>
          : <Button onClick={() => setStage("password")}><KeyRound className="h-4 w-4" />Set up</Button>)}
      </div>
      {!hasPassword && <p className="mt-3 text-sm text-ink-3">Set a password first, then you can add two-step sign-in. Apple and Google accounts are already protected by their own two-step settings.</p>}

      {(stage === "password" || stage === "disable") && (
        <div className="mt-4 grid gap-3 sm:max-w-sm">
          <Field label="Confirm your password"><PasswordInput value={pw} onChange={(e) => setPw(e.target.value)} autoComplete="current-password" /></Field>
          <div className="flex gap-2">
            <Button variant="ghost" onClick={() => { setStage("idle"); setPw(""); setM(null); }}>Cancel</Button>
            <Button onClick={stage === "password" ? start : disable} disabled={busy || !pw}>{busy && <Spinner />}{stage === "password" ? "Continue" : "Turn off"}</Button>
          </div>
        </div>
      )}

      {stage === "scan" && (
        <div className="mt-4 grid gap-5 sm:grid-cols-[200px_1fr] sm:items-start">
          <div className="grid place-items-center rounded-2xl bg-white p-2">
            {/* eslint-disable-next-line @next/next/no-img-element -- generated locally from the secret */}
            {qr ? <img src={qr} alt="QR code for your authenticator app" width={200} height={200} /> : <span className="skeleton h-[200px] w-[200px]" />}
          </div>
          <div className="grid gap-3">
            <p className="text-sm text-ink-2">Scan this with your authenticator app, or enter the key manually.</p>
            {secret && <code className="inset block break-all rounded-xl px-3 py-2 font-mono text-sm text-ink">{secret.match(/.{1,4}/g)?.join(" ")}</code>}
            <Field label="6-digit code"><input value={code} onChange={(e) => setCode(e.target.value)} inputMode="numeric" autoComplete="one-time-code" maxLength={7} className={inputClass} /></Field>
            <Button onClick={verify} disabled={busy || code.replace(/\s/g, "").length !== 6}>{busy && <Spinner />}Verify and turn on</Button>
          </div>
        </div>
      )}

      {stage === "codes" && (
        <div className="mt-4 grid gap-3">
          <Alert tone="up">Two-step sign-in is on. Save these backup codes somewhere safe. Each works once if you lose your phone, and they won’t be shown again.</Alert>
          <ul className="inset grid grid-cols-2 gap-2 rounded-2xl p-4 font-mono text-sm text-ink sm:grid-cols-5">{codes.map((c) => <li key={c}>{c}</li>)}</ul>
          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => navigator.clipboard.writeText(codes.join("\n"))}>Copy codes</Button>
            <Button onClick={() => setStage("idle")}>Done</Button>
          </div>
        </div>
      )}
      {m && <div className="mt-4"><Note m={m} /></div>}
    </Section>
  );
}

interface SessionRow { id: string; token: string; userAgent?: string | null; ipAddress?: string | null; createdAt: Date | string; updatedAt: Date | string }

function describe(ua?: string | null) {
  if (!ua) return { name: "Unknown device", mobile: false };
  const mobile = /iPhone|Android|Mobile/i.test(ua);
  const browser = /Edg\//.test(ua) ? "Edge" : /Chrome\//.test(ua) ? "Chrome" : /Firefox\//.test(ua) ? "Firefox" : /Safari\//.test(ua) ? "Safari" : "Browser";
  const os = /iPhone|iPad/.test(ua) ? "iOS" : /Mac OS X/.test(ua) ? "macOS" : /Android/.test(ua) ? "Android" : /Windows/.test(ua) ? "Windows" : /Linux/.test(ua) ? "Linux" : "";
  return { name: `${browser}${os ? ` on ${os}` : ""}`, mobile };
}

export function SessionsList({ currentToken, timezone }: { currentToken: string; timezone: string }) {
  const [rows, setRows] = useState<SessionRow[] | null>(null);
  const [m, setM] = useState<Msg>(null);
  const load = async () => { const { data } = await authClient.listSessions(); setRows((data as SessionRow[] | null) ?? []); };
  useEffect(() => { load(); }, []);
  const others = rows?.filter((r) => r.token !== currentToken) ?? [];
  return (
    <Section title="Where you’re signed in" description="Sign out of any device you don’t recognise, then change your password.">
      {!rows ? <div className="skeleton h-16 rounded-2xl" /> : (
        <ul className="divide-y divide-[var(--border)]">
          {rows.map((r) => {
            const d = describe(r.userAgent);
            const current = r.token === currentToken;
            return (
              <li key={r.id} className="flex items-center gap-3 py-3">
                <span className="inset grid h-10 w-10 shrink-0 place-items-center rounded-full">{d.mobile ? <Smartphone className="h-4 w-4 text-ink-2" /> : <Laptop className="h-4 w-4 text-ink-2" />}</span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 text-[15px] text-ink">{d.name}{current && <Pill tone="accent">This device</Pill>}</div>
                  <div className="truncate text-xs text-ink-3">{r.ipAddress ?? "IP unknown"} · active {new Date(r.updatedAt).toLocaleString("en-GB", { timeZone: timezone, day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</div>
                </div>
                {!current && <Button variant="ghost" size="sm" onClick={async () => { await authClient.revokeSession({ token: r.token }); load(); }}>Sign out</Button>}
              </li>
            );
          })}
        </ul>
      )}
      {others.length > 0 && (
        <div className="mt-3 flex justify-end">
          <Button variant="secondary" size="sm" onClick={async () => { await authClient.revokeOtherSessions(); setM({ tone: "up", text: "Signed out of all other devices." }); load(); }}>Sign out everywhere else</Button>
        </div>
      )}
      {m && <div className="mt-3"><Note m={m} /></div>}
    </Section>
  );
}

export function DataControls({ hasPassword }: { hasPassword: boolean }) {
  const router = useRouter();
  const [confirm, setConfirm] = useState(false);
  const [pw, setPw] = useState("");
  const [typed, setTyped] = useState("");
  const [busy, setBusy] = useState(false);
  const [m, setM] = useState<Msg>(null);
  const del = async () => {
    setBusy(true); setM(null);
    const { error } = await authClient.deleteUser(hasPassword ? { password: pw } : { callbackURL: "/goodbye" });
    setBusy(false);
    if (error) return setM({ tone: "down", text: error.code === "INVALID_PASSWORD" ? "That password is not correct." : (error.message ?? "Could not delete the account.") });
    if (hasPassword) { router.replace("/goodbye"); return; }
    setM({ tone: "up", text: "We emailed you a link to confirm. Your account is deleted once you open it." });
  };
  return (
    <Section title="Your data" description="Download everything Treidify holds about you, or delete your account and all of its data.">
      <div className="flex flex-wrap gap-2">
        <a href="/api/account/export" className={buttonClass("secondary")} download><Download className="h-4 w-4" />Download my data</a>
        {!confirm && <Button variant="ghost" className="text-down hover:bg-down-soft hover:text-down" onClick={() => setConfirm(true)}><Trash2 className="h-4 w-4" />Delete account</Button>}
      </div>
      {confirm && (
        <div className="mt-4 grid gap-3 rounded-2xl border border-[var(--down)]/30 bg-down-soft p-4 sm:max-w-md">
          <p className="text-sm text-ink">This permanently deletes your profile, synced trading data, journal, community posts and any subscription record. It cannot be undone.</p>
          {hasPassword && <Field label="Password"><PasswordInput value={pw} onChange={(e) => setPw(e.target.value)} autoComplete="current-password" /></Field>}
          <Field label="Type DELETE to confirm"><input value={typed} onChange={(e) => setTyped(e.target.value)} className={inputClass} autoComplete="off" /></Field>
          <div className="flex gap-2">
            <Button variant="ghost" onClick={() => { setConfirm(false); setPw(""); setTyped(""); }}>Cancel</Button>
            <Button className="bg-[linear-gradient(180deg,var(--down),var(--down))] shadow-none" disabled={busy || typed !== "DELETE" || (hasPassword && !pw)} onClick={del}>{busy && <Spinner />}Delete permanently</Button>
          </div>
        </div>
      )}
      {m && <div className="mt-3"><Note m={m} /></div>}
    </Section>
  );
}
