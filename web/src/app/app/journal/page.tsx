import { BookOpen } from "lucide-react";
import { PageHeader, StatusCard } from "@/components/app/status";
import { JournalPreview } from "@/components/previews/journal-preview";
import { listAccounts } from "@/server/account-data";
import { requireOnboarded } from "@/server/session";

export const metadata = { title: "Journal" };

export default async function Journal() {
  const s = await requireOnboarded("/app/journal");
  const accounts = await listAccounts(s.user.id);
  return (
    <>
      <PageHeader title="Journal" subtitle="Every closed trade, recorded automatically from your account." />
      <div className="grid gap-4 lg:grid-cols-[1fr_1.4fr]">
        <StatusCard title="Your journal" icon={<BookOpen className="h-4 w-4 text-accent" />} status={accounts.length ? "Syncing" : "Needs account"} action={{ href: "/app", label: "Back to dashboard" }}>
          Once your MetaTrader account is connected, each closed trade appears here with its session, holding time, costs and result. You add notes, tags, screenshots and emotions; the coach reads them alongside the numbers. The preview shows the layout with a sample account.
        </StatusCard>
        <JournalPreview rows={6} />
      </div>
    </>
  );
}
