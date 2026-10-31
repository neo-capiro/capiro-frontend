import { directoryMetrics } from "../../../shared/capiro/operations/directory-schemas";
import type { HubMetricState } from "./hub-metrics";

export function directoryMetricState(query: {
  loading: boolean;
  error?: Error;
  data?: unknown;
}): HubMetricState {
  if (query.error) {
    const status = "status" in query.error ? query.error.status : undefined;
    return status === 401 || status === 403
      ? { status: "denied" }
      : {
          status: "unavailable",
          reason: "Directory metrics could not be loaded.",
        };
  }
  if (query.loading) return { status: "loading" };
  const parsed = directoryMetrics.safeParse(query.data);
  if (!parsed.success)
    return {
      status: "unavailable",
      reason: "No verified catalog count available.",
    };
  return {
    status: "available",
    value: parsed.data.count,
    observedAt: parsed.data.observedAt,
    stale: parsed.data.snapshot.state === "stale_cache",
  };
}

export function directorySnapshotNotice(data: unknown): string | undefined {
  const parsed = directoryMetrics.safeParse(data);
  if (!parsed.success) return undefined;
  const selection = {
    current: "Latest catalog pointer",
    previous_fallback: "Previous snapshot fallback",
    stale_cache: "Stale cached snapshot",
    unknown: "Snapshot selection unconfirmed",
  }[parsed.data.snapshot.state];
  return `${selection} · Publisher freshness unknown · Snapshot loaded ${parsed.data.snapshot.loadedAt}`;
}
