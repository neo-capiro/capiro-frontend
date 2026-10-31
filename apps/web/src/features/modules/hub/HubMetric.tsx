import type { HubMetricState } from "./hub-metrics";

/** Shared by hub cards; no transport, scope authority or formula lives here. */
export function HubMetric({
  label,
  state,
}: {
  label: string;
  state: HubMetricState;
}) {
  const status =
    state.status === "available"
      ? state.stale
        ? "Stale snapshot"
        : "Complete source population"
      : {
          loading: "Loading…",
          denied: "Access denied",
          unavailable: "Unavailable",
          partial: "Partial coverage",
        }[state.status];
  return (
    <div role="group" aria-label={`${label}: ${status}`}>
      <p>
        <strong>
          {state.status === "available" ? state.value.toLocaleString() : "—"}
        </strong>{" "}
        {label}
      </p>
      <small>
        {status}
        {state.status === "available" && (
          <>
            {" · "}
            <time dateTime={state.observedAt}>
              {new Date(state.observedAt).toISOString()} UTC
            </time>
          </>
        )}
        {(state.status === "unavailable" || state.status === "partial") &&
          ` · ${state.reason}`}
      </small>
    </div>
  );
}
