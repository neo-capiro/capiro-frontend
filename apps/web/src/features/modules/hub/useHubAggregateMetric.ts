"use client";

import { useEffect, useState } from "react";
import { useCapiroQuery } from "../../../shared/capiro/queries";
import {
  aggregateMetrics,
  aggregateMetricObservation,
  hubAggregateRequest,
  type AggregateMetricModule,
} from "./hub-aggregate-metrics";

export function useHubAggregateMetric(
  module: AggregateMetricModule,
  clientId: string,
) {
  const request = hubAggregateRequest(clientId);
  const enabled = request !== null;
  const query = useCapiroQuery(aggregateMetrics[module].key, request ?? {}, {
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
    ...aggregateMetricObservation(module, query, clientId, now),
    refresh: query.reload,
    canRefresh: enabled,
  };
}
