export interface Consent {
  necessary: true;
  analytics: boolean;
  decidedAt: string;
  version: 1;
}

const KEY = "treidify-consent";
export const CONSENT_EVENT = "treidify:consent";

export function readConsent(): Consent | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Consent;
    return parsed.version === 1 ? parsed : null;
  } catch {
    return null;
  }
}

export function writeConsent(analytics: boolean) {
  const value: Consent = { necessary: true, analytics, decidedAt: new Date().toISOString(), version: 1 };
  try {
    localStorage.setItem(KEY, JSON.stringify(value));
  } catch {
    /* storage unavailable: treat as session-only choice */
  }
  window.dispatchEvent(new CustomEvent(CONSENT_EVENT, { detail: value }));
  return value;
}
