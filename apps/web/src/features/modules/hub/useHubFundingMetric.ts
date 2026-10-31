"use client";

import { useEffect, useState } from "react";
import { useCapiroQuery } from "../../../shared/capiro/queries";
import {
  fundingMetricState,
  hubFundingRequest,
  type HubMetricState,
} from "./hub-metrics";

export function useHubFundingMetric(clientId: string) {
  const request = hubFundingRequest(clientId);
  const enabled = request !== null;
  const query = useCapiroQuery("intelligence.funding.search", request ?? {}, {
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
  }, [clientId, enabled, query.reload]);
  const state: HubMetricState = request
    ? fundingMetricState(query, now)
    : { status: "unavailable", reason: "Select a valid client scope." };
  return { state, refresh: query.reload, canRefresh: request !== null };
}
