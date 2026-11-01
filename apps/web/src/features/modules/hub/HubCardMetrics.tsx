"use client";

import type { ModuleSlug } from "../../../shared/shell/module-catalog";
import { HubMetric } from "./HubMetric";
import { useHubFundingMetric } from "./useHubFundingMetric";
import { useHubDirectoryMetric } from "./useHubDirectoryMetric";
import { useHubOwnedMetrics } from "./useHubOwnedMetrics";
import { ownedMetrics, type OwnedMetricModule } from "./hub-owned-metrics";
import { useHubAggregateMetric } from "./useHubAggregateMetric";
import {
  aggregateMetrics,
  type AggregateMetricModule,
} from "./hub-aggregate-metrics";

export function HubCardMetrics({
  module,
  clientId,
}: {
  module: ModuleSlug;
  clientId: string;
}) {
  if (module === "intelligence") return <FundingMetric clientId={clientId} />;
  if (module === "directory") return <DirectoryMetric />;
  if (module === "planner" || module === "strategies" || module === "workspace")
    return <OwnedMetric module={module} clientId={clientId} />;
  if (module === "engagement" || module === "research-portfolios")
    return <AggregateMetric module={module} clientId={clientId} />;
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

function OwnedMetric({
  module,
  clientId,
}: {
  module: OwnedMetricModule;
  clientId: string;
}) {
  const metric = useHubOwnedMetrics(module, clientId);
  const definition = ownedMetrics[module];
  return (
    <section aria-label={`${definition.label} metrics`}>
      <HubMetric label={definition.label} state={metric.state} />
      <p>
        {clientId ? "Selected client" : "All accessible work"}
        {" · "}
        {definition.basis}
      </p>
      {metric.notice && <small>{metric.notice}</small>}
      <button
        type="button"
        onClick={metric.refresh}
        disabled={!metric.canRefresh || metric.state.status === "loading"}
      >
        Refresh {definition.label.toLowerCase()}
      </button>
    </section>
  );
}

function AggregateMetric({
  module,
  clientId,
}: {
  module: AggregateMetricModule;
  clientId: string;
}) {
  const metric = useHubAggregateMetric(module, clientId);
  const definition = aggregateMetrics[module];
  return (
    <section aria-label={`${definition.label} metrics`}>
      <HubMetric label={definition.label} state={metric.state} />
      <p>
        {clientId ? "Selected client" : "All accessible work"}
        {" · "}
        {definition.basis}
      </p>
      {metric.notice && <small>{metric.notice}</small>}
      <button
        type="button"
        onClick={metric.refresh}
        disabled={!metric.canRefresh || metric.state.status === "loading"}
      >
        Refresh {definition.label.toLowerCase()}
      </button>
    </section>
  );
}

function DirectoryMetric() {
  const metric = useHubDirectoryMetric();
  return (
    <section aria-label="Directory contact metrics">
      <HubMetric label="Directory contacts" state={metric.state} />
      <p>Global catalog · All dates · Unaffected by client selection.</p>
      {metric.notice && <small>{metric.notice}</small>}
      <button
        type="button"
        onClick={metric.refresh}
        disabled={metric.state.status === "loading"}
      >
        Refresh Directory metrics
      </button>
    </section>
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
