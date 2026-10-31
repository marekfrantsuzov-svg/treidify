"use client";

import { Camera, Trash2 } from "lucide-react";
import { useRef, useState, useTransition } from "react";
import { removeAvatar, updatePrivacy, updateProfile, uploadAvatar, type ActionResult, type PrivacyInput } from "@/server/actions/settings";
import { Alert, Field, Spinner, UsernameInput, inputClass } from "@/components/auth/auth-ui";
import { Avatar } from "@/components/app/app-shell";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";
import { SlidingPill } from "@/components/ui/sliding-pill";
import { Section, Toggle } from "./ui";

function useAction() {
  const [pending, start] = useTransition();
  const [result, setResult] = useState<ActionResult | null>(null);
  const run = (fn: () => Promise<ActionResult>) => start(async () => setResult(await fn()));
  const message = result && <Alert tone={result.ok ? "up" : "down"}>{result.ok ? result.message : result.error}</Alert>;
  return { pending, run, message, setResult };
}

export function ProfileForm({ initial }: { initial: { name: string; username: string; bio: string; country: string; avatar: string | null } }) {
  const [v, setV] = useState(initial);
  const a = useAction();
  const photo = useAction();
  const fileRef = useRef<HTMLInputElement>(null);
  return (
    <Section title="Profile" description="Your name and username appear in the community. Everything else follows your privacy choices below.">
      <div className="mb-5 flex items-center gap-4">
        <Avatar user={{ name: v.name, avatar: v.avatar }} size={72} />
        <div className="flex flex-wrap gap-2">
          <input
            ref={fileRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/heic,image/heif,image/avif"
            className="sr-only"
            aria-label="Upload a profile photo"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (!f) return;
              const fd = new FormData();
              fd.set("avatar", f);
              photo.run(async () => {
                const r = await uploadAvatar(fd);
                if (r.ok) setV((x) => ({ ...x, avatar: URL.createObjectURL(f) }));
                return r;
              });
              e.target.value = "";
            }}
          />
          <Button variant="secondary" size="sm" onClick={() => fileRef.current?.click()} disabled={photo.pending}>{photo.pending ? <Spinner /> : <Camera className="h-4 w-4" />}Upload photo</Button>
          {v.avatar && (
            <Button variant="ghost" size="sm" disabled={photo.pending} onClick={() => photo.run(async () => { const r = await removeAvatar(); if (r.ok) setV((x) => ({ ...x, avatar: null })); return r; })}><Trash2 className="h-4 w-4" />Remove</Button>
          )}
        </div>
      </div>
      {photo.message && <div className="mb-4">{photo.message}</div>}
      <form className="grid gap-4 sm:grid-cols-2" onSubmit={(e) => { e.preventDefault(); a.run(() => updateProfile(v)); }}>
        <Field label="Name"><input value={v.name} onChange={(e) => setV({ ...v, name: e.target.value })} className={inputClass} autoComplete="name" /></Field>
        <Field label="Username">
          <UsernameInput value={v.username} onChange={(e) => setV({ ...v, username: e.target.value.replace(/\s/g, "") })} />
        </Field>
        <div className="sm:col-span-2">
          <Field label="Bio" hint={<span className="text-xs font-normal text-ink-3">{v.bio.length}/280</span>}>
            <textarea value={v.bio} onChange={(e) => setV({ ...v, bio: e.target.value })} maxLength={280} rows={3} className={cn(inputClass, "h-auto py-3")} placeholder="What you trade and how you approach it." />
          </Field>
        </div>
        <Field label="Country (optional)"><input value={v.country} onChange={(e) => setV({ ...v, country: e.target.value })} className={inputClass} autoComplete="country-name" /></Field>
        <div className="flex items-end justify-end gap-3 sm:col-span-1">
          <Button type="submit" disabled={a.pending}>{a.pending && <Spinner />}Save profile</Button>
        </div>
        {a.message && <div className="sm:col-span-2">{a.message}</div>}
      </form>
    </Section>
  );
}

const DELAYS = [
  { v: 0, label: "Real time" },
  { v: 15, label: "15 min" },
  { v: 60, label: "1 hour" },
  { v: 240, label: "4 hours" },
  { v: 1440, label: "24 hours" },
];

export function PrivacyForm({ initial }: { initial: PrivacyInput }) {
  const [v, setV] = useState(initial);
  const a = useAction();
  const set = (k: keyof PrivacyInput) => (b: boolean) => { a.setResult(null); setV({ ...v, [k]: b }); };
  return (
    <Section title="Privacy" description="Everything sensitive is private until you switch it on. Verification badges are earned from verified data whatever you choose to show here.">
      <div className="divide-y divide-[var(--border)]">
        <Toggle checked={v.profilePublic} onChange={set("profilePublic")} label="Public profile" note="Other members can open your profile. Off means only your name and badge show on your posts." />
        <Toggle checked={v.showMonthlyPnl} onChange={set("showMonthlyPnl")} label="Monthly profit and loss" />
        <Toggle checked={v.showWinRate} onChange={set("showWinRate")} label="Win rate" />
        <Toggle checked={v.showHistory} onChange={set("showHistory")} label="Closed trade history" />
        <Toggle checked={v.showBalance} onChange={set("showBalance")} label="Account balance" note="Most traders keep this private. Badges never reveal it." />
        <Toggle checked={v.showOpenPositions} onChange={set("showOpenPositions")} label="Open positions" note="Shown after the delay you choose below." />
        <Toggle checked={v.showEntryPrices && v.showOpenPositions} onChange={set("showEntryPrices")} disabled={!v.showOpenPositions} label="Entry prices of open positions" />
        <Toggle checked={v.showPositionSizes && v.showOpenPositions} onChange={set("showPositionSizes")} disabled={!v.showOpenPositions} label="Position sizes" />
      </div>
      <div className={cn("mt-4 grid gap-1.5", !v.showOpenPositions && "opacity-50")}>
        <span className="text-sm font-medium text-ink">Open-position delay</span>
        <div role="radiogroup" aria-label="Open-position delay" className="inset relative flex flex-wrap rounded-full p-1">
          <SlidingPill watch={v.positionDelayMinutes} className="rounded-full bg-[var(--surface-strong)] shadow-[var(--shadow),0_0_0_1px_color-mix(in_oklab,var(--accent)_14%,transparent)]" />
          {DELAYS.map((d) => (
            <button key={d.v} type="button" role="radio" aria-checked={v.positionDelayMinutes === d.v} disabled={!v.showOpenPositions} data-active={v.positionDelayMinutes === d.v} onClick={() => setV({ ...v, positionDelayMinutes: d.v })} className={cn("relative z-[1] flex-1 rounded-full px-3 py-1.5 text-sm text-ink-2 transition-[color,transform] duration-200 enabled:hover:text-ink enabled:active:scale-[0.97] disabled:cursor-not-allowed", v.positionDelayMinutes === d.v && "font-medium text-accent")}>
              {d.label}
            </button>
          ))}
        </div>
      </div>
      <div className="mt-5 flex flex-wrap items-center justify-end gap-3">
        {a.message}
        <Button onClick={() => a.run(() => updatePrivacy(v))} disabled={a.pending}>{a.pending && <Spinner />}Save privacy</Button>
      </div>
    </Section>
  );
}
