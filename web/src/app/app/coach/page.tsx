import { PageHeader, StatusCard } from "@/components/app/status";
import { GlassIcon } from "@/components/icons/glass-icon";
import { CoachPreview } from "@/components/previews/coach-preview";
import { accountOverview } from "@/server/account-data";
import { providerStatus } from "@/server/providers";
import { requireOnboarded } from "@/server/session";

export const metadata = { title: "AI Coach" };

export default async function Coach() {
  const s = await requireOnboarded("/app/coach");
  const o = await accountOverview(s.user.id, undefined);
  const p = providerStatus();
  const n = o?.trades.length ?? 0;
  return (
    <>
      <PageHeader title="AI Coach" subtitle="Patterns in your own trading, each backed by the trades that show it." />
      <div className="grid gap-4 lg:grid-cols-[1fr_1.3fr]">
        <div className="grid content-start gap-4">
          <StatusCard title="Your coaching" icon={<GlassIcon name="coach" size={32} />} status={!o ? "Needs account" : n < 20 ? `${n} of 20 trades` : p.ai ? "Ready" : "AI not connected"} action={!o ? { href: "/app/accounts", label: "Connect an account" } : undefined}>
            The coach looks for overtrading, excessive risk, size increases after losses, holding losers longer than winners, cutting winners short, inconsistent sizing and weak sessions. Every observation cites its numbers. Daily, weekly and monthly reports follow once your account is synced and the AI is connected.
          </StatusCard>
        </div>
        <CoachPreview />
      </div>
    </>
  );
}
