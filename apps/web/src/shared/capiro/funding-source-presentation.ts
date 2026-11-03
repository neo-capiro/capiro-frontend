/**
 * Human wording for funding source coverage.
 *
 * One place, used by the intelligence module and the portfolio view, so the two
 * surfaces can never disagree about what a source is called or what a stale
 * feed means. Raw enum values stay the wire/filter contract — only the LABEL
 * changes, because `sbir_sttr` and `initial_partial` are not a user experience.
 *
 * Honesty rules encoded here:
 *  - a missing success timestamp is only reported as "No successful update yet"
 *    when the STATE proves no success has ever completed (never_synced,
 *    initial_partial, degraded). For unavailable/unknown/not_enabled the state
 *    says nothing about history, so the honest wording is "Last successful
 *    update unavailable" — never a claim about whether data exists;
 *  - a latest ATTEMPT is shown separately and never substituted for a success;
 *  - an unparseable or absent date degrades to "Unavailable" and never throws.
 */

export const FUNDING_SOURCE_LABELS: Readonly<Record<string, string>> = {
  grants_gov: "Grants.gov",
  sam_gov: "SAM.gov",
  agency_forecast: "Agency forecasts",
  dibbs: "DIBBS",
  sbir_sttr: "SBIR/STTR",
  ca_portal: "California Grants Portal",
};

export type FundingHealthState =
  | "current"
  | "stale"
  | "initial_partial"
  | "error_cached"
  | "degraded"
  | "never_synced"
  | "unavailable"
  | "not_enabled"
  | "unknown";

export const FUNDING_STATE_LABELS: Readonly<Record<FundingHealthState, string>> = {
  current: "Up to date",
  stale: "Update overdue",
  initial_partial: "Initial sync incomplete",
  error_cached: "Latest update incomplete; showing saved data",
  degraded: "No usable coverage yet",
  never_synced: "Not synced yet",
  unavailable: "Status unavailable",
  not_enabled: "Not enabled for this workspace",
  unknown: "Status unknown",
};

/** A readable source name. Never returns the raw enum, even for an unknown value. */
export function fundingSourceLabel(source: string | null | undefined): string {
  if (!source) return "Unknown source";
  const known = FUNDING_SOURCE_LABELS[source];
  if (known) return known;
  const words = source.replaceAll("_", " ").trim();
  return words ? words.charAt(0).toUpperCase() + words.slice(1) : "Unknown source";
}

/** A readable coverage state. Never returns the raw enum. */
export function fundingStateLabel(state: string | null | undefined): string {
  if (!state) return FUNDING_STATE_LABELS.unknown;
  return FUNDING_STATE_LABELS[state as FundingHealthState] ?? "Status unknown";
}

const timestampFormat = new Intl.DateTimeFormat("en-US", {
  year: "numeric",
  month: "short",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "UTC",
  hourCycle: "h23",
});

/**
 * A formatted UTC instant, or null when the value is missing or unparseable.
 * Returning null (rather than throwing or printing "Invalid Date") lets each
 * caller choose its own honest wording.
 */
export function formatFundingTimestamp(value: string | null | undefined): string | null {
  if (!value) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return `${timestampFormat.format(parsed)} UTC`;
}

export interface FundingFreshnessFacts {
  source: string;
  state: string;
  /** Older field, still populated by both endpoints. */
  lastSyncedAt?: string | null;
  /** Present on newer responses; preferred when set. */
  lastSuccessAt?: string | null;
  /** The most recent attempt, successful or not. Never a success substitute. */
  latestAttemptAt?: string | null;
}

export interface FundingFreshnessPresentation {
  sourceLabel: string;
  stateLabel: string;
  /** When the source last completed a successful run, or the null wording. */
  successLabel: string;
  /** When the last attempt happened, only when it adds information. */
  attemptLabel: string | null;
}

/** States that PROVE no successful run has completed. */
const PROVEN_NO_SUCCESS_STATES = new Set(["never_synced", "initial_partial", "degraded"]);

export function describeFundingFreshness(facts: FundingFreshnessFacts): FundingFreshnessPresentation {
  const success = formatFundingTimestamp(facts.lastSuccessAt ?? facts.lastSyncedAt ?? null);
  const attempt = formatFundingTimestamp(facts.latestAttemptAt ?? null);
  const successLabel = success
    ? `Last successful update ${success}`
    : PROVEN_NO_SUCCESS_STATES.has(facts.state)
      ? "No successful update yet"
      // The state does not say whether a success ever happened, so the absence
      // of a date is reported as unavailable rather than as a claim.
      : "Last successful update unavailable";
  return {
    sourceLabel: fundingSourceLabel(facts.source),
    stateLabel: fundingStateLabel(facts.state),
    successLabel,
    // Only shown when it is a distinct, known time: repeating the success time
    // as an "attempt" would imply a second, separate event.
    attemptLabel: attempt && attempt !== success ? `Latest attempt ${attempt}` : null,
  };
}
