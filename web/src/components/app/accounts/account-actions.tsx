"use client";

import { Link2, RefreshCw, RotateCcw, Trash2, Unplug } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { deleteTradingAccount, disconnectTradingAccount, syncTradingAccount } from "@/server/actions/accounts";
import type { ActionResult } from "@/server/actions/settings";
import { Modal } from "@/components/intel/modal";
import { Spinner } from "@/components/auth/auth-ui";
import { ConnectForm } from "./connect-form";

/** Opens the read-only MetaTrader connection in a glass sheet. */
export function ConnectButton({ enabled, owner = false }: { enabled: boolean; owner?: boolean }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button onClick={() => setOpen(true)} className="press bg-brand inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-[14px] font-semibold text-white shadow-[0_10px_24px_-10px_var(--accent-glow)]">
        <Link2 className="h-4 w-4" />Connect MetaTrader
      </button>
      <Modal open={open} onClose={() => setOpen(false)} title="Connect MetaTrader, read-only" subtitle="MT4 or MT5 through MetaApi, using the investor password.">
        <ul className="mb-4 grid gap-1.5 text-[13px] leading-relaxed text-ink-2">
          <li>• The investor password can view the account but cannot place trades or withdraw.</li>
          <li>• It goes from our server to MetaApi over TLS. Treidify never stores or logs it, and it never comes back to your browser.</li>
          <li>• MetaApi must confirm read-only (investor) access before anything is imported. A master password is refused and the connection is deleted at once.</li>
          <li>• Treidify has no trading functions at all. Disconnect at any time to revoke MetaApi&apos;s access straight away.</li>
        </ul>
        <ConnectForm enabled={enabled} owner={owner} />
      </Modal>
    </>
  );
}

/** Sync now, Disconnect and Delete for one account. Disconnected accounts only offer Delete. */
export function AccountActions({ accountId, label, active = true }: { accountId: string; label: string; active?: boolean }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<{ ok: boolean; t: string } | null>(null);
  const [confirm, setConfirm] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const run = (fn: () => Promise<ActionResult>) => start(async () => { const r = await fn(); setMsg(r.ok ? { ok: true, t: r.message ?? "Done." } : { ok: false, t: r.error }); router.refresh(); });
  return (
    <div className="flex flex-wrap items-center justify-end gap-1.5">
      {msg && <span className={msg.ok ? "text-xs text-up" : "text-xs text-down"} role="status">{msg.t}</span>}
      {active && <button disabled={pending} onClick={() => run(() => syncTradingAccount(accountId))} className="press inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[12.5px] font-medium text-ink-2 hover:bg-inset hover:text-ink disabled:opacity-50" aria-label={`Sync ${label} now`}>
        {pending ? <Spinner /> : <RefreshCw className="h-3.5 w-3.5" />}Sync now
      </button>}
      {!active ? null : confirm ? (
        <>
          <button disabled={pending} onClick={() => { setConfirm(false); run(() => disconnectTradingAccount(accountId)); }} className="press rounded-full bg-[color-mix(in_oklab,var(--down)_14%,transparent)] px-3 py-1.5 text-[12.5px] font-semibold text-down">Confirm disconnect</button>
          <button onClick={() => setConfirm(false)} className="press rounded-full px-3 py-1.5 text-[12.5px] text-ink-3 hover:text-ink">Cancel</button>
        </>
      ) : (
        <button disabled={pending} onClick={() => setConfirm(true)} className="press inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[12.5px] font-medium text-ink-3 hover:bg-inset hover:text-down disabled:opacity-50"><Unplug className="h-3.5 w-3.5" />Disconnect</button>
      )}
      {confirmDelete ? (
        <>
          <button disabled={pending} onClick={() => { setConfirmDelete(false); run(() => deleteTradingAccount(accountId)); }} className="press rounded-full bg-[color-mix(in_oklab,var(--down)_14%,transparent)] px-3 py-1.5 text-[12.5px] font-semibold text-down">Delete account and data</button>
          <button onClick={() => setConfirmDelete(false)} className="press rounded-full px-3 py-1.5 text-[12.5px] text-ink-3 hover:text-ink">Cancel</button>
        </>
      ) : (
        <button disabled={pending} onClick={() => setConfirmDelete(true)} className="press inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[12.5px] font-medium text-ink-3 hover:bg-inset hover:text-down disabled:opacity-50" aria-label={`Delete ${label} and its synced data`}><Trash2 className="h-3.5 w-3.5" />Delete</button>
      )}
    </div>
  );
}

/** Reconnect with a new investor password, keeping the account's synced history (same login and server). */
export function ReconnectButton({ enabled, owner = false, platform, server, login }: { enabled: boolean; owner?: boolean; platform: "mt4" | "mt5"; server: string; login: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button onClick={() => setOpen(true)} className="press inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[12.5px] font-semibold text-accent hover:bg-accent-soft"><RotateCcw className="h-3.5 w-3.5" />Reconnect</button>
      <Modal open={open} onClose={() => setOpen(false)} title={`Reconnect ${platform.toUpperCase()} ${login}`} subtitle="Enter the current investor password. Your synced history stays and only new deals are added.">
        <ConnectForm enabled={enabled} owner={owner} defaults={{ platform, server, login }} />
      </Modal>
    </>
  );
}
