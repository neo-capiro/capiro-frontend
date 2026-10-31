/**
 * Cohort availability contract for the ancillary Outreach "campaign sessions" read.
 *
 * Campaign sessions are served by the separate engagement application
 * (`engagement/outreach-v3/sessions` is mounted only by the engagement app, not by main Core).
 * Whether that surface is reachable is a deployment fact this frontend cannot infer: an observed
 * 404, a missing client-side URL or a declared route all fail to prove it. The cohort therefore
 * states availability explicitly, and this module is the single place that interprets it.
 *
 * Configuration owner: the portfolio-preview frontend task definition environment (server-only
 * process environment, never a NEXT_PUBLIC_ variable). Two keys belong to this contract:
 *
 *   ENGAGEMENT_SESSIONS_AVAILABILITY   "enabled" | "disabled"   (unset = unknown)
 *   ENGAGEMENT_API_BASE_URL            base URL of the engagement application
 *
 * Semantics:
 *
 *   "disabled"  the cohort has stated that this surface is unsupported. The list issues no
 *               ancillary sessions request at all (initial render, rerender, search, paging,
 *               retry) and presents the surface as not available, without a retry control that
 *               could dispatch a request.
 *   "enabled"   the surface is served by the accepted engagement application. Requires
 *               ENGAGEMENT_API_BASE_URL: without it the state falls back to "disabled" (fail
 *               closed) and records an issue, because sending an "enabled" selection to the main
 *               Core application is known to be wrong and must never be the silent outcome.
 *   "unknown"   the cohort has not stated availability (unset or blank). Behaviour is the existing
 *               accepted one: the request is issued on its declared service and a failure is
 *               reported honestly as partial results. Nothing is hidden or fabricated.
 *
 * A value that is neither "enabled" nor "disabled" is a configuration error; it fails closed to
 * "disabled" with a recorded issue rather than degrading to "unknown", so a typo cannot silently
 * re-enable a request the cohort meant to suppress.
 */
export type EngagementSessionsAvailability = "enabled" | "disabled" | "unknown";

export const ENGAGEMENT_SESSIONS_AVAILABILITY_VARIABLE =
  "ENGAGEMENT_SESSIONS_AVAILABILITY";
export const ENGAGEMENT_API_BASE_URL_VARIABLE = "ENGAGEMENT_API_BASE_URL";

export function resolveEngagementSessionsAvailability(
  env: Record<string, string | undefined>,
  engagementServiceUrl: string | undefined,
  issues: string[] = [],
): EngagementSessionsAvailability {
  const raw = (env[ENGAGEMENT_SESSIONS_AVAILABILITY_VARIABLE] ?? "")
    .trim()
    .toLowerCase();
  if (raw === "") return "unknown";
  if (raw === "disabled") return "disabled";
  if (raw === "enabled") {
    if (engagementServiceUrl) return "enabled";
    issues.push(
      `${ENGAGEMENT_SESSIONS_AVAILABILITY_VARIABLE}=enabled requires a valid ${ENGAGEMENT_API_BASE_URL_VARIABLE}; the ancillary session reads stay disabled.`,
    );
    return "disabled";
  }
  issues.push(
    `${ENGAGEMENT_SESSIONS_AVAILABILITY_VARIABLE} must be "enabled" or "disabled"; the ancillary session reads stay disabled.`,
  );
  return "disabled";
}
