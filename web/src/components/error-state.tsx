"use client";

import { RotateCcw } from "lucide-react";
import { useEffect } from "react";
import { Button, ButtonLink } from "@/components/ui/button";
import { Glass } from "@/components/ui/glass";

/** Shared error boundary body: reports once, offers a retry, and shows a reference the user can quote to support. */
export function ErrorState({ error, reset, where, home = "/" }: { error: Error & { digest?: string }; reset: () => void; where: string; home?: string }) {
  useEffect(() => {
    void fetch("/api/client-error", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ message: error.message.slice(0, 500), digest: error.digest, path: location.pathname, where }) }).catch(() => {});
  }, [error, where]);
  return (
    <div className="grid min-h-[50vh] place-items-center px-4 py-16">
      <Glass className="max-w-md p-7 text-center">
        <h1 className="text-xl font-semibold tracking-[-0.02em] text-ink">Something went wrong on this page.</h1>
        <p className="mt-2 text-sm text-ink-2">The error has been logged. Your data is safe. Try again, and if it keeps happening, contact support with the reference below.</p>
        {error.digest && <p className="num mt-3 text-xs text-ink-3">Reference {error.digest}</p>}
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <Button onClick={reset}><RotateCcw className="h-4 w-4" />Try again</Button>
          <ButtonLink href={home} variant="secondary">Go back</ButtonLink>
        </div>
      </Glass>
    </div>
  );
}
