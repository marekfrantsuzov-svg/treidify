import { notFound } from "next/navigation";
import { devOutbox, devOutboxEnabled } from "@/server/email";

export const dynamic = "force-dynamic";

/** Local development only: shows emails that would have been sent, so sign-up can be tested without an email provider. */
export default function Page() {
  if (!devOutboxEnabled() || process.env.NODE_ENV === "production") notFound();
  const mails = [...devOutbox()].reverse();
  return (
    <main className="mx-auto max-w-3xl p-8">
      <h1 className="text-2xl font-semibold text-ink">Development outbox</h1>
      <p className="mt-1 text-sm text-ink-3">Not available in production.</p>
      <ul className="mt-6 grid gap-3">
        {mails.map((m, i) => (
          <li key={i} data-testid="mail" className="glass rounded-2xl p-4 text-sm">
            <div className="font-semibold text-ink">{m.subject}</div>
            <div className="text-ink-3">to {m.to} · {m.at}</div>
            <pre className="mt-2 whitespace-pre-wrap text-ink-2">{m.text}</pre>
          </li>
        ))}
        {mails.length === 0 && <li className="text-ink-2">No emails yet.</li>}
      </ul>
    </main>
  );
}
