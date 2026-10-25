import { eq, inArray } from "drizzle-orm";
import { NextResponse } from "next/server";
import { audit } from "@/server/audit";
import { getSession } from "@/server/session";
import { db, schema as S } from "@/server/db";

export const dynamic = "force-dynamic";

/** GDPR data export: everything stored about the signed-in user, minus secrets (password hashes, TOTP secrets, tokens, provider credentials). */
export async function GET() {
  const s = await getSession();
  if (!s) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  const uid = s.user.id;
  const byUser = <T extends { userId: unknown }>(t: T) => eq(t.userId as never, uid);

  const accounts = await db.select().from(S.tradingAccount).where(byUser(S.tradingAccount));
  const ids = accounts.map((a) => a.id);
  const forAccounts = async <T,>(q: (ids: string[]) => Promise<T[]>) => (ids.length ? q(ids) : []);

  const [profile, privacy, entitlement, membership, journal, rulebook, reports, uploads, notifications, prefs, subscriptions, payments, posts, comments, signIns] = await Promise.all([
    db.select().from(S.profile).where(byUser(S.profile)),
    db.select().from(S.privacySettings).where(byUser(S.privacySettings)),
    db.select().from(S.entitlement).where(byUser(S.entitlement)),
    db.select().from(S.communityMembership).where(byUser(S.communityMembership)),
    db.select().from(S.journalEntry).where(byUser(S.journalEntry)),
    db.select().from(S.rulebook).where(byUser(S.rulebook)),
    db.select().from(S.aiReport).where(byUser(S.aiReport)),
    db.select({ id: S.chartUpload.id, createdAt: S.chartUpload.createdAt }).from(S.chartUpload).where(byUser(S.chartUpload)),
    db.select().from(S.notification).where(byUser(S.notification)),
    db.select().from(S.notificationPref).where(byUser(S.notificationPref)),
    db.select().from(S.subscription).where(byUser(S.subscription)),
    db.select().from(S.payment).where(byUser(S.payment)),
    db.select().from(S.post).where(eq(S.post.authorId, uid)),
    db.select().from(S.comment).where(eq(S.comment.authorId, uid)),
    db.select({ createdAt: S.session.createdAt, ipAddress: S.session.ipAddress, userAgent: S.session.userAgent }).from(S.session).where(eq(S.session.userId, uid)),
  ]);
  const [connections, snapshots, deals, closedTrades, cashFlows] = await Promise.all([
    forAccounts((x) => db.select({ id: S.providerConnection.id, tradingAccountId: S.providerConnection.tradingAccountId, provider: S.providerConnection.provider, status: S.providerConnection.status, lastSyncAt: S.providerConnection.lastSyncAt, createdAt: S.providerConnection.createdAt }).from(S.providerConnection).where(inArray(S.providerConnection.tradingAccountId, x))),
    forAccounts((x) => db.select().from(S.accountSnapshot).where(inArray(S.accountSnapshot.tradingAccountId, x))),
    forAccounts((x) => db.select().from(S.deal).where(inArray(S.deal.tradingAccountId, x))),
    forAccounts((x) => db.select().from(S.closedTrade).where(inArray(S.closedTrade.tradingAccountId, x))),
    forAccounts((x) => db.select().from(S.cashFlow).where(inArray(S.cashFlow.tradingAccountId, x))),
  ]);

  const { id, name, email, emailVerified, username, displayUsername, createdAt, twoFactorEnabled, role } = s.user;
  const body = {
    exportedAt: new Date().toISOString(),
    format: "treidify-export-v1",
    user: { id, name, email, emailVerified, username, displayUsername, createdAt, twoFactorEnabled, role },
    profile: profile[0] ?? null, privacy: privacy[0] ?? null, plan: entitlement[0] ?? null, community: membership[0] ?? null,
    tradingAccounts: accounts, connections, snapshots, deals, closedTrades, cashFlows,
    journal, rulebook: rulebook[0] ?? null, aiReports: reports, chartUploads: uploads,
    notifications, notificationPreferences: prefs, subscriptions, payments, posts, comments, signIns,
  };
  await audit("user.data_exported", { actorId: uid, targetType: "user", targetId: uid });
  return new NextResponse(JSON.stringify(body, null, 2), {
    headers: { "Content-Type": "application/json", "Content-Disposition": `attachment; filename="treidify-export-${new Date().toISOString().slice(0, 10)}.json"`, "Cache-Control": "no-store" },
  });
}
