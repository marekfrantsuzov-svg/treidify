import { StatusCard } from "@/components/app/status";
import { GlassIcon } from "@/components/icons/glass-icon";
import { Glass } from "@/components/ui/glass";
import { Pill, SampleBadge } from "@/components/ui/pill";
import { listAccounts } from "@/server/account-data";
import { providerStatus } from "@/server/providers";
import { requireOnboarded } from "@/server/session";

export const metadata = { title: "Trading accounts" };

export default async function Accounts() {
  const s = await requireOnboarded("/app/settings/accounts");
  const accounts = await listAccounts(s.user.id);
  const sync = providerStatus().sync;
  return (
    <div className="grid gap-4">
      <Glass className="p-5 sm:p-6">
        <h2 className="text-[17px] font-semibold text-ink">Your MetaTrader accounts</h2>
        {accounts.length === 0 ? <p className="mt-2 text-sm text-ink-3">No accounts connected yet.</p> : (
          <ul className="mt-4 divide-y divide-[var(--border)]">
            {accounts.map((a) => (
              <li key={a.id} className="flex items-center gap-3 py-3">
                <GlassIcon name="link" size={36} />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[15px] font-medium text-ink">{a.label}</div>
                  <div className="truncate text-xs text-ink-3">{a.platform.toUpperCase()} · {a.server}{a.lastSyncAt && ` · synced ${new Date(a.lastSyncAt).toLocaleString("en-GB", { timeZone: s.profile.timezone })}`}</div>
                </div>
                {a.source === "sample" ? <SampleBadge label="Sample" /> : <Pill tone={a.status === "connected" ? "up" : "warn"}>{a.status ?? "pending"}</Pill>}
              </li>
            ))}
          </ul>
        )}
      </Glass>
      <StatusCard title="Connect MT4 or MT5" icon={<GlassIcon name="shield" size={32} />} status={sync ? "Available" : "Sync not switched on"}>
        You will enter your broker server, login and the read-only investor password. Treidify never asks for your master password and cannot place trades or withdraw. Balance, equity, open positions and full history then sync automatically, with the time of the last sync shown. {sync ? "" : "Connection opens as soon as the sync provider (MetaApi) is configured and tested end to end with a real account."}
      </StatusCard>
    </div>
  );
}
