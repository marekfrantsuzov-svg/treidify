import { desc, eq } from "drizzle-orm";
import Link from "next/link";
import { PageHeader } from "@/components/app/status";
import { Glass } from "@/components/ui/glass";
import { markAllRead } from "@/server/actions/notifications";
import { db, schema } from "@/server/db";
import { requireOnboarded } from "@/server/session";

export const metadata = { title: "Notifications" };

export default async function Notifications() {
  const s = await requireOnboarded("/app/notifications");
  const rows = await db.select().from(schema.notification).where(eq(schema.notification.userId, s.user.id)).orderBy(desc(schema.notification.createdAt)).limit(100);
  const unread = rows.some((r) => !r.readAt);
  return (
    <>
      <PageHeader title="Notifications" subtitle="Sync status, alerts, community and account notices.">
        {unread && <form action={markAllRead}><button className="text-sm font-medium text-accent hover:underline">Mark all as read</button></form>}
      </PageHeader>
      <Glass className="divide-y divide-[var(--border)] p-2">
        {rows.length === 0 && <p className="p-6 text-center text-sm text-ink-3">You’re all caught up. Nothing to show yet.</p>}
        {rows.map((n) => {
          const body = (
            <div className="flex gap-3 p-4">
              <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${n.readAt ? "bg-transparent" : "bg-accent"}`} />
              <div className="min-w-0">
                <div className="text-sm font-medium text-ink">{n.title}</div>
                {n.body && <div className="text-sm text-ink-2">{n.body}</div>}
                <div className="mt-1 text-xs text-ink-3">{n.createdAt.toLocaleString("en-GB", { timeZone: s.profile.timezone })}</div>
              </div>
            </div>
          );
          return n.href ? <Link key={n.id} href={n.href} className="block rounded-2xl hover:bg-accent-soft">{body}</Link> : <div key={n.id}>{body}</div>;
        })}
      </Glass>
    </>
  );
}
