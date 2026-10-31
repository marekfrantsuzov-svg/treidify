import { eq } from "drizzle-orm";
import { PrivacyForm, ProfileForm } from "@/components/settings/profile-forms";
import { db, schema } from "@/server/db";
import { requireOnboarded } from "@/server/session";

export const metadata = { title: "Profile and privacy" };

export default async function ProfileSettings() {
  const s = await requireOnboarded("/app/settings/profile");
  const [pr] = await db.select().from(schema.privacySettings).where(eq(schema.privacySettings.userId, s.user.id));
  const { userId: _u, updatedAt: _t, ...privacy } = pr ?? { userId: "", updatedAt: new Date(), profilePublic: false, showMonthlyPnl: false, showWinRate: false, showHistory: false, showOpenPositions: false, showEntryPrices: false, showPositionSizes: false, showBalance: false, positionDelayMinutes: 60 };
  return (
    <div className="grid gap-4">
      <ProfileForm initial={{ name: s.user.name, username: s.user.displayUsername ?? s.user.username ?? "", bio: s.profile.bio ?? "", country: s.profile.country ?? "", avatar: s.profile.avatar }} />
      <PrivacyForm initial={privacy} />
    </div>
  );
}
