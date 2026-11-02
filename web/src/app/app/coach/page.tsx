import { and, desc, eq, inArray } from "drizzle-orm";
import { AccountPicker } from "@/components/app/account-picker";
import { ReviewButton } from "@/components/app/coach/review-button";
import { Tile } from "@/components/app/performance/parts";
import { PageHeader, StatusCard } from "@/components/app/status";
import { GlassIcon } from "@/components/icons/glass-icon";
import { CoachPreview, ObservationList } from "@/components/previews/coach-preview";
import { Glass } from "@/components/ui/glass";
import { SampleBadge } from "@/components/ui/pill";
import { COACH_PERIOD_DAYS, COACH_PERIOD_LABEL, coachObservations, performanceMetrics, type CoachPeriod } from "@/lib/analytics";
import { fmtNumber, fmtSignedMoney } from "@/lib/format";
import type { CoachReview } from "@/server/ai/schema";
import { accountOverview, listAccounts, pickerOptions } from "@/server/account-data";
import { db, schema } from "@/server/db";
import { providerStatus } from "@/server/providers";
import { requireOnboarded } from "@/server/session";

export const metadata = { title: "AI Coach" };

const PERIODS: { id: CoachPeriod; title: string }[] = [{ id: "daily", title: "Daily review" }, { id: "weekly", title: "Weekly summary" }, { id: "monthly", title: "Monthly report" }];

function Review({ r, tz }: { r: { output: unknown; createdAt: Date; input: unknown }; tz: string }) {
  const o = r.output as CoachReview;
  const inp = r.input as { tradeCount?: number; facts?: string };
  const list = (title: string, xs: string[], tone = "text-ink") => xs.length > 0 && (
    <div><p className={`text-[11px] font-semibold uppercase tracking-wide ${tone}`}>{title}</p><ul className="mt-1 grid gap-1">{xs.map((x) => <li key={x}>• {x}</li>)}</ul></div>
  );
  return (
    <div className="mt-3 grid gap-3 text-[13px] leading-relaxed text-ink-2">
      <p className="font-medium text-ink">{o.headline}</p>
      {list("Doing well", o.strengths, "text-up")}
      {list("Problems in the data", o.problems, "text-down")}
      {list("Next period, do this", o.actions, "text-accent")}
      {list("Worth studying", o.learn)}
      {list("What the data cannot show", o.dataGaps, "text-ink-3")}
      <details className="text-[12px] text-ink-3"><summary className="cursor-pointer">Facts the coach was given ({inp.tradeCount ?? "?"} trades)</summary><pre className="mt-2 whitespace-pre-wrap rounded-xl bg-inset p-3 font-sans">{inp.facts}</pre></details>
      <p className="text-[11px] text-ink-3">AI-written by Claude from your computed statistics on {r.createdAt.toLocaleString("en-GB", { timeZone: tz, dateStyle: "medium", timeStyle: "short" })}. Not financial advice.</p>
    </div>
  );
}

export default async function Coach({ searchParams }: { searchParams: Promise<{ account?: string }> }) {
  const s = await requireOnboarded("/app/coach");
  const sp = await searchParams;
  const accounts = await listAccounts(s.user.id);
  const o = await accountOverview(s.user.id, sp.account, accounts);
  const ai = providerStatus().ai;
  const tz = s.profile.timezone;

  if (!o) {
    return (
      <>
        <PageHeader title="AI Coach" subtitle="Patterns in your own trading, each backed by the trades that show it." />
        <div className="grid gap-4 lg:grid-cols-[1fr_1.3fr]">
          <StatusCard title="Your coaching" icon={<GlassIcon name="coach" size={32} />} status="Needs account" action={{ href: "/app/accounts", label: "Connect an account" }}>
            Without a connected account there are no trades to review, so no personal statistics, patterns or AI reviews are shown. The example on the right runs the same detectors on a generated sample history and is labelled as such.
          </StatusCard>
          <CoachPreview />
        </div>
      </>
    );
  }

  const now = new Date();
  const sample = o.account.source === "sample";
  const obs = coachObservations(o.trades);
  const nowS = now.getTime() / 1000;
  const reports = await db.select().from(schema.aiReport).where(and(eq(schema.aiReport.userId, s.user.id), inArray(schema.aiReport.kind, ["daily", "weekly", "monthly"]))).orderBy(desc(schema.aiReport.createdAt)).limit(30);
  const latest = (k: CoachPeriod) => reports.find((r) => r.kind === k && (r.input as { accountId?: string }).accountId === o.account.id);
  const c = o.account.currency;

  return (
    <>
      <PageHeader title="AI Coach" subtitle={<>Reviews of your real closed trades · {o.account.label}{sample && <SampleBadge label="Sample account" className="ml-2 align-middle" />}</>}>
        <AccountPicker accounts={pickerOptions(accounts)} selected={o.account.id} />
      </PageHeader>
      <div className="grid gap-4">
        <div className="grid gap-4 lg:grid-cols-3">
          {PERIODS.map((p) => {
            const ts = o.trades.filter((t) => t.closeTime >= nowS - COACH_PERIOD_DAYS[p.id] * 86_400);
            const m = performanceMetrics(ts);
            const r = latest(p.id);
            return (
              <Glass key={p.id} className="p-4 sm:p-5">
                <div className="flex items-baseline justify-between gap-2"><h2 className="text-[15px] font-semibold text-ink">{p.title}</h2><span className="text-[11.5px] text-ink-3">{COACH_PERIOD_LABEL[p.id]}</span></div>
                <div className="mt-3 grid grid-cols-3 gap-2">
                  <Tile label="Trades" value={String(m.tradeCount)} />
                  <Tile label="Net" value={fmtSignedMoney(m.netProfit, c, 0)} tone={m.netProfit > 0 ? "up" : m.netProfit < 0 ? "down" : undefined} />
                  <Tile label="Win rate" value={m.winRate === null ? "—" : `${fmtNumber(m.winRate * 100, 0)}%`} />
                </div>
                <div className="mt-3">
                  {ai
                    ? <ReviewButton period={p.id} accountId={o.account.id} label={r ? "Generate a new review" : "Generate AI review"} disabled={ts.length === 0} />
                    : <p className="text-[12px] text-ink-3">AI reviews switch on when ANTHROPIC_API_KEY is set. The numbers here are already real.</p>}
                  {ts.length === 0 && <p className="mt-1 text-[12px] text-ink-3">No trades closed in this period.</p>}
                </div>
                {r && <Review r={r} tz={tz} />}
              </Glass>
            );
          })}
        </div>
        <ObservationList observations={obs} title="Patterns across all synced trades" badge={sample ? <SampleBadge label="Sample" /> : undefined} limit={8}
          empty={o.trades.length < 20 ? `Pattern detection needs at least 20 closed trades; this account has ${o.trades.length}.` : "No patterns crossed their thresholds. That is a good sign."} />
      </div>
    </>
  );
}
