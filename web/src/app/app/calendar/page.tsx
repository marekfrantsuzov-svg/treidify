import { PageHeader, StatusCard } from "@/components/app/status";
import { EventPreview } from "@/components/previews/event-preview";
import { GlassIcon } from "@/components/icons/glass-icon";
import { providerStatus } from "@/server/providers";
import { requireOnboarded } from "@/server/session";

export const metadata = { title: "Economic Calendar" };

export default async function Calendar() {
  await requireOnboarded("/app/calendar");
  const p = providerStatus();
  return (
    <>
      <PageHeader title="Economic Calendar" subtitle="Scheduled releases in your time zone, with forecast, previous and actual." />
      <div className="grid gap-4 lg:grid-cols-[1fr_1.3fr]">
        <StatusCard title="This week’s events" icon={<GlassIcon name="calendar" size={32} />} status={p.news ? "Live" : "Feed not connected"}>
          Once the calendar feed is connected, every release shows its time, importance, forecast, previous and actual figures, and what a surprise could mean for gold and the dollar. Alerts can warn you before high-impact events. The preview shows the layout with a sample event.
        </StatusCard>
        <EventPreview />
      </div>
    </>
  );
}
