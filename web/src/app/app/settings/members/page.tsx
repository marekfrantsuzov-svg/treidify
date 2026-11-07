import type { Metadata } from "next";
import Link from "next/link";
import { after } from "next/server";
import { AlertTriangle, CheckCircle2, Clock3, Crown, Gift, Hourglass, MessageSquareText, ShieldOff, Sparkles, Users } from "lucide-react";
import { AdminTabs } from "@/components/admin/admin-tabs";
import { AnnounceButton, FeedbackStatusSelect, MemberFilters } from "@/components/admin/admin-controls";
import { MemberPanel } from "@/components/admin/member-panel";
import { ACTION_LABEL, auditSummary, fmtDate, planLabel, remaining, SOURCE_LABEL, STATE_LABEL, STATE_TONE, tzLabel } from "@/components/admin/format";
import { EmptyState } from "@/components/app/status";
import { Card, CardHeader } from "@/components/ui/card";
import { Pill } from "@/components/ui/pill";
import { cn } from "@/lib/cn";
import { stripeStatus } from "@/server/billing/stripe";
import { emailConfigured } from "@/server/email";
import { activityLog, emailStats, listFeedback, listMembers, memberDetail, memberStats, recentPending, type MemberRow, type MemberTab } from "@/server/membership/queries";
import { maybeSweep } from "@/server/membership/sweep";
import { requireStaff } from "@/server/session";

export const metadata: Metadata = { title: "Members" };
export const dynamic = "force-dynamic";

type SP = Record<string, string | undefined>;
const TABS = ["overview", "all", "pending", "active", "inactive", "feedback", "activity"] as const;
type Tab = (typeof TABS)[number];

/** Builds a link that keeps the current filters and changes only the given keys. */
function href(sp: SP, patch: SP) {
  const q = new URLSearchParams();
  for (const [k, v] of Object.entries({ ...sp, ...patch })) if (v) q.set(k, v);
  const s = q.toString();
  return `/app/settings/members${s ? `?${s}` : ""}`;
}

export default async function Members({ searchParams }: { searchParams: Promise<SP> }) {
  const s = await requireStaff();
  const sp = await searchParams;
  const tab: Tab = (TABS as readonly string[]).includes(sp.tab ?? "") ? (sp.tab as Tab) : "overview";
  const tz = s.profile.timezone;
  const now = new Date();
  // Expiry emails and status upkeep also run here, so they work even without a scheduled job.
  after(maybeSweep);

  const [stats, detail] = await Promise.all([memberStats(), sp.member ? memberDetail(sp.member) : null]);

  return (
    <div className="grid gap-5">
      <AdminTabs active={tab} pending={stats.pending} />

      {tab === "overview" && <Overview sp={sp} tz={tz} now={now} stats={stats} owner={s.access.owner} />}
      {(tab === "all" || tab === "pending" || tab === "active" || tab === "inactive") && <MembersList sp={sp} tab={tab} tz={tz} now={now} />}
      {tab === "feedback" && <FeedbackTab sp={sp} tz={tz} />}
      {tab === "activity" && <ActivityTab sp={sp} tz={tz} />}

      {detail && (
        <MemberPanel
          // A new key after every successful change resets the panel's forms and open confirmations.
          key={[detail.user.id, detail.state, detail.membership?.status, detail.membership?.role, detail.membership?.selectedPlan, detail.open?.id, detail.open?.kind, detail.open?.endsAt?.toISOString()].join("|")}
          detail={detail}
          actor={{ owner: s.access.owner, id: s.user.id }}
          tz={tz}
          now={now.toISOString()}
          closeHref={href(sp, { member: undefined })}
          billing={stripeStatus().configured}
          email={emailConfigured()}
        />
      )}
      {sp.member && !detail && <p className="text-sm text-ink-3">That member no longer exists.</p>}
      <p className="text-center text-[12px] text-ink-3">Times shown in {tzLabel(tz)}. Stored in UTC.</p>
    </div>
  );
}

function StatTile({ icon: Icon, label, value, href: to, tone }: { icon: typeof Users; label: string; value: number; href?: string; tone?: "warn" | "up" | "down" }) {
  const body = (
    <>
      <span className="stat-icon" aria-hidden><Icon className="h-[18px] w-[18px]" /></span>
      <div className="min-w-0">
        <div className={cn("display-num text-[clamp(1.25rem,1.8vw,1.6rem)] leading-tight", tone === "warn" && value > 0 ? "text-warn" : tone === "down" && value > 0 ? "text-down" : "text-ink")} data-testid={`stat-${label}`}>{value}</div>
        <div className="text-[12px] leading-snug text-ink-3">{label}</div>
      </div>
    </>
  );
  return to
    ? <Link href={to} className="glass press flex min-w-0 items-center gap-3 rounded-[22px] p-4 transition-[border-color] hover:border-[color-mix(in_oklab,var(--accent)_35%,var(--border))]">{body}</Link>
    : <div className="glass flex min-w-0 items-center gap-3 rounded-[22px] p-4">{body}</div>;
}

async function Overview({ sp, tz, now, stats, owner }: { sp: SP; tz: string; now: Date; stats: Awaited<ReturnType<typeof memberStats>>; owner: boolean }) {
  const [pending, mails] = await Promise.all([recentPending(6), emailStats()]);
  const email = emailConfigured();
  const billing = stripeStatus().configured;
  const cron = Boolean(process.env.CRON_SECRET);
  return (
    <>
      <section aria-label="Membership statistics" className="grid grid-cols-2 gap-3 md:grid-cols-4 2xl:grid-cols-7">
        <StatTile icon={Users} label="Total registered" value={stats.total} href={href({}, { tab: "all" })} />
        <StatTile icon={Hourglass} label="Pending approval" value={stats.pending} href={href({}, { tab: "pending" })} tone="warn" />
        <StatTile icon={CheckCircle2} label="Active members" value={stats.active} href={href({}, { tab: "active" })} />
        <StatTile icon={Sparkles} label="Active free trials" value={stats.trials} href={href({}, { tab: "active" })} />
        <StatTile icon={Gift} label="Complimentary Premium" value={stats.complimentary} href={href({}, { tab: "active" })} />
        <StatTile icon={Clock3} label="Expired" value={stats.expired + stats.revoked} href={href({}, { tab: "inactive", state: "expired" })} />
        <StatTile icon={ShieldOff} label="Suspended" value={stats.suspended} href={href({}, { tab: "inactive", state: "suspended" })} tone="down" />
      </section>

      <div className="grid gap-5 lg:grid-cols-[1.4fr_1fr]">
        <Card>
          <CardHeader title="Waiting for approval" caption="Newest registrations first" href={href({}, { tab: "pending" })} hrefLabel="All pending members" />
          {pending.length === 0 ? (
            <EmptyState compact icon={CheckCircle2} title="Nobody is waiting">New registrations appear here as soon as they finish onboarding.</EmptyState>
          ) : (
            <ul className="mt-3 divide-y divide-[var(--border)]">
              {pending.map((m) => (
                <li key={m.id}>
                  <Link href={href(sp, { member: m.id })} className="flex items-center justify-between gap-3 py-3 hover:text-accent">
                    <span className="min-w-0">
                      <span className="block truncate text-[15px] font-medium text-ink">{m.name}</span>
                      <span className="block truncate text-[13px] text-ink-3">{m.email} · {m.country ?? "Country not provided"}</span>
                    </span>
                    <span className="shrink-0 text-right text-[12px] text-ink-3">
                      <span className="block">{planLabel(m.selectedPlan)}</span>
                      <span className="block">{fmtDate(m.createdAt, tz, false)}</span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card>
          <CardHeader title="Integrations" caption="What is connected right now" />
          <ul className="mt-3 grid gap-2.5 text-[14px]">
            <IntegrationRow ok={email} label="Transactional email" detail={email ? `${mails.sent ?? 0} accepted by provider${mails.failed ? ` · ${mails.failed} failed` : ""}` : `Not configured · ${mails.not_configured ?? 0} emails held`} />
            <IntegrationRow ok={billing} label="Payments" detail={billing ? "Connected" : "Not connected · nobody is charged; manual access only"} />
            <IntegrationRow ok={cron} label="Scheduled expiry job" detail={cron ? "Hourly" : "No scheduler secret · runs when the app is used"} warnOnly />
          </ul>
          <p className="mt-3 text-[12px] leading-relaxed text-ink-3">Access always ends at the exact expiration time: it is checked on every request, not by the job.</p>
          {owner && <AnnounceButton enabled={billing} />}
        </Card>
      </div>
      <p className="sr-only">Generated {fmtDate(now, tz)}</p>
    </>
  );
}

function IntegrationRow({ ok, label, detail, warnOnly }: { ok: boolean; label: string; detail: string; warnOnly?: boolean }) {
  return (
    <li className="inset flex items-start gap-3 rounded-2xl px-3.5 py-3">
      {ok ? <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-up" aria-hidden /> : <AlertTriangle className={cn("mt-0.5 h-4 w-4 shrink-0", warnOnly ? "text-ink-3" : "text-warn")} aria-hidden />}
      <span className="min-w-0"><span className="block font-medium text-ink">{label}</span><span className="block text-[12.5px] text-ink-3">{detail}</span></span>
    </li>
  );
}

async function MembersList({ sp, tab, tz, now }: { sp: SP; tab: MemberTab; tz: string; now: Date }) {
  const page = Number(sp.page) || 1;
  const r = await listMembers({ tab, q: sp.q, state: sp.state, plan: sp.plan, sort: sp.sort === "expires" ? "expires" : "registered", dir: sp.dir === "asc" ? "asc" : "desc", page });
  const stateOptions = tab === "inactive" ? ["expired", "revoked", "suspended"] : tab === "active" ? ["active", "owner"] : tab === "all" ? ["pending", "active", "expired", "revoked", "suspended", "owner"] : [];
  return (
    <Card className="p-0 sm:p-0">
      <div className="p-4 sm:p-5">
        <MemberFilters q={sp.q ?? ""} state={sp.state ?? ""} plan={sp.plan ?? ""} sort={sp.sort ?? "registered"} dir={sp.dir ?? "desc"} stateOptions={stateOptions} />
        <p className="mt-3 text-[12.5px] text-ink-3" aria-live="polite">{r.total} {r.total === 1 ? "member" : "members"}</p>
      </div>
      {r.rows.length === 0 ? (
        <div className="px-4 pb-6"><EmptyState compact icon={Users} title={sp.q || sp.state || sp.plan ? "No members match" : "No members here yet"}>{sp.q || sp.state || sp.plan ? "Try a different search or filter." : "Members appear here once they register."}</EmptyState></div>
      ) : (
        <>
          <div className="hidden overflow-x-auto md:block">
            <table className="w-full text-left text-[14px]" data-testid="members-table">
              <thead className="border-y border-line text-[12px] uppercase tracking-wide text-ink-3">
                <tr>
                  {["Name", "Email", "Country", "Selected plan", "Access status", "Expiration", ""].map((h) => <th key={h} scope="col" className="px-4 py-2.5 font-medium first:pl-5 last:pr-5">{h}</th>)}
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {r.rows.map((m) => <Row key={m.id} m={m} sp={sp} tz={tz} now={now} />)}
              </tbody>
            </table>
          </div>
          <ul className="divide-y divide-[var(--border)] border-t border-line md:hidden" data-testid="members-cards">
            {r.rows.map((m) => (
              <li key={m.id}>
                <Link href={href(sp, { member: m.id })} className="block px-4 py-3.5">
                  <div className="flex items-center justify-between gap-3">
                    <span className="min-w-0 truncate text-[15px] font-medium text-ink">{m.name}</span>
                    <Pill tone={STATE_TONE[m.state]}>{STATE_LABEL[m.state]}</Pill>
                  </div>
                  <div className="mt-0.5 truncate text-[13px] text-ink-3">{m.email}</div>
                  <div className="mt-1 flex flex-wrap gap-x-3 text-[12.5px] text-ink-2">
                    <span>{planLabel(m.selectedPlan)}</span>
                    <span>{m.country ?? "Not provided"}</span>
                    {m.endsAt && <span>Until {fmtDate(m.endsAt, tz, false)}</span>}
                  </div>
                </Link>
              </li>
            ))}
          </ul>
          {r.pages > 1 && (
            <nav aria-label="Pages" className="flex items-center justify-between gap-3 border-t border-line px-5 py-3 text-[13px]">
              {r.page > 1 ? <Link className="text-accent hover:underline" href={href(sp, { page: String(r.page - 1), member: undefined })}>Previous</Link> : <span />}
              <span className="text-ink-3">Page {r.page} of {r.pages}</span>
              {r.page < r.pages ? <Link className="text-accent hover:underline" href={href(sp, { page: String(r.page + 1), member: undefined })}>Next</Link> : <span />}
            </nav>
          )}
        </>
      )}
    </Card>
  );
}

function Row({ m, sp, tz, now }: { m: MemberRow; sp: SP; tz: string; now: Date }) {
  const left = m.state === "active" ? remaining(m.endsAt, now) : null;
  return (
    <tr className="align-middle hover:bg-[color-mix(in_oklab,var(--text)_3%,transparent)]">
      <td className="max-w-[200px] truncate px-4 py-3 pl-5 font-medium text-ink">
        {m.name}{m.role === "admin" && <Pill tone="accent" className="ml-2 align-middle">Admin</Pill>}
      </td>
      <td className="max-w-[240px] truncate px-4 py-3 text-ink-2">{m.email}</td>
      <td className="px-4 py-3 text-ink-2">{m.country ?? <span className="text-ink-3">Not provided</span>}</td>
      <td className="px-4 py-3 text-ink-2">{planLabel(m.selectedPlan)}</td>
      <td className="px-4 py-3">
        <Pill tone={STATE_TONE[m.state]}>{STATE_LABEL[m.state]}</Pill>
        {m.state === "active" && m.source && <span className="ml-2 text-[12px] text-ink-3">{SOURCE_LABEL[m.source] ?? m.source}</span>}
      </td>
      <td className="px-4 py-3 text-ink-2">
        {m.state === "owner" ? "Never" : m.endsAt ? <><span className="block">{fmtDate(m.endsAt, tz)}</span>{left && <span className="block text-[12px] text-ink-3">{left}</span>}</> : m.state === "active" ? "Unlimited" : "—"}
      </td>
      <td className="px-4 py-3 pr-5 text-right">
        <Link href={href(sp, { member: m.id })} className="press inline-flex h-8 items-center rounded-full border border-line px-3.5 text-[13px] font-medium text-ink hover:border-[color-mix(in_oklab,var(--accent)_40%,var(--border))]">Manage</Link>
      </td>
    </tr>
  );
}

async function FeedbackTab({ sp, tz }: { sp: SP; tz: string }) {
  const r = await listFeedback(sp.status, Number(sp.page) || 1);
  const statuses = ["", "new", "reviewing", "resolved"];
  const CAT: Record<string, string> = { bug: "Bug report", feature: "Feature suggestion", general: "General feedback" };
  return (
    <Card>
      <CardHeader title="Feedback" caption={`${r.fresh} new · ${r.total} shown by this filter`} icon={<MessageSquareText className="h-5 w-5 text-accent" aria-hidden />} />
      <nav aria-label="Feedback status" className="mt-3 flex flex-wrap gap-1.5">
        {statuses.map((st) => (
          <Link key={st || "all"} href={href({ tab: "feedback" }, { status: st || undefined })} className={cn("rounded-full border border-line px-3 py-1.5 text-[13px]", (sp.status ?? "") === st ? "bg-[var(--surface-strong)] font-medium text-accent" : "text-ink-2 hover:text-ink")}>
            {st ? st[0]!.toUpperCase() + st.slice(1) : "All"}
          </Link>
        ))}
      </nav>
      {r.rows.length === 0 ? (
        <div className="mt-4"><EmptyState compact icon={MessageSquareText} title="No feedback yet">Approved members can send feedback from Settings › Send feedback.</EmptyState></div>
      ) : (
        <ul className="mt-4 grid gap-3">
          {r.rows.map((f) => (
            <li key={f.id} className="inset rounded-2xl p-4" data-testid="feedback-item">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex min-w-0 flex-wrap items-center gap-2">
                  <Link href={href({ tab: "feedback", status: sp.status }, { member: f.userId })} className="font-medium text-ink hover:text-accent">{f.name}</Link>
                  <Pill tone={f.category === "bug" ? "down" : f.category === "feature" ? "accent" : "neutral"}>{CAT[f.category]}</Pill>
                  <span className="text-[12.5px] text-ink-3">{fmtDate(f.createdAt, tz)}</span>
                </div>
                <FeedbackStatusSelect id={f.id} status={f.status as "new"} />
              </div>
              <p className="mt-2 whitespace-pre-wrap break-words text-[14.5px] leading-relaxed text-ink-2">{f.message}</p>
              {f.hasShot && <a href={`/api/admin/feedback/${f.id}`} target="_blank" rel="noreferrer" className="mt-2 inline-block text-[13px] font-medium text-accent hover:underline">View screenshot</a>}
            </li>
          ))}
        </ul>
      )}
      {r.pages > 1 && <p className="mt-3 text-center text-[13px] text-ink-3">Page {Number(sp.page) || 1} of {r.pages} · <Link className="text-accent" href={href(sp, { page: String((Number(sp.page) || 1) + 1) })}>Next</Link></p>}
    </Card>
  );
}

async function ActivityTab({ sp, tz }: { sp: SP; tz: string }) {
  const page = Number(sp.page) || 1;
  const r = await activityLog(page);
  return (
    <Card>
      <CardHeader title="Activity log" caption="Every administrative change: who, what and when" icon={<Crown className="h-5 w-5 text-accent" aria-hidden />} />
      {r.rows.length === 0 ? (
        <div className="mt-4"><EmptyState compact title="No administrative activity yet" /></div>
      ) : (
        <ol className="mt-3 divide-y divide-[var(--border)]" data-testid="activity-log">
          {r.rows.map((a) => (
            <li key={a.id} className="grid gap-0.5 py-3 sm:grid-cols-[170px_1fr] sm:gap-4">
              <time className="text-[12.5px] text-ink-3" dateTime={a.createdAt.toISOString()}>{fmtDate(a.createdAt, tz)}</time>
              <div className="min-w-0 text-[14px]">
                <span className="font-medium text-ink">{ACTION_LABEL[a.action] ?? a.action}</span>
                {a.targetType === "user" && a.targetId && <> · {a.targetName ? <Link href={href({ tab: "activity" }, { member: a.targetId })} className="text-accent hover:underline">{a.targetName}</Link> : <span className="text-ink-3">deleted member</span>}</>}
                <span className="block text-[12.5px] text-ink-3">
                  {a.actorName ? `by ${a.actorName}` : "by the system"}
                  {auditSummary(a.action, a.meta, tz) ? ` · ${auditSummary(a.action, a.meta, tz)}` : ""}
                </span>
              </div>
            </li>
          ))}
        </ol>
      )}
      {r.pages > 1 && (
        <nav aria-label="Pages" className="mt-3 flex items-center justify-between text-[13px]">
          {page > 1 ? <Link className="text-accent" href={href(sp, { page: String(page - 1) })}>Newer</Link> : <span />}
          <span className="text-ink-3">Page {page} of {r.pages}</span>
          {page < r.pages ? <Link className="text-accent" href={href(sp, { page: String(page + 1) })}>Older</Link> : <span />}
        </nav>
      )}
    </Card>
  );
}
