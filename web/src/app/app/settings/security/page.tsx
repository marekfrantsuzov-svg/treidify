import { and, eq } from "drizzle-orm";
import { DataControls, PasswordForm, SessionsList, TwoFactorForm } from "@/components/settings/security-forms";
import { db, schema } from "@/server/db";
import { requireOnboarded } from "@/server/session";

export const metadata = { title: "Security" };

export default async function Security() {
  const s = await requireOnboarded("/app/settings/security");
  const [cred] = await db.select({ id: schema.account.id }).from(schema.account).where(and(eq(schema.account.userId, s.user.id), eq(schema.account.providerId, "credential")));
  const hasPassword = Boolean(cred);
  return (
    <div className="grid gap-4">
      <PasswordForm hasPassword={hasPassword} email={s.user.email} />
      <TwoFactorForm enabled={Boolean(s.user.twoFactorEnabled)} hasPassword={hasPassword} />
      <SessionsList currentToken={s.session.token} timezone={s.profile.timezone} />
      <DataControls hasPassword={hasPassword} />
    </div>
  );
}
