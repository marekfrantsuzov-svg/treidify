"use client";

import { CalendarClock, Check, Crown, Mail, ShieldAlert, Trash2, UserCog } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import type { memberDetail } from "@/server/membership/queries";
import { cancelSubscription, changePlan, deleteMember, endAccess, extendAccess, grantAccess, reinstateMember, revokeAccess, saveNotes, setRole, suspendMember, type AdminResult } from "@/server/actions/admin";
import { Alert, Spinner, inputClass } from "@/components/auth/auth-ui";
import { Modal } from "@/components/intel/modal";
import { Button } from "@/components/ui/button";
import { Pill } from "@/components/ui/pill";
import { toast } from "@/components/ui/toast";
import { cn } from "@/lib/cn";
import { ACTION_LABEL, auditSummary, fmtDate, planLabel, remaining, SOURCE_LABEL, STATE_LABEL, STATE_TONE, tzLabel } from "./format";

type Detail = NonNullable<Awaited<ReturnType<typeof memberDetail>>>;
type Duration = { type: "days"; days: number } | { type: "until"; until: string } | { type: "unlimited" };

const PRESETS = [3, 7, 14, 21, 30, 90];
const MAIL_KIND: Record<string, string> = {
  waitlist_confirmation: "Waitlist confirmation", access_approved: "Access approved", access_expiring: "Access ending soon", access_expired: "Access expired", subscription_available: "Subscriptions available",
};
const MAIL_STATUS: Record<string, { label: string; tone: "up" | "warn" | "down" | "neutral" }> = {
  sent: { label: "Accepted by provider", tone: "up" }, not_configured: { label: "Not configured", tone: "neutral" }, failed: { label: "Failed", tone: "down" }, pending: { label: "Pending", tone: "warn" },
};

/** Shared "run a server action, show the result, refresh the page" behaviour. */
function useOp(onDone?: () => void) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [result, setResult] = useState<AdminResult | null>(null);
  const run = (fn: () => Promise<AdminResult>) => start(async () => {
    const r = await fn();
    setResult(r);
    if (r.ok) { toast(r.message, "success"); onDone?.(); router.refresh(); }
  });
  return { pending, result, run, clear: () => setResult(null) };
}

function Chip({ selected, onClick, children }: { selected: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" role="radio" aria-checked={selected} onClick={onClick}
      className={cn("press h-9 rounded-full border px-3.5 text-[13.5px] transition-colors", selected ? "border-transparent bg-brand font-medium text-white" : "border-line text-ink-2 hover:text-ink")}>
      {children}
    </button>
  );
}

/** Duration picker: presets, custom days, custom date (in the viewer's local time), or unlimited. */
function DurationPicker({ value, onChange, allowUnlimited = true, label = "Duration" }: { value: Duration | null; onChange: (d: Duration | null) => void; allowUnlimited?: boolean; label?: string }) {
  const [mode, setMode] = useState<"preset" | "days" | "date" | "unlimited">("preset");
  const [days, setDays] = useState("");
  const [date, setDate] = useState("");
  return (
    <fieldset className="grid gap-2">
      <legend className="mb-1 text-[13px] font-medium text-ink">{label}</legend>
      <div role="radiogroup" aria-label={label} className="flex flex-wrap gap-1.5">
        {PRESETS.map((d) => <Chip key={d} selected={mode === "preset" && value?.type === "days" && value.days === d} onClick={() => { setMode("preset"); onChange({ type: "days", days: d }); }}>{d} days</Chip>)}
        <Chip selected={mode === "days"} onClick={() => { setMode("days"); onChange(Number(days) > 0 ? { type: "days", days: Number(days) } : null); }}>Custom days</Chip>
        <Chip selected={mode === "date"} onClick={() => { setMode("date"); onChange(date ? { type: "until", until: new Date(date).toISOString() } : null); }}>Custom date</Chip>
        {allowUnlimited && <Chip selected={mode === "unlimited"} onClick={() => { setMode("unlimited"); onChange({ type: "unlimited" }); }}>Unlimited</Chip>}
      </div>
      {mode === "days" && (
        <input aria-label="Number of days" inputMode="numeric" type="number" min={1} max={3650} value={days} placeholder="Number of days"
          onChange={(e) => { setDays(e.target.value); const n = Number(e.target.value); onChange(Number.isInteger(n) && n > 0 ? { type: "days", days: n } : null); }} className={cn(inputClass, "h-10 max-w-48 text-[14px]")} />
      )}
      {mode === "date" && (
        <input aria-label="Expiration date and time" type="datetime-local" value={date}
          onChange={(e) => { setDate(e.target.value); onChange(e.target.value ? { type: "until", until: new Date(e.target.value).toISOString() } : null); }} className={cn(inputClass, "h-10 max-w-64 text-[14px]")} />
      )}
    </fieldset>
  );
}

const describe = (d: Duration | null) => (!d ? "" : d.type === "unlimited" ? "with no end date" : d.type === "days" ? `for ${d.days} day${d.days === 1 ? "" : "s"}` : `until ${new Date(d.until).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" })}`);

function Section({ title, icon: Icon, children, className }: { title: string; icon?: typeof Mail; children: React.ReactNode; className?: string }) {
  return (
    <section className={cn("inset rounded-2xl p-4", className)}>
      <h3 className="mb-3 flex items-center gap-2 text-[14px] font-semibold text-ink">{Icon && <Icon className="h-4 w-4 text-accent" aria-hidden />}{title}</h3>
      {children}
    </section>
  );
}

function Fact({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="text-[12px] text-ink-3">{label}</dt>
      <dd className="mt-0.5 break-words text-[14px] text-ink">{value}</dd>
    </div>
  );
}

/** A two-step button for high-impact actions: the first click shows what will happen and asks to confirm. */
function Confirm({ label, question, confirmLabel, onConfirm, pending, danger, disabled, children }: {
  label: string; question: string; confirmLabel?: string; onConfirm: () => void; pending: boolean; danger?: boolean; disabled?: boolean; children?: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  if (!open) return <Button variant="secondary" size="sm" disabled={disabled} onClick={() => setOpen(true)} className={cn(danger && "text-down")}>{label}</Button>;
  return (
    <div role="alertdialog" aria-label={label} className={cn("grid w-full gap-2.5 rounded-2xl border p-3", danger ? "border-[color-mix(in_oklab,var(--down)_45%,transparent)]" : "border-line")}>
      <p className="text-[13.5px] text-ink">{question}</p>
      {children}
      <div className="flex flex-wrap gap-2">
        <Button size="sm" disabled={pending} onClick={onConfirm} className={cn(danger && "bg-[var(--down)] hover:bg-[color-mix(in_oklab,var(--down)_85%,black)]")}>{pending && <Spinner />}{confirmLabel ?? "Confirm"}</Button>
        <Button size="sm" variant="ghost" onClick={() => setOpen(false)} disabled={pending}>Cancel</Button>
      </div>
    </div>
  );
}

export function MemberPanel({ detail, actor, tz, now, closeHref, billing, email }: {
  detail: Detail; actor: { owner: boolean; id: string }; tz: string; now: string; closeHref: string; billing: boolean; email: boolean;
}) {
  const router = useRouter();
  const d = detail;
  const m = d.membership;
  const status = m?.status ?? "pending";
  const target = { owner: d.owner, admin: m?.role === "admin" };
  const canManage = !d.owner && (actor.owner || !target.admin);
  const ownerOnly = actor.owner && !d.owner;
  const active = d.state === "active";
  const open = d.open;
  const openActive = !!open && (!open.endsAt || new Date(open.endsAt) > new Date(now));
  const close = () => router.push(closeHref, { scroll: false });

  // Grant form
  const [kind, setKind] = useState<"complimentary" | "trial">("complimentary");
  const [plan, setPlan] = useState<"premium" | "essential">("premium");
  const [dur, setDur] = useState<Duration | null>({ type: "days", days: 21 });
  const [note, setNote] = useState("");
  const grant = useOp();
  // Extend
  const [ext, setExt] = useState<Duration | null>(null);
  const extend = useOp();
  const op = useOp();
  const [notes, setNotes] = useState(m?.notes ?? "");
  const notesOp = useOp();
  const [reason, setReason] = useState("");
  const [confirmEmail, setConfirmEmail] = useState("");
  const del = useOp(close);

  const accessLine = d.state === "owner" ? "Owner · Premium, never expires"
    : active ? `${SOURCE_LABEL[d.source ?? ""] ?? "Active"} ${planLabel(open?.plan ?? d.entitlement?.plan)}`
    : STATE_LABEL[d.state];
  const membershipEnd = d.state === "owner" ? "Never" : d.source === "subscription" ? fmtDate(d.entitlement?.premiumUntil, tz) : openActive ? (open!.endsAt ? fmtDate(open!.endsAt, tz) : "Unlimited") : open?.endsAt ? `${fmtDate(open.endsAt, tz)} (ended)` : "—";
  const left = active && open?.endsAt ? remaining(open.endsAt, now) : null;
  const payment = d.subscription?.stripeSubscriptionId ? `${d.subscription.status}${d.subscription.cancelAtPeriodEnd ? " · cancels at period end" : ""}` : billing ? "No subscription" : "No payment · payments not connected";

  return (
    <Modal open onClose={close} title={d.user.name} subtitle={<span className="break-all">{d.user.email}</span>} className="sm:max-w-3xl">
      <div className="grid gap-4" data-testid="member-panel">
        <div className="flex flex-wrap items-center gap-2">
          <Pill tone={STATE_TONE[d.state]} data-testid="member-state">{STATE_LABEL[d.state]}</Pill>
          {target.admin && <Pill tone="accent">Admin</Pill>}
          {!d.user.emailVerified && <Pill tone="warn">Email not verified</Pill>}
          {left && <span className="text-[13px] text-ink-2" data-testid="member-remaining">{left}</span>}
        </div>

        <Section title="Member">
          <dl className="grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-3">
            <Fact label="Registered" value={fmtDate(d.user.createdAt, tz)} />
            <Fact label="Last sign-in" value={d.lastLogin ? fmtDate(d.lastLogin, tz) : "Never recorded"} />
            <Fact label="Country" value={d.profile?.country ?? "Not provided"} />
            <Fact label="Selected plan" value={planLabel(m?.selectedPlan)} />
            <Fact label="Current access" value={accessLine} />
            <Fact label="Membership expiration" value={membershipEnd} />
            <Fact label="Trial start" value={d.firstTrial ? fmtDate(d.firstTrial.startsAt, tz) : "No trial"} />
            <Fact label="Trial expiration" value={d.firstTrial ? (d.firstTrial.endsAt ? fmtDate(d.firstTrial.endsAt, tz) : "Unlimited") : "—"} />
            <Fact label="Payment status" value={payment} />
            <Fact label="Approved" value={m?.approvedAt ? fmtDate(m.approvedAt, tz) : "Not yet"} />
            <Fact label="Trading accounts" value={d.tradingAccounts} />
            <Fact label="Onboarding" value={d.profile?.onboardedAt ? "Completed" : "Not finished"} />
          </dl>
          {status === "suspended" && m?.suspendReason && <p className="mt-3 text-[13px] text-down">Suspended: {m.suspendReason}</p>}
        </Section>

        {d.owner ? (
          <Alert tone="accent">This is the owner account. Its access never expires and cannot be suspended, revoked or deleted here.</Alert>
        ) : !canManage ? (
          <Alert tone="warn">Only the owner can change an admin.</Alert>
        ) : status === "suspended" ? (
          <Section title="Suspended" icon={ShieldAlert}>
            <p className="mb-3 text-[13.5px] text-ink-2">This member is blocked. Their data is kept. Reinstating restores any access that has not expired.</p>
            {ownerOnly && <Confirm label="Reinstate member" question={`Reinstate ${d.user.name}?`} pending={op.pending} onConfirm={() => op.run(() => reinstateMember(d.user.id))} />}
          </Section>
        ) : (
          <>
            {/* Approve / grant */}
            <Section title={status === "approved" ? (openActive ? "Replace access" : "Grant access") : "Approve and grant access"} icon={Check}>
              <div className="grid gap-4">
                <fieldset>
                  <legend className="mb-1 text-[13px] font-medium text-ink">Access type</legend>
                  <div role="radiogroup" aria-label="Access type" className="flex flex-wrap gap-1.5">
                    <Chip selected={kind === "complimentary" && plan === "premium"} onClick={() => { setKind("complimentary"); setPlan("premium"); }}>Complimentary Premium</Chip>
                    <Chip selected={kind === "trial"} onClick={() => { setKind("trial"); setPlan("premium"); }}>Free trial (Premium)</Chip>
                    <Chip selected={kind === "complimentary" && plan === "essential"} onClick={() => { setKind("complimentary"); setPlan("essential"); }}>Complimentary Essential</Chip>
                  </div>
                  <p className="mt-1.5 text-[12.5px] text-ink-3">Manual access never charges the member and creates no subscription or payment.</p>
                </fieldset>
                <DurationPicker value={dur} onChange={setDur} />
                <label className="grid gap-1">
                  <span className="text-[13px] font-medium text-ink">Note (optional, internal)</span>
                  <input value={note} onChange={(e) => setNote(e.target.value)} maxLength={500} className={cn(inputClass, "h-10 text-[14px]")} placeholder="e.g. Early tester, gold scalper" />
                </label>
                <Confirm
                  label={status === "approved" ? (openActive ? "Replace access" : "Grant access") : "Approve"}
                  question={`${status === "approved" ? "Give" : "Approve and give"} ${d.user.name} ${kind === "trial" ? "a free" : "complimentary"} ${plan === "premium" ? "Premium" : "Essential"} ${kind === "trial" ? "trial" : "access"} ${describe(dur)}?${openActive ? " This replaces their current access." : ""}${email ? " They will get an approval email." : " Email is not configured, so no email will be sent."}`}
                  confirmLabel="Confirm"
                  disabled={!dur}
                  pending={grant.pending}
                  onConfirm={() => dur && grant.run(() => grantAccess({ userId: d.user.id, kind, plan, duration: dur, note: note || null }))}
                />
                {grant.result && !grant.result.ok && <Alert>{grant.result.error}</Alert>}
              </div>
            </Section>

            {/* Extend / change while active */}
            {status === "approved" && open && (
              <Section title="Extend access" icon={CalendarClock}>
                <div className="grid gap-3">
                  <p className="text-[13px] text-ink-2">Currently {openActive ? (open.endsAt ? `until ${fmtDate(open.endsAt, tz)}` : "unlimited") : `lapsed on ${fmtDate(open.endsAt, tz)}`}. Days are added to the current end{openActive ? "" : " (from now, since it lapsed)"}.</p>
                  <DurationPicker value={ext} onChange={setExt} label="Add or set" />
                  <Confirm label="Extend" question={`Extend ${d.user.name}'s access ${ext?.type === "days" ? `by ${ext.days} day${ext.days === 1 ? "" : "s"}` : describe(ext)}?`} disabled={!ext} pending={extend.pending} onConfirm={() => ext && extend.run(() => extendAccess({ userId: d.user.id, duration: ext }))} />
                  {extend.result && !extend.result.ok && <Alert>{extend.result.error}</Alert>}
                </div>
              </Section>
            )}

            <Section title="Membership plan" icon={UserCog}>
              <p className="mb-2.5 text-[12.5px] text-ink-3">Essential and Premium record the paid plan for later; they grant nothing and charge nothing. Complimentary Premium and Free trial change the current manual access.</p>
              <div className="flex flex-wrap gap-1.5">
                <Button size="sm" variant="secondary" disabled={op.pending} onClick={() => op.run(() => changePlan({ userId: d.user.id, choice: "essential_paid" }))}>Essential · $24/mo</Button>
                <Button size="sm" variant="secondary" disabled={op.pending} onClick={() => op.run(() => changePlan({ userId: d.user.id, choice: "premium_paid" }))}>Premium · $49/mo</Button>
                <Button size="sm" variant="secondary" disabled={op.pending || !openActive} onClick={() => op.run(() => changePlan({ userId: d.user.id, choice: "complimentary_premium" }))}>Complimentary Premium</Button>
                <Button size="sm" variant="secondary" disabled={op.pending || !openActive} onClick={() => op.run(() => changePlan({ userId: d.user.id, choice: "trial_premium" }))}>Free trial</Button>
              </div>
            </Section>

            <Section title="Access controls" icon={ShieldAlert}>
              <div className="grid gap-3 text-[12.5px] text-ink-3">
                <div className="flex flex-wrap gap-2">
                  {openActive && (
                    <Confirm label="End membership now" question="End the current manual access now? The member stays approved and sees the expired screen. Nothing is deleted." pending={op.pending} onConfirm={() => op.run(() => endAccess(d.user.id))} />
                  )}
                  {d.subscription?.stripeSubscriptionId && billing && ownerOnly && (
                    <>
                      <Confirm label="Cancel at period end" question="Cancel the paid subscription at the end of the current period?" pending={op.pending} onConfirm={() => op.run(() => cancelSubscription({ userId: d.user.id, atPeriodEnd: true }))} />
                      <Confirm label="Cancel immediately" danger question="Cancel the paid subscription immediately? Paid access ends now, subject to the payment provider's rules." pending={op.pending} onConfirm={() => op.run(() => cancelSubscription({ userId: d.user.id, atPeriodEnd: false }))} />
                    </>
                  )}
                  {ownerOnly && status !== "revoked" && (
                    <Confirm label="Revoke access" danger question="Revoke this member's access? Their entitlement is removed; the account and all data stay." pending={op.pending} onConfirm={() => op.run(() => revokeAccess({ userId: d.user.id, reason }))}>
                      <input value={reason} onChange={(e) => setReason(e.target.value)} maxLength={500} placeholder="Reason (optional, internal)" className={cn(inputClass, "h-10 text-[14px]")} aria-label="Reason" />
                    </Confirm>
                  )}
                  {ownerOnly && status === "revoked" && <Confirm label="Restore approval" question="Restore this member's approval (no access until you grant it)?" pending={op.pending} onConfirm={() => op.run(() => reinstateMember(d.user.id))} />}
                  {ownerOnly && (
                    <Confirm label="Suspend" danger question="Suspend this member? They are signed out and blocked immediately. Their data is kept." pending={op.pending} onConfirm={() => op.run(() => suspendMember({ userId: d.user.id, reason }))}>
                      <input value={reason} onChange={(e) => setReason(e.target.value)} maxLength={500} placeholder="Reason (optional, internal)" className={cn(inputClass, "h-10 text-[14px]")} aria-label="Suspension reason" />
                    </Confirm>
                  )}
                </div>
                {!actor.owner && <p>Suspending, revoking, deleting and roles are owner-only.</p>}
                <p><strong className="text-ink-2">End</strong> stops manual access now · <strong className="text-ink-2">Revoke</strong> removes the entitlement · <strong className="text-ink-2">Suspend</strong> blocks the account · <strong className="text-ink-2">Delete</strong> removes it permanently. Only delete removes data.</p>
              </div>
              {op.result && !op.result.ok && <div className="mt-3"><Alert>{op.result.error}</Alert></div>}
            </Section>

            {ownerOnly && (
              <Section title="Role" icon={Crown}>
                <p className="mb-2.5 text-[12.5px] text-ink-3">Admins can view members, approve, grant, extend and handle feedback. They cannot suspend, revoke, delete or change roles.</p>
                {target.admin
                  ? <Confirm label="Remove admin" question="Remove admin permissions?" pending={op.pending} onConfirm={() => op.run(() => setRole({ userId: d.user.id, role: "member" }))} />
                  : <Confirm label="Make admin" question={`Give ${d.user.name} admin permissions?`} disabled={status !== "approved"} pending={op.pending} onConfirm={() => op.run(() => setRole({ userId: d.user.id, role: "admin" }))} />}
              </Section>
            )}
          </>
        )}

        <Section title="Internal notes">
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} maxLength={5000} aria-label="Internal notes" className={cn(inputClass, "h-auto min-h-24 py-3 text-[14px]")} placeholder="Only the owner and admins see these notes." />
          <div className="mt-2 flex items-center gap-2">
            <Button size="sm" variant="secondary" disabled={notesOp.pending || notes === (m?.notes ?? "")} onClick={() => notesOp.run(() => saveNotes({ userId: d.user.id, notes }))}>{notesOp.pending && <Spinner />}Save notes</Button>
            {notesOp.result && !notesOp.result.ok && <span className="text-[13px] text-down">{notesOp.result.error}</span>}
          </div>
        </Section>

        <Section title="Approval history">
          {d.history.length === 0 ? <p className="text-[13px] text-ink-3">No administrative changes yet.</p> : (
            <ol className="grid gap-2.5" data-testid="member-history">
              {d.history.map(({ a, actorName }) => (
                <li key={a.id} className="text-[13.5px]">
                  <span className="font-medium text-ink">{ACTION_LABEL[a.action] ?? a.action}</span>
                  <span className="text-ink-3"> · {fmtDate(a.createdAt, tz)} · {actorName ? `by ${actorName}` : "by the system"}</span>
                  {auditSummary(a.action, a.meta, tz) && <span className="block text-[12.5px] text-ink-3">{auditSummary(a.action, a.meta, tz)}</span>}
                </li>
              ))}
            </ol>
          )}
        </Section>

        <Section title="Emails" icon={Mail}>
          {d.mails.length === 0 ? <p className="text-[13px] text-ink-3">No membership emails yet.</p> : (
            <ul className="grid gap-2">
              {d.mails.map((n) => (
                <li key={n.id} className="flex flex-wrap items-center justify-between gap-2 text-[13.5px]">
                  <span className="text-ink">{MAIL_KIND[n.kind] ?? n.kind} <span className="text-ink-3">· {fmtDate(n.createdAt, tz)}</span></span>
                  <Pill tone={MAIL_STATUS[n.status]?.tone ?? "neutral"}>{MAIL_STATUS[n.status]?.label ?? n.status}</Pill>
                </li>
              ))}
            </ul>
          )}
        </Section>

        {ownerOnly && (
          <section className="rounded-2xl border border-[color-mix(in_oklab,var(--down)_40%,transparent)] p-4">
            <h3 className="mb-1 flex items-center gap-2 text-[14px] font-semibold text-down"><Trash2 className="h-4 w-4" aria-hidden />Delete member</h3>
            <p className="mb-3 text-[12.5px] text-ink-3">Permanently deletes the account, profile, journal, synced trading data and feedback. Connected trading accounts are removed from the sync provider first, so it no longer holds their MetaTrader access. This cannot be undone.</p>
            <Confirm label="Delete member…" danger confirmLabel="Delete permanently" question={`Type ${d.user.email} to confirm.`} disabled={false} pending={del.pending} onConfirm={() => del.run(() => deleteMember({ userId: d.user.id, confirmEmail }))}>
              <input value={confirmEmail} onChange={(e) => setConfirmEmail(e.target.value)} aria-label="Type the member's email to confirm" autoComplete="off" className={cn(inputClass, "h-10 text-[14px]")} placeholder={d.user.email} />
            </Confirm>
            {del.result && !del.result.ok && <div className="mt-3"><Alert>{del.result.error}</Alert></div>}
          </section>
        )}
        <p className="text-[12px] text-ink-3">Times in {tzLabel(tz)}.</p>
      </div>
    </Modal>
  );
}
