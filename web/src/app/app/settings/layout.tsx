import { PageHeader } from "@/components/app/status";
import { SettingsNav } from "@/components/settings/settings-nav";
import { isStaff } from "@/server/membership/access";
import { requireOnboarded } from "@/server/session";

export default async function SettingsLayout({ children }: { children: React.ReactNode }) {
  const s = await requireOnboarded("/app/settings");
  return (
    <>
      <PageHeader title="Settings" />
      <SettingsNav staff={isStaff(s.access)} />
      {children}
    </>
  );
}
