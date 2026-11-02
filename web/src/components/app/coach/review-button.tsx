"use client";

import { Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import type { CoachPeriod } from "@/lib/analytics";
import { generateCoachReview } from "@/server/actions/coach";
import { Spinner } from "@/components/auth/auth-ui";

export function ReviewButton({ period, accountId, label, disabled }: { period: CoachPeriod; accountId: string; label: string; disabled?: boolean }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [err, setErr] = useState<string | null>(null);
  return (
    <span className="inline-flex flex-col items-start gap-1">
      <button type="button" disabled={pending || disabled} onClick={() => start(async () => { const r = await generateCoachReview(period, accountId); setErr(r.ok ? null : r.error); if (r.ok) router.refresh(); })}
        className="press inline-flex items-center gap-1.5 rounded-full bg-accent-soft px-3 py-1.5 text-[12.5px] font-semibold text-accent disabled:opacity-50">
        {pending ? <Spinner /> : <Sparkles className="h-3.5 w-3.5" />}{label}
      </button>
      {err && <span className="text-[12px] text-down" role="status">{err}</span>}
    </span>
  );
}
