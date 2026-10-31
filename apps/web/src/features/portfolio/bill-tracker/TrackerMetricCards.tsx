"use client";
import type { TrackerBackend } from "@/shared/portfolio/config/config";
import { useTrackerMetrics } from "./useTrackerMetrics";
import type { WatchCoverage } from "./tracker-metrics-contracts";
const statusLabel = {
  COVERED: "Covered",
  PARTIAL: "Partial",
  UNSUPPORTED: "Unsupported",
  STALE: "Stale",
  UNAVAILABLE: "Unavailable",
  NOT_CONFIGURED: "Not configured",
} as const;
function CoverageDetails({ value }: { value: WatchCoverage }) {
  const config = value.configuration;
  return (
    <details>
      <summary>Coverage details</summary>
      <p>
        Monitoring-concept and source-health coverage; not a percentage of
        tracked bills or a guarantee that every hearing is present.
      </p>
      <p>
        {value.overall.coveredConcepts} of {value.overall.totalConcepts}{" "}
        monitoring concepts covered.{" "}
        {config.complete
          ? "The saved configuration is represented by this model."
          : "Saved criteria are not fully represented; a complete percentage is unavailable."}
      </p>
      <p>
        {config.topicCount} topics; {config.tagCount} tags;{" "}
        {config.flatTermCount} flat terms; {config.issueAreaCount} issue areas.
      </p>
      {config.reason === "CORE_WATCHLIST_MODEL_UNSUPPORTED" && (
        <p>The coverage model cannot measure saved Core tags or issue areas.</p>
      )}
      {config.reason === "UNMAPPED_WATCHLIST_CONFIGURATION" && (
        <p>
          Saved flat terms or issue areas are outside the topic coverage
          denominator.
        </p>
      )}
      <p>
        As of {value.asOf} (UTC). Configuration owner: {value.backend}.
      </p>
      <ul>
        {value.concepts.map((concept) => (
          <li key={concept.conceptId}>
            {concept.label}: {statusLabel[concept.status]}.{" "}
            {concept.gaps.join(" ")}
            {concept.lastObservedAt && (
              <> Last source observation: {concept.lastObservedAt}.</>
            )}
          </li>
        ))}
      </ul>
      {value.signalFamilies.some((item) => item.family === "hearing") && (
        <p>
          Committee sources: {value.sourceHealth.healthy} healthy,{" "}
          {value.sourceHealth.degraded} degraded, {value.sourceHealth.failing}{" "}
          failing; {value.sourceHealth.acceptedExceptions} accepted exceptions.
        </p>
      )}
      <p>
        {value.sourceHealth.stale} stale concepts. Status reflects the existing
        source-health model, not an ingestion guarantee.
      </p>
      {value.recommendations.map((text, index) => (
        <p key={index}>{text}</p>
      ))}
    </details>
  );
}
export function TrackerMetricCards({
  clientId,
  backend,
  version,
  boardScope,
  boardReady,
}: {
  clientId: string;
  backend: TrackerBackend;
  version?: 1;
  boardScope: string;
  boardReady: boolean;
}) {
  const view = useTrackerMetrics(
    clientId,
    backend,
    boardScope,
    version,
    boardReady,
  );
  return (
    <>
      <div role="group" aria-label="Material changes">
        <strong>{view.material?.count ?? "—"}</strong>
        <small>Material changes</small>
        <small role="status">
          {view.materialPending
            ? "Loading…"
            : view.material
              ? "Saved tracked bills · 21 days"
              : "Unavailable"}
        </small>
        {view.material && (
          <details>
            <summary>Count and timing</summary>
            <p>
              Distinct currently saved Tracker bills with classified retained
              material changes; each bill counts once. This is not an unread
              count, event count or loaded-page total.
            </p>
            <p>
              {view.material.window.start} to {view.material.window.end} (UTC;
              start included, end excluded).
            </p>
            <p>
              As of {view.material.asOf}; observation completed{" "}
              {view.material.observedAt}.
            </p>
            <p>
              Latest matching retained change:{" "}
              {view.material.sourceObservedAt ?? "None"}. These timestamps do
              not establish ingestion freshness.
            </p>
            <p>Tracker owner: {view.material.backend}.</p>
          </details>
        )}
      </div>
      <div role="group" aria-label="Watchlist coverage">
        <strong>
          {view.coverage?.overall.percentage == null
            ? "—"
            : `${view.coverage.overall.percentage}%`}
        </strong>
        <small>Watchlist coverage</small>
        <small role="status">
          {view.coveragePending
            ? "Loading…"
            : view.coverage
              ? statusLabel[view.coverage.overall.status]
              : "Unavailable"}
        </small>
        {view.coverage && <CoverageDetails value={view.coverage} />}
      </div>
    </>
  );
}
