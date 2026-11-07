import { PlanGate } from "@/components/billing/plan-gate";

/** Plan gate for this section (server-side): charts.ai. */
export default function Layout({ children }: { children: React.ReactNode }) {
  return <PlanGate feature="charts.ai" path="/app/ai-analysis">{children}</PlanGate>;
}
