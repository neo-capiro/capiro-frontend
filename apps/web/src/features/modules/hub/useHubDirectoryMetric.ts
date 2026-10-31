"use client";

import { useEffect } from "react";
import { useCapiroQuery } from "../../../shared/capiro/queries";
import {
  directoryMetricState,
  directorySnapshotNotice,
} from "./hub-directory-metrics";

/** The global catalog intentionally has no selected-client input. */
export function useHubDirectoryMetric() {
  const query = useCapiroQuery("directory.metrics", {});
  useEffect(() => {
    const refresh = setInterval(query.reload, 60_000);
    return () => clearInterval(refresh);
  }, [query.reload]);
  const state = directoryMetricState(query);
  return {
    state,
    notice:
      state.status === "available"
        ? directorySnapshotNotice(query.data)
        : undefined,
    refresh: query.reload,
  };
}
