import { Users } from "lucide-react";
import { PageHeader, StatusCard } from "@/components/app/status";
import { CommunityPreview } from "@/components/previews/community-preview";
import { requireOnboarded } from "@/server/session";

export const metadata = { title: "Community" };

export default async function Community() {
  await requireOnboarded("/app/community");
  return (
    <>
      <PageHeader title="Community" subtitle="Rooms unlocked by verified results, never by payment." />
      <div className="grid gap-4">
        <StatusCard title="General community" icon={<Users className="h-4 w-4 text-accent" />} status="Opening soon" action={{ href: "/app/settings/profile", label: "Set up your public profile" }}>
          Posting, comments and follows open in the community stage. Your membership is already reserved. Pro and Whale rooms are unlocked only by verified net realized profit from a synced account, checked month by month with anti-manipulation rules. Your profile is private until you choose otherwise.
        </StatusCard>
        <CommunityPreview />
      </div>
    </>
  );
}
