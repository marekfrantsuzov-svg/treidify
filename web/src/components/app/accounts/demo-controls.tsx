"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { loadDemoAccount, removeDemoAccount } from "@/server/actions/accounts";
import type { ActionResult } from "@/server/actions/settings";
import { Alert, Spinner } from "@/components/auth/auth-ui";
import { Button } from "@/components/ui/button";

/** Load or remove the labelled sample account, so every module can be explored before a real connection. */
export function DemoControls({ hasDemo }: { hasDemo: boolean }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [r, setR] = useState<ActionResult | null>(null);
  const run = (fn: () => Promise<ActionResult>) => start(async () => { const x = await fn(); setR(x); if (x.ok) router.refresh(); });
  return (
    <div className="grid gap-3">
      <div className="flex flex-wrap items-center gap-3">
        {hasDemo
          ? <Button variant="secondary" onClick={() => run(removeDemoAccount)} disabled={pending}>{pending && <Spinner />}Remove demo account</Button>
          : <Button onClick={() => run(loadDemoAccount)} disabled={pending}>{pending && <Spinner />}Load demo account</Button>}
        <span className="text-sm text-ink-3">140 generated trades, labelled Sample on every screen.</span>
      </div>
      {r && <Alert tone={r.ok ? "up" : "down"}>{r.ok ? r.message : r.error}</Alert>}
    </div>
  );
}
