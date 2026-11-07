import { PlanGate } from "@/components/billing/plan-gate";

/** Plan gate for this section (server-side): macro.advanced. */
export default function Layout({ children }: { children: React.ReactNode }) {
  return <PlanGate feature="macro.advanced" path="/app/macro">{children}</PlanGate>;
}
