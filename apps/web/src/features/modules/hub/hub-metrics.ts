import { z } from "zod";
import type { fundingSearchResponse } from "../../../shared/capiro/operations/intelligence-funding";

/** Presentation state, not an aggregate API or an authorization decision. */
export type HubMetricState =
  | { status: "loading" }
  | { status: "denied" }
  | { status: "unavailable"; reason: string }
  | { status: "partial"; reason: string }
  | {
      status: "available";
      value: number;
      observedAt: string;
      stale: boolean;
    };

export type FundingObservation = z.infer<typeof fundingSearchResponse>;
const validClientId = z.uuid();

export function hubFundingRequest(clientId: string) {
  // A malformed selected scope must never silently become an all-client read.
  if (clientId && !validClientId.safeParse(clientId).success) return null;
  return {
    query: {
      mode: clientId ? ("matched" as const) : ("all" as const),
      ...(clientId ? { clientId } : {}),
      lifecycle: "active",
      page: 1,
      pageSize: 1,
    },
  };
}

/** Consume the owner's aggregate, never opportunities.length or source health
 * recordCount (which ignores the selected client's matching criteria). */
export function fundingMetricState(
  query: { loading: boolean; error?: Error; data?: FundingObservation },
  now: number,
): HubMetricState {
  if (query.error) {
    const status = "status" in query.error ? query.error.status : undefined;
    return status === 401 || status === 403
      ? { status: "denied" }
      : {
          status: "unavailable",
          reason: "Funding metrics could not be loaded.",
        };
  }
  if (query.loading) return { status: "loading" };
  const data = query.data;
  if (!data)
    return { status: "unavailable", reason: "No observation available." };
  const enabled = data.freshness.filter(
    (source) => source.state !== "not_enabled",
  );
  if (!enabled.length)
    return {
      status: "unavailable",
      reason: "No enabled funding sources reported.",
    };
  if (
    !data.catalogComplete ||
    data.totalIsCapped ||
    enabled.some((source) => source.state !== "current")
  )
    return {
      status: "partial",
      reason: "Source coverage or freshness is incomplete; total withheld.",
    };
  const observed = z.iso.datetime().safeParse(data.generatedAt).success
    ? Date.parse(data.generatedAt)
    : NaN;
  if (
    !Number.isFinite(observed) ||
    !Number.isFinite(now) ||
    !Number.isSafeInteger(data.total) ||
    data.total === null ||
    data.total < 0 ||
    data.counts.active !== data.total
  )
    return {
      status: "unavailable",
      reason: "The active total could not be verified.",
    };
  return {
    status: "available",
    value: data.total,
    observedAt: data.generatedAt,
    stale: Math.abs(now - observed) > 120_000,
  };
}
