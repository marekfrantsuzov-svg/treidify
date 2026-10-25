"use client";

import { useState, useTransition } from "react";
import { instrumentChoices } from "@/config/onboarding";
import { cn } from "@/lib/cn";
import { updatePreferences, type ActionResult } from "@/server/actions/settings";
import { Alert, Field, Spinner, inputClass } from "@/components/auth/auth-ui";
import { Choice, Segmented, allZones } from "@/components/onboarding/onboarding-flow";
import { Button } from "@/components/ui/button";
import { Section, Toggle } from "./ui";

export interface PrefsInitial {
  timezone: string;
  instruments: string[];
  density: "comfortable" | "compact";
  defaultTimeframe: "4H" | "1H" | "15M";
  showSessions: boolean;
  startPage: "dashboard" | "markets" | "journal";
  aiConsent: boolean;
}

export function PreferencesForm({ initial }: { initial: PrefsInitial }) {
  const [v, setV] = useState(initial);
  const [pending, start] = useTransition();
  const [r, setR] = useState<ActionResult | null>(null);
  const zones = allZones.includes(v.timezone) ? allZones : [v.timezone, ...allZones];
  return (
    <div className="grid gap-4">
      <Section title="Time and dashboard" description="Sessions, daily reviews and period boundaries such as This Month use your time zone.">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Time zone">
            <select value={v.timezone} onChange={(e) => setV({ ...v, timezone: e.target.value })} className={cn(inputClass, "appearance-none")}>
              {zones.map((z) => <option key={z} value={z}>{z.replaceAll("_", " ")}</option>)}
            </select>
          </Field>
          <Segmented label="Default chart timeframe" value={v.defaultTimeframe} onChange={(x) => setV({ ...v, defaultTimeframe: x })} options={[{ id: "4H", label: "4H" }, { id: "1H", label: "1H" }, { id: "15M", label: "15M" }]} />
          <Segmented label="Density" value={v.density} onChange={(x) => setV({ ...v, density: x })} options={[{ id: "comfortable", label: "Comfortable" }, { id: "compact", label: "Compact" }]} />
          <Segmented label="Open Treidify on" value={v.startPage} onChange={(x) => setV({ ...v, startPage: x })} options={[{ id: "dashboard", label: "Dashboard" }, { id: "markets", label: "Markets" }, { id: "journal", label: "Journal" }]} />
        </div>
        <div className="mt-2 divide-y divide-[var(--border)]">
          <Toggle checked={v.showSessions} onChange={(b) => setV({ ...v, showSessions: b })} label="Show trading sessions" note="Asia, London and New York windows on charts and the top bar." />
          <Toggle checked={v.aiConsent} onChange={(b) => setV({ ...v, aiConsent: b })} label="Allow AI analysis of my trading data" note="The coach and Macro Desk read your synced history only while this is on." />
        </div>
      </Section>
      <Section title="Markets you follow">
        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
          {instrumentChoices.map((c) => {
            const on = v.instruments.includes(c.id);
            return <Choice key={c.id} multi selected={on} title={c.label} note={c.note} onClick={() => setV({ ...v, instruments: on ? v.instruments.filter((x) => x !== c.id) : [...v.instruments, c.id] })} />;
          })}
        </div>
      </Section>
      <div className="flex flex-wrap items-center justify-end gap-3">
        {r && <Alert tone={r.ok ? "up" : "down"}>{r.ok ? r.message : r.error}</Alert>}
        <Button size="lg" disabled={pending} onClick={() => start(async () => setR(await updatePreferences(v)))}>{pending && <Spinner />}Save preferences</Button>
      </div>
    </div>
  );
}
