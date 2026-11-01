"use client";

import { Link2, RefreshCw, Unplug } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { disconnectTradingAccount, syncTradingAccount } from "@/server/actions/accounts";
import type { ActionResult } from "@/server/actions/settings";
import { Modal } from "@/components/intel/modal";
import { Spinner } from "@/components/auth/auth-ui";
import { ConnectForm } from "./connect-form";

/** Opens the read-only MetaTrader connection in a glass sheet. */
export function ConnectButton({ enabled }: { enabled: boolean }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button onClick={() => setOpen(true)} className="press bg-brand inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-[14px] font-semibold text-white shadow-[0_10px_24px_-10px_var(--accent-glow)]">
        <Link2 className="h-4 w-4" />Connect MetaTrader
      </button>
      <Modal open={open} onClose={() => setOpen(false)} title="Connect MetaTrader, read-only" subtitle="MT4 or MT5 through MetaApi, using the investor password.">
        <ul className="mb-4 grid gap-1.5 text-[13px] leading-relaxed text-ink-2">
          <li>• The investor password can view the account but cannot place trades or withdraw.</li>
          <li>• It is sent over TLS to MetaApi only. Treidify never stores it and it never reaches your browser again.</li>
          <li>• Accounts not in investor (read-only) mode are refused and removed on the first sync.</li>
          <li>• Disconnect at any time: that revokes MetaApi&apos;s access straight away.</li>
        </ul>
        <ConnectForm enabled={enabled} />
      </Modal>
    </>
  );
}

/** Sync now and Disconnect for one connected account. */
export function AccountActions({ accountId, label }: { accountId: string; label: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<{ ok: boolean; t: string } | null>(null);
  const [confirm, setConfirm] = useState(false);
  const run = (fn: () => Promise<ActionResult>) => start(async () => { const r = await fn(); setMsg(r.ok ? { ok: true, t: r.message ?? "Done." } : { ok: false, t: r.error }); router.refresh(); });
  return (
    <div className="flex flex-wrap items-center justify-end gap-1.5">
      {msg && <span className={msg.ok ? "text-xs text-up" : "text-xs text-down"} role="status">{msg.t}</span>}
      <button disabled={pending} onClick={() => run(() => syncTradingAccount(accountId))} className="press inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[12.5px] font-medium text-ink-2 hover:bg-inset hover:text-ink disabled:opacity-50" aria-label={`Sync ${label} now`}>
        {pending ? <Spinner /> : <RefreshCw className="h-3.5 w-3.5" />}Sync now
      </button>
      {confirm ? (
        <>
          <button disabled={pending} onClick={() => { setConfirm(false); run(() => disconnectTradingAccount(accountId)); }} className="press rounded-full bg-[color-mix(in_oklab,var(--down)_14%,transparent)] px-3 py-1.5 text-[12.5px] font-semibold text-down">Confirm disconnect</button>
          <button onClick={() => setConfirm(false)} className="press rounded-full px-3 py-1.5 text-[12.5px] text-ink-3 hover:text-ink">Cancel</button>
        </>
      ) : (
        <button disabled={pending} onClick={() => setConfirm(true)} className="press inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[12.5px] font-medium text-ink-3 hover:bg-inset hover:text-down disabled:opacity-50"><Unplug className="h-3.5 w-3.5" />Disconnect</button>
      )}
    </div>
  );
}
