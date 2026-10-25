import "server-only";
import { randomBytes } from "node:crypto";
import type { ContactInput } from "@/lib/contact";
import { db, dbConfigured, schema } from "./db";
import { getSession } from "./session";

/**
 * Every message is stored as a support ticket first, so nothing is lost. When Resend is configured
 * the support inbox is also notified. With neither available it refuses honestly.
 */
export async function deliverContact(input: ContactInput): Promise<{ ok: true; reference: string } | { ok: false; error: string }> {
  const reference = `TR-${randomBytes(4).toString("hex").toUpperCase()}`;
  const key = process.env.RESEND_API_KEY, to = process.env.CONTACT_TO, from = process.env.EMAIL_FROM ?? "Treidify <noreply@treidify.com>";
  let stored = false;
  if (dbConfigured) {
    const s = await getSession().catch(() => null);
    await db.insert(schema.supportTicket).values({ reference, userId: s?.user.id ?? null, name: input.name, email: input.email, topic: input.topic, message: input.message });
    stored = true;
  }
  if (key && to) {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from,
        to: [to],
        reply_to: input.email,
        subject: `[${reference}] ${input.topic}: ${input.name}`,
        text: `${input.message}\n\nFrom: ${input.name} <${input.email}>\nTopic: ${input.topic}\nReference: ${reference}`,
      }),
    }).catch(() => null);
    if (!res?.ok && !stored) return { ok: false, error: "We could not send your message right now. Please try again in a few minutes." };
  } else if (!stored) {
    return { ok: false, error: "Our contact inbox is not connected yet. Please try again soon." };
  }
  return { ok: true, reference };
}
