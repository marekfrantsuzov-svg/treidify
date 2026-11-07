import "server-only";
import { and, eq, gt, inArray, lt } from "drizzle-orm";
import { site } from "@/config/site";
import { db, schema } from "../db";
import { devOutboxEnabled, emailConfigured, sendEmail } from "../email";
import { membershipEmail, type EmailData, type MembershipEmailKind } from "./emails";

export type DeliveryStatus = "sent" | "not_configured" | "failed" | "duplicate";

/** Where emails send people: the app host when it is configured, else the site. */
export const appUrl = () => (process.env.NEXT_PUBLIC_APP_URL || site.url).replace(/\/$/, "");
const signInUrl = () => `${appUrl()}/login`;

type StoredData = Omit<EmailData, "endsAt" | "signInUrl"> & { endsAt?: string | null };

/**
 * Queues one notification and tries to deliver it. The dedupe key is unique in the database, so the same event
 * (for example "access approved" for one grant) can never be emailed twice, even under concurrent requests.
 * "sent" is recorded only when the provider accepted the message; with no provider it is "not_configured".
 */
export async function notify(n: { userId: string; to: string; kind: MembershipEmailKind; dedupeKey: string; data: Omit<EmailData, "signInUrl"> }): Promise<DeliveryStatus> {
  const payload: StoredData = { ...n.data, endsAt: n.data.endsAt ? n.data.endsAt.toISOString() : null };
  const [row] = await db.insert(schema.emailNotification).values({ userId: n.userId, kind: n.kind, dedupeKey: n.dedupeKey, toEmail: n.to, payload, status: "pending" })
    .onConflictDoNothing().returning({ id: schema.emailNotification.id });
  if (!row) return "duplicate";
  return deliver(row.id);
}

async function deliver(id: string): Promise<DeliveryStatus> {
  const [n] = await db.select().from(schema.emailNotification).where(eq(schema.emailNotification.id, id));
  if (!n || n.status === "sent") return "duplicate";
  const p = (n.payload ?? {}) as StoredData;
  const mail = membershipEmail(n.kind as MembershipEmailKind, { ...p, endsAt: p.endsAt ? new Date(p.endsAt) : null, signInUrl: signInUrl() });
  const set = (v: Partial<typeof schema.emailNotification.$inferInsert>) => db.update(schema.emailNotification).set(v).where(eq(schema.emailNotification.id, id));
  if (!emailConfigured()) {
    // Keep the event and the content; in development the message lands in the local outbox for tests.
    if (devOutboxEnabled()) await sendEmail({ to: n.toEmail, ...mail }).catch(() => {});
    await set({ status: "not_configured", attempts: n.attempts + 1 });
    return "not_configured";
  }
  try {
    const r = await sendEmail({ to: n.toEmail, ...mail });
    if (!r.accepted) { await set({ status: "not_configured", attempts: n.attempts + 1 }); return "not_configured"; }
    await set({ status: "sent", providerId: r.providerId, sentAt: new Date(), error: null, attempts: n.attempts + 1 });
    return "sent";
  } catch (e) {
    await set({ status: "failed", error: e instanceof Error ? e.message.slice(0, 300) : "Send failed", attempts: n.attempts + 1 });
    return "failed";
  }
}

/**
 * Retries failed sends (up to 3 attempts) and, once a provider is configured, ones held as not configured. Only
 * messages from the last 24 hours, so nobody gets a stale "ends soon" email days later.
 */
export async function retryNotifications(limit = 20) {
  const statuses = emailConfigured() ? ["failed", "not_configured", "pending"] : ["failed", "pending"];
  const rows = await db.select({ id: schema.emailNotification.id }).from(schema.emailNotification)
    .where(and(inArray(schema.emailNotification.status, statuses), lt(schema.emailNotification.attempts, 3), gt(schema.emailNotification.createdAt, new Date(Date.now() - 86_400_000)))).limit(limit);
  let sent = 0;
  for (const r of rows) if ((await deliver(r.id)) === "sent") sent++;
  return { retried: rows.length, sent };
}

export const deliveryLabel: Record<string, string> = {
  sent: "Accepted by email provider", not_configured: "Not sent: email not configured", failed: "Failed", pending: "Pending",
};
