import { ChartUploader } from "@/components/app/chart-uploader";
import { PageHeader, StatusCard } from "@/components/app/status";
import { GlassIcon } from "@/components/icons/glass-icon";
import { providerStatus } from "@/server/providers";
import { requireOnboarded } from "@/server/session";

export const metadata = { title: "AI Chart Analysis" };

export default async function AiAnalysis() {
  await requireOnboarded("/app/ai-analysis");
  const p = providerStatus();
  return (
    <>
      <PageHeader title="AI Chart Analysis" subtitle="Upload a screenshot. Treidify reads only what the chart shows." />
      <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        <ChartUploader />
        <StatusCard title="What the analysis covers" icon={<GlassIcon name="spark" size={32} />} status={p.ai ? "Ready" : "AI not connected"}>
          Market structure, liquidity, buy and sell areas, support and resistance, breakouts and retests, with the confirmation to wait for and the level that invalidates the idea. Every price in the report is read from the screenshot itself, and anything the chart does not show is left out rather than guessed. Add a question to focus the reading on what you want to know.
        </StatusCard>
      </div>
    </>
  );
}
