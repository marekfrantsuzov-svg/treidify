import "server-only";
import { and, desc, eq, isNull } from "drizzle-orm";
import { cache } from "react";
import { db, schema } from "../db";
import { ownerForUserId } from "../owner-binding";
import { accessFor, type Access, type MemberRole, type MembershipStatus } from "./rules";

export interface MemberAccess extends Access {
  userId: string;
  owner: boolean;
  role: MemberRole | null;
  status: MembershipStatus;
  selectedPlan: string | null;
  grant: typeof schema.accessGrant.$inferSelect | null;
  entitlement: typeof schema.entitlement.$inferSelect | null;
}

/** Everything that decides access, read fresh from the database (never from the session cookie or the browser). */
export async function loadAccess(userId: string, now = new Date()): Promise<MemberAccess> {
  const [ownerRes, [m], [g], [e]] = await Promise.all([
    ownerForUserId(userId),
    db.select().from(schema.membership).where(eq(schema.membership.userId, userId)),
    db.select().from(schema.accessGrant).where(and(eq(schema.accessGrant.userId, userId), isNull(schema.accessGrant.endedAt))).orderBy(desc(schema.accessGrant.createdAt)).limit(1),
    db.select().from(schema.entitlement).where(eq(schema.entitlement.userId, userId)),
  ]);
  const status = (m?.status ?? "pending") as MembershipStatus;
  const a = accessFor({ owner: ownerRes.owner, status, grant: g ?? null, entitlement: e ?? null, now });
  return { ...a, userId, owner: ownerRes.owner, role: ownerRes.owner ? null : ((m?.role ?? "member") as MemberRole), status, selectedPlan: m?.selectedPlan ?? null, grant: g ?? null, entitlement: e ?? null };
}

/** Per-request memo: layouts, pages and actions in the same request share one read. */
export const memberAccess = cache((userId: string) => loadAccess(userId));

export const isStaff = (a: Pick<MemberAccess, "owner" | "role">) => a.owner || a.role === "admin";
