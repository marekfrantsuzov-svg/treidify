import type { Metadata } from "next";
import { FeedbackForm } from "@/components/settings/feedback-form";
import { requireOnboarded } from "@/server/session";

export const metadata: Metadata = { title: "Send feedback" };

export default async function FeedbackPage() {
  await requireOnboarded("/app/settings/feedback");
  return <FeedbackForm />;
}
