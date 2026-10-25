"use client";

import { AnimatePresence, motion } from "motion/react";
import Link from "next/link";
import Script from "next/script";
import { useEffect, useState } from "react";
import { CONSENT_EVENT, readConsent, writeConsent, type Consent } from "@/lib/consent";
import { Button } from "@/components/ui/button";

function useConsent() {
  const [consent, setConsent] = useState<Consent | null | undefined>(undefined);
  useEffect(() => {
    setConsent(readConsent());
    const on = (e: Event) => setConsent((e as CustomEvent<Consent>).detail);
    window.addEventListener(CONSENT_EVENT, on);
    return () => window.removeEventListener(CONSENT_EVENT, on);
  }, []);
  return consent;
}

/** Cookie banner. Only strictly necessary storage runs until the visitor opts in to analytics. */
export function CookieBanner() {
  const consent = useConsent();
  return (
    <AnimatePresence>
      {consent === null && (
        <motion.div
          role="dialog"
          aria-label="Cookie preferences"
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 24 }}
          transition={{ type: "spring", stiffness: 260, damping: 28 }}
          className="glass glass-strong fixed inset-x-3 bottom-3 z-[60] mx-auto max-w-xl rounded-3xl p-5 shadow-[var(--shadow-lg)] sm:bottom-5"
        >
          <p className="text-sm text-ink">We use strictly necessary storage to run Treidify. With your permission we also use privacy-friendly analytics to improve the site.</p>
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <Button size="sm" onClick={() => writeConsent(true)}>Allow analytics</Button>
            <Button size="sm" variant="secondary" onClick={() => writeConsent(false)}>Necessary only</Button>
            <Link href="/legal/cookies" className="ml-auto text-sm text-accent hover:underline">Details</Link>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/** Loads the analytics script only after consent, and only if a domain is configured. */
export function Analytics() {
  const consent = useConsent();
  const domain = process.env.NEXT_PUBLIC_ANALYTICS_DOMAIN;
  if (!domain || !consent?.analytics) return null;
  return <Script defer data-domain={domain} src="https://plausible.io/js/script.js" strategy="afterInteractive" />;
}

export function CookieSettings() {
  const consent = useConsent();
  if (consent === undefined) return <div className="skeleton h-24 rounded-2xl" />;
  return (
    <div className="glass rounded-3xl p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="font-semibold text-ink">Strictly necessary</h3>
          <p className="mt-1 text-sm text-ink-2">Sign-in session, security tokens, theme and this choice. Always on.</p>
        </div>
        <span className="text-sm text-ink-3">Always on</span>
      </div>
      <div className="my-5 h-px bg-[var(--border)]" />
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="font-semibold text-ink">Analytics</h3>
          <p className="mt-1 text-sm text-ink-2">Cookieless, aggregated page-view statistics. No advertising, no cross-site tracking.</p>
        </div>
        <button
          role="switch"
          aria-checked={!!consent?.analytics}
          aria-label="Analytics"
          onClick={() => writeConsent(!consent?.analytics)}
          className={`relative h-7 w-12 shrink-0 rounded-full transition-colors ${consent?.analytics ? "bg-accent" : "bg-[var(--border-strong)]"}`}
        >
          <span className={`absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition-transform ${consent?.analytics ? "translate-x-5" : "translate-x-0.5"}`} />
        </button>
      </div>
      {consent && <p className="mt-5 text-xs text-ink-3">Choice saved {new Date(consent.decidedAt).toLocaleString()}.</p>}
    </div>
  );
}
