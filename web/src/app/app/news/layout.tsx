import { PlanGate } from "@/components/billing/plan-gate";

/** Plan gate for this section (server-side): news.global. */
export default function Layout({ children }: { children: React.ReactNode }) {
  return <PlanGate feature="news.global" path="/app/news">{children}</PlanGate>;
}
