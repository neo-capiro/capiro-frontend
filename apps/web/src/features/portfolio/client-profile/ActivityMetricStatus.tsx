import type { ActivityMetricsView } from "./useActivityMetrics";
export function ActivityMetricStatus({
  metrics,
}: {
  metrics: ActivityMetricsView;
}) {
  if (!metrics.data)
    return (
      <small role="status">
        {metrics.pending ? "Loading counts…" : "Counts unavailable."}
        {!metrics.pending && (
          <>
            {" "}
            <button className="button ghost" onClick={metrics.refresh}>
              Retry counts
            </button>
          </>
        )}
      </small>
    );
  return (
    <small role="status">
      {metrics.stale ? "Stale counts · " : "Counted "}
      <time dateTime={metrics.data.observedAt}>
        {new Date(metrics.data.observedAt).toLocaleString("en-US", {
          timeZone: "UTC",
        })}{" "}
        UTC
      </time>
      {metrics.stale && (
        <>
          {" "}
          <button className="button ghost" onClick={metrics.refresh}>
            Refresh counts
          </button>
        </>
      )}
    </small>
  );
}
