import { useFunnelSession } from "../../lib/funnel";
import { TrialBilling } from "./TrialBilling";
import { PaidBilling } from "./PaidBilling";

export function BillingPage() {
  const session = useFunnelSession();
  if (!session.data) return null;
  return session.data.plan === "paid" ? (
    <PaidBilling session={session.data} />
  ) : (
    <TrialBilling session={session.data} />
  );
}
