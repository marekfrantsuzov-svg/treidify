import { PageHeader } from "@/components/app/status";
import { ConnectForm } from "@/components/app/accounts/connect-form";
import { DemoControls } from "@/components/app/accounts/demo-controls";
import { Alert } from "@/components/auth/auth-ui";
import { GlassIcon } from "@/components/icons/glass-icon";
import { Glass } from "@/components/ui/glass";
import { Pill, SampleBadge } from "@/components/ui/pill";
import { listAccounts } from "@/server/account-data";
import { providerStatus } from "@/server/providers";
import { requireOnboarded } from "@/server/session";

export const metadata = { title: "Account connections" };

const statusTone = (s: string | null) => (s === "connected" ? "up" : s === "error" || s === "disconnected" ? "down" : "warn");

export default async function Accounts() {
  const s = await requireOnboarded("/app/accounts");
  const accounts = await listAccounts(s.user.id);
  const sync = providerStatus().sync;
  const hasDemo = accounts.some((a) => a.source === "sample");
  const fmt = (iso: string) => new Date(iso).toLocaleString("en-GB", { timeZone: s.profile.timezone, dateStyle: "medium", timeStyle: "short" });
  return (
    <>
      <PageHeader title="Account connections" subtitle="Your MetaTrader accounts, their sync status and when they last updated." />
      <div className="grid grid-cols-[minmax(0,1fr)] gap-4">
        <Glass className="p-5 sm:p-6">
          <h2 className="text-[17px] font-semibold text-ink">Your accounts</h2>
          {accounts.length === 0 ? <p className="mt-2 text-sm text-ink-3">No accounts connected yet.</p> : (
            <ul className="mt-4 divide-y divide-[var(--border)]">
              {accounts.map((a) => (
                <li key={a.id} className="flex items-center gap-3 py-3">
                  <GlassIcon name="link" size={36} />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[15px] font-medium text-ink">{a.label}</div>
                    <div className="truncate text-xs text-ink-3">
                      {a.platform.toUpperCase()} · {a.server} · {a.currency}
                      {a.source === "sample" ? " · generated sample data" : a.lastSyncAt ? ` · last sync ${fmt(a.lastSyncAt)}` : " · not synced yet"}
                    </div>
                  </div>
                  {a.source === "sample" ? <SampleBadge label="Sample" /> : <Pill tone={statusTone(a.status)}>{a.status ?? "pending"}</Pill>}
                </li>
              ))}
            </ul>
          )}
        </Glass>

        <div className="grid grid-cols-[minmax(0,1fr)] gap-4 lg:grid-cols-2">
          <Glass className="p-5">
            <h2 className="flex items-center gap-2.5 text-[15px] font-semibold text-ink"><GlassIcon name="shield" size={32} />Connect MetaTrader, read-only</h2>
            <p className="mt-3 text-sm leading-relaxed text-ink-2">Treidify only ever uses the investor password, which can view the account but cannot place trades or withdraw. It goes straight to the sync provider and is not stored by Treidify. Balance, equity, open positions and full history then sync automatically.</p>
            {!sync && <div className="mt-3"><Alert tone="warn">Account sync is not switched on yet. Connecting opens once the sync provider is configured and tested end to end with a real account. Until then nothing here claims to be live.</Alert></div>}
            <div className="mt-4"><ConnectForm enabled={sync} /></div>
          </Glass>
          <Glass className="p-5">
            <h2 className="flex items-center gap-2.5 text-[15px] font-semibold text-ink"><GlassIcon name="spark" size={32} />Explore with a demo account</h2>
            <p className="mt-3 text-sm leading-relaxed text-ink-2">See every screen working with a generated account: dashboard, journal, performance analytics and coaching. It is visible only to you, always marked Sample, and can never count toward community verification.</p>
            <div className="mt-4"><DemoControls hasDemo={hasDemo} /></div>
          </Glass>
        </div>
      </div>
    </>
  );
}
