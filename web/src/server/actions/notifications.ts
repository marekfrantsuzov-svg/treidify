"use server";

import { and, eq, isNull } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db, schema } from "../db";
import { requireUser } from "../session";

export async function markAllRead() {
  const s = await requireUser();
  await db.update(schema.notification).set({ readAt: new Date() }).where(and(eq(schema.notification.userId, s.user.id), isNull(schema.notification.readAt)));
  revalidatePath("/app", "layout");
}
