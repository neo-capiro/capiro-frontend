"use client";
import { usePortfolioMetrics } from "./usePortfolioMetrics";
import { PortfolioMetricDefinitions } from "./PortfolioMetricDefinitions";
import type { PortfolioMetrics } from "./metrics";
import styles from "./portfolio.module.css";

type MetricState = ReturnType<typeof usePortfolioMetrics>;

export function PortfolioPulse({ fiscalYear }: { fiscalYear: number }) {
  const query = usePortfolioMetrics();
  return (
    <section aria-label="Portfolio pulse">
      <div className={styles.pulse} data-testid="portfolio-metric-panel">
        <BillWatchCoverage
          data={query.data}
          pending={query.pending}
          fiscalYear={fiscalYear}
        />
        <PortfolioCounts data={query.data} pending={query.pending} />
      </div>
      <MetricSnapshot query={query} />
      <PortfolioMetricDefinitions />
    </section>
  );
}

function PortfolioCounts({
  data,
  pending,
}: Pick<MetricState, "data" | "pending">) {
  const clients =
    data?.clients.status === "available" ? data.clients.counts : undefined;
  const objectives =
    data?.objectives.status === "available"
      ? data.objectives.counts
      : undefined;
  const activity =
    data?.activity.status === "available" ? data.activity.counts : undefined;
  const tiles = [
    ["Active clients", clients?.activeClients],
    ["Objectives", objectives?.objectives],
    ["Awaiting review", objectives?.awaitingReview],
    [
      "Overdue CRM",
      activity
        ? activity.overdueRequests + activity.overdueCommitments
        : undefined,
    ],
    ["CRM activity · 30d", activity?.recordedActivities],
  ] as const;
  return (
    <div
      className={styles.pulseStats}
      role="region"
      aria-label="Portfolio pulse metrics"
      tabIndex={0}
    >
      {tiles.map(([label, value]) => (
        <div
          key={label}
          role="group"
          aria-label={`${label}: ${value ?? (pending ? "Loading" : "Unavailable")}`}
        >
          <strong>{value ?? "—"}</strong>
          <span className="eyebrow">{label}</span>
          {value === undefined && (
            <small>{pending ? "Loading…" : "Unavailable"}</small>
          )}
        </div>
      ))}
    </div>
  );
}

function BillWatchCoverage({
  data,
  pending,
  fiscalYear,
}: {
  data: PortfolioMetrics | undefined;
  pending: boolean;
  fiscalYear: number;
}) {
  const watches =
    data?.billWatch.status === "available" ? data.billWatch.counts : undefined;
  return (
    <div className={styles.coverage}>
      <p className="eyebrow">
        Portfolio pulse · FY{String(fiscalYear).slice(-2)}
      </p>
      <div className="row">
        <strong>
          {watches?.activeClients
            ? `${Math.round((100 * watches.clientsWithWatches) / watches.activeClients)}%`
            : "—"}
        </strong>
        <small>
          active clients with
          <br />a saved bill watch
        </small>
      </div>
      <small>
        {watches
          ? `${watches.clientsWithWatches} of ${watches.activeClients} active clients${watches.activeClients === 0 ? " · no eligible clients" : ""}`
          : pending
            ? "Loading…"
            : "Unavailable"}
      </small>
    </div>
  );
}

function MetricSnapshot({ query }: { query: MetricState }) {
  const { data } = query;
  const partial =
    data &&
    [data.clients, data.objectives, data.activity, data.billWatch].some(
      (group) => group.status === "unavailable",
    );
  return (
    <div className="row between">
      <p className="muted">
        {data ? (
          <>
            {query.stale ? "Stale snapshot" : "Snapshot"} ·{" "}
            <time dateTime={data.observedAt}>
              {new Date(data.observedAt).toLocaleString(undefined, {
                timeZone: "UTC",
              })}{" "}
              UTC
            </time>
            {partial
              ? " · Some sources unavailable"
              : " · Complete recorded populations"}
          </>
        ) : query.pending ? (
          "Loading portfolio metrics…"
        ) : (
          "Portfolio metrics unavailable."
        )}
      </p>
      <button className="button ghost" onClick={query.refresh}>
        Refresh metrics
      </button>
    </div>
  );
}
