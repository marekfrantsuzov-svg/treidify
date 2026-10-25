"use client";

import { useRouter } from "next/navigation";

export function AccountPicker({ accounts, selected }: { accounts: { id: string; label: string }[]; selected: string }) {
  const router = useRouter();
  if (accounts.length < 2) return null;
  return (
    <label className="inset inline-flex items-center gap-2 rounded-full py-1 pl-4 pr-2 text-sm text-ink-2">
      Account
      <select value={selected} onChange={(e) => router.push(`/app?account=${e.target.value}`)} className="rounded-full bg-transparent py-1 pr-2 font-medium text-ink outline-none">
        {accounts.map((a) => <option key={a.id} value={a.id}>{a.label}</option>)}
      </select>
    </label>
  );
}
