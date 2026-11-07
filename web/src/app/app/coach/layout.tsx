import { PlanGate } from "@/components/billing/plan-gate";

/** Plan gate for this section (server-side): coach. */
export default function Layout({ children }: { children: React.ReactNode }) {
  return <PlanGate feature="coach" path="/app/coach">{children}</PlanGate>;
}
