"use client";

import { ArrowLeft, Check, LineChart, Link2, ShieldCheck, Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { experienceChoices, instrumentChoices, onboardingSteps } from "@/config/onboarding";
import { TRIAL_HOURS } from "@/config/plans";
import { cn } from "@/lib/cn";
import { saveOnboardingStep, type StepInput } from "@/server/actions/onboarding";
import { Alert, Field, Spinner, UsernameInput, inputClass } from "@/components/auth/auth-ui";
import { Button } from "@/components/ui/button";
import { Glass } from "@/components/ui/glass";

export interface OnboardingInitial {
  step: number;
  name: string;
  username: string;
  experience: string | null;
  instruments: string[];
  timezone: string;
  prefs: { density: "comfortable" | "compact"; defaultTimeframe: "4H" | "1H" | "15M"; showSessions: boolean; startPage: "dashboard" | "markets" | "journal" };
  trialAvailable: boolean;
  wantsTrial: boolean;
  syncAvailable: boolean;
}

export function Choice({ selected, onClick, title, note, multi }: { selected: boolean; onClick: () => void; title: string; note?: string; multi?: boolean }) {
  return (
    <button
      type="button"
      role={multi ? "checkbox" : "radio"}
      aria-checked={selected}
      onClick={onClick}
      className={cn("inset flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left transition-[box-shadow,border-color]", selected && "border-accent shadow-[0_0_0_3px_var(--accent-soft)]")}
    >
      <span className={cn("grid h-5 w-5 shrink-0 place-items-center border border-[var(--border-strong)] transition-colors", multi ? "rounded-md" : "rounded-full", selected && "border-accent bg-accent text-white")}>
        {selected && <Check className="h-3 w-3" strokeWidth={3} />}
      </span>
      <span className="min-w-0">
        <span className="block text-[15px] font-medium text-ink">{title}</span>
        {note && <span className="block text-[13px] text-ink-3">{note}</span>}
      </span>
    </button>
  );
}

export function Segmented<T extends string>({ label, value, options, onChange }: { label: string; value: T; options: { id: T; label: string }[]; onChange: (v: T) => void }) {
  return (
    <div className="grid gap-1.5">
      <span className="text-sm font-medium text-ink">{label}</span>
      <div role="radiogroup" aria-label={label} className="inset grid auto-cols-fr grid-flow-col rounded-full p-1">
        {options.map((o) => (
          <button key={o.id} type="button" role="radio" aria-checked={value === o.id} onClick={() => onChange(o.id)} className={cn("h-9 rounded-full text-sm text-ink-2 transition-colors", value === o.id && "bg-surface-strong font-medium text-ink shadow-sm")}>
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}

export const allZones = (() => { try { return Intl.supportedValuesOf("timeZone"); } catch { return ["UTC"]; } })();

export function OnboardingFlow({ initial }: { initial: OnboardingInitial }) {
  const router = useRouter();
  const [step, setStep] = useState(Math.min(Math.max(initial.step + 1, 1), onboardingSteps.length));
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const [name, setName] = useState(initial.name);
  const [username, setUsername] = useState(initial.username);
  const [experience, setExperience] = useState(initial.experience);
  const [instruments, setInstruments] = useState<string[]>(initial.instruments.length ? initial.instruments : ["XAUUSD", "DXY"]);
  const detected = useMemo(() => Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC", []);
  const [timezone, setTimezone] = useState(initial.timezone !== "UTC" ? initial.timezone : detected);
  const [prefs, setPrefs] = useState(initial.prefs);
  const [risk, setRisk] = useState(false);
  const [ai, setAi] = useState(true);
  const [trial, setTrial] = useState(initial.trialAvailable && initial.wantsTrial);

  const payload = (): StepInput | null => {
    switch (step) {
      case 1: return { step: 1, name, username };
      case 2: return experience ? { step: 2, experience: experience as "beginner" } : null;
      case 3: return { step: 3, instruments };
      case 4: return { step: 4, timezone };
      case 5: return { step: 5, ...prefs };
      case 6: return { step: 6, choice: "later" };
      case 7: return { step: 7, riskAcknowledged: risk as true, aiConsent: ai, startTrial: trial };
      default: return null;
    }
  };

  const next = () => {
    const p = payload();
    if (!p) return setError("Choose one option to continue.");
    setError(null);
    start(async () => {
      const r = await saveOnboardingStep(p);
      if (!r.ok) return setError(r.error);
      if (r.done) { router.replace(`/app${trial ? "?welcome=trial" : "?welcome=1"}`); router.refresh(); return; }
      setStep(r.next);
      window.scrollTo({ top: 0 });
    });
  };

  const titles: Record<number, [string, string]> = {
    1: ["Welcome to Treidify", "Let’s set up your trading intelligence. This takes about two minutes."],
    2: ["How long have you been trading?", "The coach and explanations adapt their depth to your experience."],
    3: ["Which markets do you trade?", "Gold and the Dollar Index lead the platform. Choose any others you follow."],
    4: ["Confirm your time zone", "Sessions, daily reviews and event times use this zone."],
    5: ["Shape your dashboard", "You can change any of this later in Settings."],
    6: ["Connect your trading account", "Account Health, the journal and the coach are built from your real MetaTrader history."],
    7: ["You’re ready", "Two last things before you enter your dashboard."],
  };
  const [title, subtitle] = titles[step]!;

  return (
    <div className="w-full max-w-[560px]">
      <ol className="mb-6 flex items-center gap-1.5" aria-label={`Step ${step} of ${onboardingSteps.length}`}>
        {onboardingSteps.map((label, i) => (
          <li key={label} title={label} className={cn("h-1.5 flex-1 rounded-full bg-[var(--border-strong)] transition-colors duration-500", i < step && "bg-accent")} />
        ))}
      </ol>
      <Glass strong className="p-6 shadow-[var(--shadow-lg)] sm:p-8">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-accent">Step {step} of {onboardingSteps.length} · {onboardingSteps[step - 1]}</p>
        <h1 className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-ink sm:text-[28px]">{title}</h1>
        <p className="mt-1.5 text-[15px] text-ink-2">{subtitle}</p>

        <div key={step} className="rise mt-6 grid gap-4">
          {step === 1 && (
            <>
              <Field label="Your name"><input value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" className={inputClass} /></Field>
              <Field label="Username" hint={<span className="text-xs font-normal text-ink-3">Shown in the community</span>}>
                <UsernameInput value={username} onChange={(e) => setUsername(e.target.value.replace(/\s/g, ""))} placeholder="yourname" />
              </Field>
            </>
          )}

          {step === 2 && (
            <div role="radiogroup" aria-label="Experience" className="grid gap-2.5">
              {experienceChoices.map((c) => <Choice key={c.id} selected={experience === c.id} onClick={() => setExperience(c.id)} title={c.label} note={c.note} />)}
            </div>
          )}

          {step === 3 && (
            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
              {instrumentChoices.map((c) => {
                const on = instruments.includes(c.id);
                return <Choice key={c.id} multi selected={on} title={c.label} note={c.note} onClick={() => setInstruments((s) => (on ? s.filter((x) => x !== c.id) : [...s, c.id]))} />;
              })}
            </div>
          )}

          {step === 4 && (
            <>
              <Field label="Time zone">
                <select value={timezone} onChange={(e) => setTimezone(e.target.value)} className={cn(inputClass, "appearance-none")}>
                  {(allZones.includes(timezone) ? allZones : [timezone, ...allZones]).map((z) => <option key={z} value={z}>{z.replaceAll("_", " ")}</option>)}
                </select>
              </Field>
              <p className="text-sm text-ink-3">Detected from this device: {detected.replaceAll("_", " ")}. Local time now {new Intl.DateTimeFormat("en-GB", { timeZone: timezone, hour: "2-digit", minute: "2-digit" }).format(new Date())}.</p>
            </>
          )}

          {step === 5 && (
            <>
              <Segmented label="Default chart timeframe" value={prefs.defaultTimeframe} onChange={(v) => setPrefs({ ...prefs, defaultTimeframe: v })} options={[{ id: "4H", label: "4H" }, { id: "1H", label: "1H" }, { id: "15M", label: "15M" }]} />
              <Segmented label="Density" value={prefs.density} onChange={(v) => setPrefs({ ...prefs, density: v })} options={[{ id: "comfortable", label: "Comfortable" }, { id: "compact", label: "Compact" }]} />
              <Segmented label="Open Treidify on" value={prefs.startPage} onChange={(v) => setPrefs({ ...prefs, startPage: v })} options={[{ id: "dashboard", label: "Dashboard" }, { id: "markets", label: "Markets" }, { id: "journal", label: "Journal" }]} />
              <Choice multi selected={prefs.showSessions} onClick={() => setPrefs({ ...prefs, showSessions: !prefs.showSessions })} title="Show trading sessions" note="Asia, London and New York windows on charts and the top bar." />
            </>
          )}

          {step === 6 && (
            <>
              <div className="inset grid gap-3 rounded-2xl p-4 text-sm text-ink-2">
                <p className="flex gap-3"><ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-up" /> Read-only. Treidify uses your MetaTrader investor password, which cannot place trades or withdraw funds.</p>
                <p className="flex gap-3"><LineChart className="mt-0.5 h-4 w-4 shrink-0 text-accent" /> Your full history is imported, then kept in sync automatically.</p>
                <p className="flex gap-3"><Link2 className="mt-0.5 h-4 w-4 shrink-0 text-accent" /> MT4 and MT5, with any broker supported by the sync provider.</p>
              </div>
              {initial.syncAvailable ? null : (
                <Alert tone="warn">Account sync is being switched on. You can explore everything else now, and you’ll be able to connect from the dashboard as soon as it’s live.</Alert>
              )}
            </>
          )}

          {step === 7 && (
            <>
              <Choice multi selected={risk} onClick={() => setRisk(!risk)} title="I understand the risks" note="Treidify is information and education, not investment advice. It never places trades. Trading involves risk, including loss of capital." />
              <Choice multi selected={ai} onClick={() => setAi(!ai)} title="Allow AI analysis of my trading data" note="Lets the coach and Macro Desk read your synced history to explain it. You can turn this off anytime." />
              {initial.trialAvailable ? (
                <Choice multi selected={trial} onClick={() => setTrial(!trial)} title={`Start my ${TRIAL_HOURS}-hour Premium trial`} note="Free, no card. It ends on its own and never turns into a paid plan." />
              ) : (
                <p className="text-sm text-ink-3">Your Premium trial has already been used on this account.</p>
              )}
            </>
          )}

          {error && <Alert>{error}</Alert>}
        </div>

        <div className="mt-8 flex items-center gap-3">
          {step > 1 && (
            <Button variant="ghost" onClick={() => { setError(null); setStep(step - 1); }} disabled={pending} aria-label="Back"><ArrowLeft className="h-4 w-4" />Back</Button>
          )}
          <Button size="lg" className="ml-auto min-w-40" onClick={next} disabled={pending || (step === 7 && !risk)}>
            {pending && <Spinner />}
            {step === 6 ? "Continue without connecting" : step === 7 ? <><Sparkles className="h-4 w-4" />Enter my dashboard</> : "Continue"}
          </Button>
        </div>
      </Glass>
    </div>
  );
}
