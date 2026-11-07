"use client";

import { Search } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { announceSubscriptions, setFeedbackStatus } from "@/server/actions/admin";
import { inputClass, Spinner } from "@/components/auth/auth-ui";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toast";
import { cn } from "@/lib/cn";

const selectClass = cn(inputClass, "h-10 appearance-none rounded-full pr-8 text-[14px]");

/** Search (debounced), status/plan filters and sorting, all kept in the URL so links and back/forward work. */
export function MemberFilters({ q, state, plan, sort, dir, stateOptions }: { q: string; state: string; plan: string; sort: string; dir: string; stateOptions: string[] }) {
  const router = useRouter();
  const path = usePathname();
  const params = useSearchParams();
  const [text, setText] = useState(q);
  const [pending, start] = useTransition();
  const push = (patch: Record<string, string>) => {
    const sp = new URLSearchParams(params.toString());
    for (const [k, v] of Object.entries(patch)) { if (v) sp.set(k, v); else sp.delete(k); }
    sp.delete("page"); sp.delete("member");
    start(() => router.replace(`${path}?${sp.toString()}`, { scroll: false }));
  };
  useEffect(() => {
    if (text === q) return;
    const t = setTimeout(() => push({ q: text.trim() }), 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text]);
  const label = (s: string) => s[0]!.toUpperCase() + s.slice(1);
  return (
    <div className="grid gap-2.5 md:grid-cols-[1fr_auto_auto_auto]">
      <label className="relative block">
        <span className="sr-only">Search by name or email</span>
        <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-3" aria-hidden />
        <input type="search" value={text} onChange={(e) => setText(e.target.value)} placeholder="Search name or email" className={cn(inputClass, "h-10 rounded-full pl-10 text-[14px]")} />
        {pending && <span className="absolute right-3 top-1/2 -translate-y-1/2"><Spinner /></span>}
      </label>
      {stateOptions.length > 1 && (
        <select aria-label="Access status" value={state} onChange={(e) => push({ state: e.target.value })} className={selectClass}>
          <option value="">All statuses</option>
          {stateOptions.map((s) => <option key={s} value={s}>{label(s)}</option>)}
        </select>
      )}
      <select aria-label="Selected plan" value={plan} onChange={(e) => push({ plan: e.target.value })} className={selectClass}>
        <option value="">All plans</option>
        <option value="premium">Premium</option>
        <option value="essential">Essential</option>
        <option value="none">Not chosen</option>
      </select>
      <select aria-label="Sort" value={`${sort}:${dir}`} onChange={(e) => { const [s, d] = e.target.value.split(":"); push({ sort: s!, dir: d! }); }} className={selectClass}>
        <option value="registered:desc">Newest registrations</option>
        <option value="registered:asc">Oldest registrations</option>
        <option value="expires:asc">Expiring soonest</option>
        <option value="expires:desc">Expiring latest</option>
      </select>
    </div>
  );
}

export function FeedbackStatusSelect({ id, status }: { id: string; status: "new" | "reviewing" | "resolved" }) {
  const router = useRouter();
  const [value, setValue] = useState(status);
  const [pending, start] = useTransition();
  return (
    <select
      aria-label="Feedback status"
      value={value}
      disabled={pending}
      onChange={(e) => {
        const v = e.target.value as typeof status;
        const prev = value;
        setValue(v);
        start(async () => {
          const r = await setFeedbackStatus({ id, status: v });
          if (!r.ok) { setValue(prev); toast(r.error, "warn"); return; }
          toast(r.message, "success");
          router.refresh();
        });
      }}
      className={cn(selectClass, "h-9 w-auto min-w-32")}
    >
      <option value="new">New</option>
      <option value="reviewing">Reviewing</option>
      <option value="resolved">Resolved</option>
    </select>
  );
}

/** Emails every pending member that subscriptions are open. Disabled until payments are actually connected. */
export function AnnounceButton({ enabled }: { enabled: boolean }) {
  const [confirm, setConfirm] = useState(false);
  const [pending, start] = useTransition();
  return (
    <div className="mt-4 border-t border-line pt-4">
      <p className="text-[13px] font-medium text-ink">Subscription available email</p>
      <p className="mt-0.5 text-[12.5px] text-ink-3">{enabled ? "Tell everyone on the waitlist that they can subscribe now. Each person is emailed once." : "Available once payments are connected, so nobody is told they can subscribe before they can."}</p>
      {!confirm ? (
        <Button variant="secondary" size="sm" className="mt-2.5" disabled={!enabled} onClick={() => setConfirm(true)}>Email the waitlist</Button>
      ) : (
        <div role="alertdialog" aria-label="Confirm email to the waitlist" className="mt-2.5 flex flex-wrap items-center gap-2">
          <span className="text-[13px] text-ink-2">Send to every pending member?</span>
          <Button size="sm" disabled={pending} onClick={() => start(async () => { const r = await announceSubscriptions(); toast(r.ok ? r.message : r.error, r.ok ? "success" : "warn"); setConfirm(false); })}>{pending && <Spinner />}Send</Button>
          <Button size="sm" variant="ghost" onClick={() => setConfirm(false)}>Cancel</Button>
        </div>
      )}
    </div>
  );
}
