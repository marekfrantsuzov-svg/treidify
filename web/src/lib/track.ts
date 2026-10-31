/** Product analytics hook. Sends only when the visitor allowed analytics and the script loaded; never sends personal data. */
type Props = Record<string, string | number | boolean>;
declare global { interface Window { plausible?: (event: string, opts?: { props?: Props }) => void } }

export function track(event: string, props?: Props) {
  try { if (typeof window !== "undefined") window.plausible?.(event, props ? { props } : undefined); } catch { /* analytics must never break the app */ }
}
