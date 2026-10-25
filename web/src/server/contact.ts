import "server-only";
import type { ContactInput } from "@/lib/contact";

/**
 * Contact delivery. Sends through Resend when RESEND_API_KEY and CONTACT_TO are configured.
 * Without them it refuses honestly rather than pretending the message was sent.
 * (Stage 3 also stores every message as a support ticket in the database.)
 */
export async function deliverContact(input: ContactInput): Promise<{ ok: true; reference: string } | { ok: false; error: string }> {
  const reference = `TR-${Date.now().toString(36).toUpperCase()}`;
  const key = process.env.RESEND_API_KEY, to = process.env.CONTACT_TO, from = process.env.EMAIL_FROM ?? "Treidify <noreply@treidify.com>";
  if (!key || !to) {
    return { ok: false, error: "Our contact inbox is not connected yet. Please try again soon." };
  }
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
  });
  if (!res.ok) return { ok: false, error: "We could not send your message right now. Please try again in a few minutes." };
  return { ok: true, reference };
}
