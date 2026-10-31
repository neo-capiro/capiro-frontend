"use client";

import { useEffect, useState } from "react";
import { useCapiroQuery } from "../../../shared/capiro/queries";
import {
  hubOwnedRequest,
  ownedMetrics,
  ownedMetricObservation,
  type OwnedMetricModule,
} from "./hub-owned-metrics";

export function useHubOwnedMetrics(
  module: OwnedMetricModule,
  clientId: string,
) {
  const request = hubOwnedRequest(clientId);
  const enabled = request !== null;
  const query = useCapiroQuery(ownedMetrics[module].key, request ?? {}, {
    enabled,
  });
  const [now, setNow] = useState(Date.now);
  useEffect(() => {
    const clock = setInterval(() => setNow(Date.now()), 10_000);
    return () => clearInterval(clock);
  }, []);
  useEffect(() => {
    if (!enabled) return;
    const refresh = setInterval(query.reload, 60_000);
    return () => clearInterval(refresh);
  }, [module, clientId, enabled, query.reload]);
  return {
    ...ownedMetricObservation(module, query, clientId, now),
    refresh: query.reload,
    canRefresh: enabled,
  };
}
