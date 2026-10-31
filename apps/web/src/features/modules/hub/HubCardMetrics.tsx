"use client";

import type { ModuleSlug } from "../../../shared/shell/module-catalog";
import { HubMetric } from "./HubMetric";
import { useHubFundingMetric } from "./useHubFundingMetric";

export function HubCardMetrics({
  module,
  clientId,
}: {
  module: ModuleSlug;
  clientId: string;
}) {
  if (module === "intelligence") return <FundingMetric clientId={clientId} />;
  return (
    <HubMetric
      label="Activity metrics"
      state={{
        status: "unavailable",
        reason: "Module totals are not yet available.",
      }}
    />
  );
}

function FundingMetric({ clientId }: { clientId: string }) {
  const metric = useHubFundingMetric(clientId);
  return (
    <section aria-label="Funding opportunity metrics">
      <HubMetric label="Active funding opportunities" state={metric.state} />
      <p>
        {clientId ? "Matched to this client" : "Enabled funding catalogs"}
        {" · "}All dates · Source records, not awarded dollars.
      </p>
      <button
        type="button"
        onClick={metric.refresh}
        disabled={!metric.canRefresh || metric.state.status === "loading"}
      >
        Refresh funding metrics
      </button>
    </section>
  );
}
