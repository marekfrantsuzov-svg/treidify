/**
 * Treidify transactional email templates for membership. Pure functions (no sending), so they are unit tested and
 * reviewed in one place. Every template has a plain-text part. Dates are shown in UTC with the zone named, because
 * an email client's time zone is unknown.
 */
export type MembershipEmailKind = "waitlist_confirmation" | "access_approved" | "access_expiring" | "access_expired" | "subscription_available";

export interface EmailData { name?: string | null; endsAt?: Date | null; plan?: "essential" | "premium"; kind?: "trial" | "complimentary"; signInUrl: string; link?: string }

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

export function fmtUtc(d: Date) {
  return `${new Intl.DateTimeFormat("en-GB", { timeZone: "UTC", day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(d)} UTC`;
}

function layout(heading: string, paragraphs: string[], cta?: { label: string; url: string }) {
  const html = `<!doctype html><html><body style="margin:0;background:#0b0911;padding:32px 12px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Inter,Roboto,sans-serif">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0"><tr><td align="center">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:520px;background:#15121d;border:1px solid #2a2436;border-radius:20px">
<tr><td style="padding:32px 32px 8px"><span style="font-size:18px;font-weight:700;letter-spacing:-0.02em;color:#ffffff">Treidify</span></td></tr>
<tr><td style="padding:8px 32px 0"><h1 style="margin:0 0 12px;font-size:22px;line-height:1.3;letter-spacing:-0.02em;color:#ffffff">${esc(heading)}</h1>
${paragraphs.map((p) => `<p style="margin:0 0 14px;font-size:15px;line-height:1.6;color:#c9c2d6">${esc(p)}</p>`).join("")}
${cta ? `<p style="margin:22px 0 8px"><a href="${esc(cta.url)}" style="display:inline-block;background:#8445e8;background-image:linear-gradient(90deg,#8445e8,#db6edb);color:#ffffff;padding:12px 24px;border-radius:999px;font-size:15px;font-weight:600;text-decoration:none">${esc(cta.label)}</a></p>` : ""}
</td></tr>
<tr><td style="padding:20px 32px 28px;font-size:12px;line-height:1.5;color:#8a8399">Treidify · Your Trading Intelligence. Educational analytics, not financial advice.</td></tr>
</table></td></tr></table></body></html>`;
  const text = `${heading}\n\n${paragraphs.join("\n\n")}${cta ? `\n\n${cta.label}: ${cta.url}` : ""}\n\nTreidify · Your Trading Intelligence.`;
  return { html, text };
}

const planName = (d: EmailData) => (d.plan === "essential" ? "Essential" : "Premium");

export function membershipEmail(kind: MembershipEmailKind, d: EmailData): { subject: string; text: string; html: string } {
  const hi = d.name ? `Hi ${d.name.split(" ")[0]},` : "Hi,";
  switch (kind) {
    case "waitlist_confirmation":
      return { subject: "You're on the Treidify Waitlist", ...layout("You're on the Treidify Waitlist", [hi, "Your registration is confirmed. We're currently accepting members in limited stages and will email you when access becomes available."]) };
    case "access_approved": {
      const until = d.endsAt ? `until ${fmtUtc(d.endsAt)}` : "with no end date";
      const what = d.kind === "trial" ? `a free ${planName(d)} trial` : `full ${planName(d)} access`;
      return { subject: "Your Treidify Access Is Ready", ...layout("Your Treidify Access Is Ready", [hi, `Your Treidify account has been approved. You now have ${what} ${until}.`, "Sign in to your account to get started."], { label: "Sign in to Treidify", url: d.signInUrl }) };
    }
    case "access_expiring":
      return { subject: "Your Treidify access ends soon", ...layout("Your Treidify access ends soon", [hi, `Your ${planName(d)} access ends on ${d.endsAt ? fmtUtc(d.endsAt) : "soon"}.`, "Your journal, synced history and settings stay in your account after it ends."], { label: "Open Treidify", url: d.signInUrl }) };
    case "access_expired":
      return { subject: "Your Treidify Access Has Expired", ...layout("Your Treidify Access Has Expired", [hi, "Your complimentary access period has ended. We'll notify you when subscriptions become available.", "Your account, journal and trading history are kept, so everything is still there if your access is renewed."]) };
    case "subscription_available":
      return { subject: "Treidify subscriptions are now available", ...layout("Treidify subscriptions are now available", [hi, "Thank you for waiting. You can now choose your Treidify plan and activate your subscription."], { label: "Choose your plan", url: d.link ?? d.signInUrl }) };
  }
}
