"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";

/** Switches the account on the current page, keeping the period and any filters. */
export function AccountPicker({ accounts, selected }: { accounts: { id: string; label: string }[]; selected: string }) {
  const router = useRouter();
  const path = usePathname();
  const params = useSearchParams();
  if (accounts.length < 2) return null;
  const go = (id: string) => { const q = new URLSearchParams(params.toString()); q.set("account", id); q.delete("page"); router.push(`${path}?${q}`); };
  return (
    <label className="inset inline-flex items-center gap-2 rounded-full py-1 pl-4 pr-2 text-sm text-ink-2">
      Account
      <select value={selected} onChange={(e) => go(e.target.value)} className="rounded-full bg-transparent py-1 pr-2 font-medium text-ink outline-none">
        {accounts.map((a) => <option key={a.id} value={a.id}>{a.label}</option>)}
      </select>
    </label>
  );
}
