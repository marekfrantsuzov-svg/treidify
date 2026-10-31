import "server-only";

export interface Email { to: string; subject: string; text: string; html?: string }

/** Development-only outbox so verification links can be read in local runs and end-to-end tests. */
const outbox: (Email & { at: string })[] = (globalThis as { __treidifyOutbox?: (Email & { at: string })[] }).__treidifyOutbox ??= [];
export const devOutbox = () => outbox;
export const devOutboxEnabled = () => process.env.NODE_ENV !== "production" || process.env.DEV_OUTBOX === "1";

export const emailConfigured = () => Boolean(process.env.RESEND_API_KEY);

export async function sendEmail(mail: Email) {
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    if (devOutboxEnabled()) {
      outbox.push({ ...mail, at: new Date().toISOString() });
      if (outbox.length > 200) outbox.shift();
      console.info(`[email:dev] to=${mail.to} subject="${mail.subject}"\n${mail.text}`);
      return;
    }
    throw new Error("Email sending is not configured (RESEND_API_KEY).");
  }
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: process.env.EMAIL_FROM ?? "Treidify <noreply@treidify.com>", to: [mail.to], subject: mail.subject, text: mail.text, html: mail.html }),
  });
  if (!res.ok) throw new Error(`Email provider error ${res.status}`);
}

export function actionEmail(title: string, intro: string, url: string, cta: string) {
  const text = `${intro}\n\n${cta}: ${url}\n\nIf you did not request this, you can ignore this email.\n\nTreidify · Your Trading Intelligence.`;
  const html = `<div style="font-family:-apple-system,Segoe UI,Inter,sans-serif;max-width:520px;margin:auto;padding:32px;color:#0a1426">
<p style="font-weight:600;font-size:18px">Treidify</p><h1 style="font-size:22px">${title}</h1><p style="color:#3f4c66">${intro}</p>
<p><a href="${url}" style="display:inline-block;background:#1f62f0;color:#fff;padding:12px 22px;border-radius:999px;text-decoration:none">${cta}</a></p>
<p style="color:#6a7790;font-size:13px">If you did not request this, you can ignore this email.</p></div>`;
  return { text, html };
}
