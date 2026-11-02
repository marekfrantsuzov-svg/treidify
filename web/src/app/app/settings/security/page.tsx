import { and, eq } from "drizzle-orm";
import { DataControls, PasswordForm, SessionsList, TwoFactorForm } from "@/components/settings/security-forms";
import { db, schema } from "@/server/db";
import { requireOnboarded } from "@/server/session";
import { Glass } from "@/components/ui/glass";
import { isOwner, ownerConfig } from "@/server/owner";

export const metadata = { title: "Security" };

export default async function Security() {
  const s = await requireOnboarded("/app/settings/security");
  const [cred] = await db.select({ id: schema.account.id }).from(schema.account).where(and(eq(schema.account.userId, s.user.id), eq(schema.account.providerId, "credential")));
  const hasPassword = Boolean(cred);
  const [me] = await db.select({ id: schema.user.id, email: schema.user.email, emailVerified: schema.user.emailVerified }).from(schema.user).where(eq(schema.user.id, s.user.id));
  const owner = isOwner(me ?? null);
  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-4">
      <PasswordForm hasPassword={hasPassword} email={s.user.email} />
      <TwoFactorForm enabled={Boolean(s.user.twoFactorEnabled)} hasPassword={hasPassword} />
      <SessionsList currentToken={s.session.token} timezone={s.profile.timezone} />
      <DataControls hasPassword={hasPassword} />
      <Glass className="p-5">
        <h2 className="text-[15px] font-semibold text-ink">Account ID</h2>
        <p className="mt-1 text-sm text-ink-2">Your permanent Treidify account ID. Support may ask for it; it never changes, even if your email does.</p>
        <p className="num mt-3 select-all break-all rounded-xl bg-inset px-3 py-2 font-mono text-[13px] text-ink" aria-label="Account ID">{s.user.id}</p>
        <p className="mt-2 text-xs text-ink-3">{owner ? "Owner access is active on this account." : ownerConfig().configured ? "Standard account." : "Email " + (me?.emailVerified ? "verified." : "not verified yet.")}</p>
      </Glass>
    </div>
  );
}
