import { PreferencesForm } from "@/components/settings/preferences-form";
import { requireOnboarded } from "@/server/session";

export const metadata = { title: "Preferences" };

export default async function Preferences() {
  const s = await requireOnboarded("/app/settings/preferences");
  const p = s.profile;
  return <PreferencesForm initial={{ timezone: p.timezone, instruments: p.instruments, ...p.dashboardPrefs, aiConsent: !!p.aiConsentAt }} />;
}
