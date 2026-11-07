/** Formatting for the Members panel. Stored times are UTC; they are shown in the viewer's time zone, which is named. */
export function fmtDate(d: Date | string | null | undefined, tz: string, withTime = true) {
  if (!d) return "—";
  const x = typeof d === "string" ? new Date(d) : d;
  return new Intl.DateTimeFormat("en-GB", { timeZone: tz, day: "numeric", month: "short", year: "numeric", ...(withTime ? { hour: "2-digit", minute: "2-digit", hourCycle: "h23" as const } : {}) }).format(x);
}

export const tzLabel = (tz: string) => tz.replaceAll("_", " ");

/** "12 days 4 h left", "3 h 20 min left", "Ended 2 days ago". */
export function remaining(end: Date | string | null | undefined, now: Date | string) {
  if (!end) return null;
  const ms = new Date(end).getTime() - new Date(now).getTime();
  const abs = Math.abs(ms);
  const d = Math.floor(abs / 86_400_000), h = Math.floor((abs % 86_400_000) / 3_600_000), m = Math.floor((abs % 3_600_000) / 60_000);
  const span = d > 0 ? `${d} day${d === 1 ? "" : "s"}${h ? ` ${h} h` : ""}` : h > 0 ? `${h} h ${m} min` : `${m} min`;
  return ms > 0 ? `${span} left` : `Ended ${span} ago`;
}

export const planLabel = (p: string | null | undefined) => (p === "premium" ? "Premium" : p === "essential" ? "Essential" : "Not chosen");

export const STATE_LABEL: Record<string, string> = {
  owner: "Owner", active: "Active", pending: "Pending", expired: "Expired", suspended: "Suspended", revoked: "Revoked",
};
export const STATE_TONE: Record<string, "accent" | "up" | "warn" | "neutral" | "down"> = {
  owner: "accent", active: "up", pending: "warn", expired: "neutral", suspended: "down", revoked: "down",
};
export const SOURCE_LABEL: Record<string, string> = {
  trial: "Free trial", complimentary: "Complimentary", subscription: "Paid subscription", owner: "Owner",
};

export const ACTION_LABEL: Record<string, string> = {
  "member.approved": "Approved and granted access",
  "member.access_granted": "Granted access",
  "member.access_extended": "Extended access",
  "member.access_type_changed": "Changed access type",
  "member.plan_selected": "Changed selected plan",
  "member.access_ended": "Ended manual access",
  "member.access_revoked": "Revoked access",
  "member.access_expired": "Access expired (automatic)",
  "member.suspended": "Suspended",
  "member.reinstated": "Reinstated",
  "member.subscription_cancelled": "Cancelled subscription",
  "member.admin_granted": "Made admin",
  "member.admin_revoked": "Removed admin",
  "member.notes_updated": "Updated notes",
  "member.deleted": "Deleted member",
  "feedback.status": "Updated feedback status",
  "membership.subscriptions_announced": "Announced subscriptions",
  "membership.migrated": "Membership system enabled",
  "owner.bound": "Owner assigned",
};

/** One-line summary of an audit record's details. */
export function auditSummary(action: string, meta: unknown, tz: string) {
  const m = (meta ?? {}) as Record<string, unknown>;
  const d = (v: unknown) => (typeof v === "string" ? fmtDate(v, tz) : "no end date");
  switch (action) {
    case "member.approved":
    case "member.access_granted":
      return `${m.kind === "trial" ? "Free trial" : "Complimentary"} ${planLabel(m.plan as string)} · ${m.unlimited ? "unlimited" : `until ${d(m.endsAt)}`}`;
    case "member.access_extended": return `${m.previousEndsAt ? d(m.previousEndsAt) : "unlimited"} → ${m.endsAt ? d(m.endsAt) : "unlimited"}`;
    case "member.access_type_changed": return `${(m.to as Record<string, string>)?.kind === "trial" ? "Free trial" : "Complimentary"} Premium`;
    case "member.plan_selected": return `${planLabel(m.previous as string)} → ${planLabel(m.plan as string)}`;
    case "member.suspended":
    case "member.access_revoked": return m.reason ? `Reason: ${m.reason}` : "";
    case "member.access_expired": return `Ended ${d(m.endsAt)}`;
    case "member.deleted": return String(m.email ?? "");
    case "feedback.status": return `Now ${m.status}`;
    case "membership.migrated": return `${m.pending ?? 0} existing accounts moved to the waitlist, ${m.approved ?? 0} kept access`;
    default: return "";
  }
}
