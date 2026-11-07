import { PageHeader } from "@/components/app/status";
import { AccountActions, ConnectButton, ReconnectButton } from "@/components/app/accounts/account-actions";
import { DemoControls } from "@/components/app/accounts/demo-controls";
import { Alert } from "@/components/auth/auth-ui";
import { GlassIcon } from "@/components/icons/glass-icon";
import { Glass } from "@/components/ui/glass";
import { Pill, SampleBadge } from "@/components/ui/pill";
import { accountOverview, listAccounts } from "@/server/account-data";
import { fmtMoney, fmtNumber } from "@/lib/format";
import { providerStatus } from "@/server/providers";
import { requireOnboarded } from "@/server/session";
import { db, schema } from "@/server/db";
import { eq } from "drizzle-orm";
import { ownerForUserId } from "@/server/owner-binding";
import { freshness } from "@/server/sync/access";

export const maxDuration = 60;

export const metadata = { title: "Account connections" };

const statusTone = (s: string | null) => (s === "connected" ? "up" : s === "error" || s === "disconnected" ? "down" : "warn");

export default async function Accounts() {
  const s = await requireOnboarded("/app/accounts");
  const accounts = await listAccounts(s.user.id);
  const sync = providerStatus().sync;
  const { owner } = await ownerForUserId(s.user.id, { impersonatedBy: s.session.impersonatedBy });
  const now = new Date();
  const hasDemo = accounts.some((a) => a.source === "sample");
  const details = new Map(await Promise.all(accounts.filter((a) => a.source === "provider").map(async (a) => [a.id, await accountOverview(s.user.id, a.id, accounts)] as const)));
  const allOrders = [...details.values()].flatMap((o) => (o?.orders ?? []).map((r) => ({ ...r, account: o!.account.label, digits: r.price >= 100 ? 2 : r.price >= 10 ? 3 : 5 })));
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
                <li key={a.id} className="flex flex-wrap items-center gap-3 py-3">
                  <GlassIcon name="link" size={36} />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[15px] font-medium text-ink">{a.label}</div>
                    <div className="truncate text-xs text-ink-3">
                      {a.platform.toUpperCase()} · {a.server} · {a.currency}
                      {a.source === "sample" ? " · generated sample data" : a.lastSyncAt ? ` · last sync ${fmt(a.lastSyncAt)}` : " · not synced yet"}
                    </div>
                    {(() => { const d = details.get(a.id); if (!d || d.balance === null) return null; return (
                      <div className="num mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-ink-2">
                        <span>Balance {fmtMoney(d.balance, a.currency)}</span>
                        {d.equity !== null && <span>Equity {fmtMoney(d.equity, a.currency)}</span>}
                        {d.freeMargin !== null && <span>Free margin {fmtMoney(d.freeMargin, a.currency)}</span>}
                        <span>Margin level {d.marginLevel === null ? "no margin in use" : `${fmtNumber(d.marginLevel, 0)}%`}</span>
                        <span>{d.positions.length} open · {d.orders.length} pending</span>
                      </div>
                    ); })()}
                    {a.source === "provider" && a.status === "connected" && (() => { const f = freshness(a.lastSyncAt ? new Date(a.lastSyncAt) : null, now, { fresh: 15 * 60_000, stale: 60 * 60_000 }); return f === "stale" ? <p className="mt-1 text-xs text-warn">History last synced over an hour ago. Use Sync now, or check the connection.</p> : null; })()}
                    {a.lastError && a.status !== "connected" && <p className="mt-1 text-xs text-down">Last error{a.lastErrorAt ? ` (${fmt(a.lastErrorAt)})` : ""}: {a.lastError}</p>}
                  </div>
                  {a.source === "provider" && a.accessMode && a.status !== "disconnected" && <Pill tone={a.accessMode === "investor" ? "up" : "warn"}>{a.accessMode === "investor" ? "Read-only verified" : "Master (owner) · read-only use"}</Pill>}
                  {a.source === "sample" ? <SampleBadge label="Sample" /> : <Pill tone={statusTone(a.status)}>{(a.status ?? "pending").replace("_", " ")}</Pill>}
                  {a.source === "provider" && (a.status === "disconnected" || a.status === "reconnection_required" || a.status === "error") && <ReconnectButton enabled={sync} owner={owner} platform={a.platform} server={a.server} login={a.login} />}
                  {a.source === "provider" && <AccountActions accountId={a.id} label={a.label} active={a.status !== "disconnected"} />}
                </li>
              ))}
            </ul>
          )}
        </Glass>

        {allOrders.length > 0 && (
          <Glass className="p-5 sm:p-6">
            <h2 className="text-[17px] font-semibold text-ink">Pending orders</h2>
            <div className="mt-3 overflow-x-auto">
              <table className="num w-full min-w-[560px] text-left text-[13px]">
                <thead className="text-xs text-ink-3"><tr><th className="py-1.5 font-medium">Account</th><th className="font-medium">Symbol</th><th className="font-medium">Type</th><th className="font-medium">Volume</th><th className="font-medium">Price</th><th className="font-medium">SL</th><th className="font-medium">TP</th><th className="font-medium">Placed</th></tr></thead>
                <tbody className="divide-y divide-[var(--border)] text-ink-2">
                  {allOrders.map((r) => (
                    <tr key={r.id}><td className="py-2">{r.account}</td><td className="font-medium text-ink">{r.symbol}</td><td>{r.type}</td><td>{fmtNumber(r.volume, 2)}</td><td>{fmtNumber(r.price, r.digits)}</td><td>{r.stopLoss ? fmtNumber(r.stopLoss, r.digits) : "—"}</td><td>{r.takeProfit ? fmtNumber(r.takeProfit, r.digits) : "—"}</td><td>{fmt(r.placedAt.toISOString())}</td></tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Glass>
        )}

        <div className="grid grid-cols-[minmax(0,1fr)] gap-4 lg:grid-cols-2">
          <Glass className="p-5">
            <h2 className="flex items-center gap-2.5 text-[15px] font-semibold text-ink"><GlassIcon name="shield" size={32} />Connect MetaTrader, read-only</h2>
            <p className="mt-3 text-sm leading-relaxed text-ink-2">Treidify uses the investor password, which can view the account but cannot place trades or withdraw. It goes over TLS to MetaApi, our sync provider, is never stored by Treidify, and MetaApi must confirm it is read-only before anything is imported. Balance, equity, open positions and closed-trade history sync once an hour, and you can refresh by hand from the dashboard. Disconnect revokes access immediately, and Delete also removes the synced data.</p>
            {owner && <p className="mt-2 text-xs text-ink-3">You are signed in as the Treidify owner, so you may also connect with a master password. Treidify still never trades.</p>}
            {!sync && <div className="mt-3"><Alert tone="warn">Account sync is not switched on yet. Connecting opens once the sync provider is configured and tested end to end with a real account. Until then nothing here claims to be live.</Alert></div>}
            <div className="mt-4"><ConnectButton enabled={sync} owner={owner} /></div>
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
