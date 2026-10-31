import "server-only";
import { db, schema } from "./db";

export async function audit(action: string, opts: { actorId?: string | null; targetType?: string; targetId?: string; meta?: unknown; ip?: string | null } = {}) {
  try {
    await db.insert(schema.auditLog).values({ action, actorId: opts.actorId ?? null, targetType: opts.targetType, targetId: opts.targetId, meta: opts.meta ?? null, ip: opts.ip ?? null });
  } catch (e) {
    console.error("[audit] failed", action, e);
  }
}
