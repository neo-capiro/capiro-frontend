/**
 * How the Files page treats its session owner's state. Meri ends every file-access session itself shortly
 * before its cap (the cap follows the Core identity receipt, about a minute) and issues a new one; that
 * renewal, and an issuance the control did not answer, are not a loss of access. The loaded files stay on
 * screen through them; only a refusal (401/403 after the owner's bounded retries, or a port-level denial)
 * clears what was loaded.
 */
export type LibraryConnectionPhase =
  /** A current port is mounted. */
  | "ready"
  /** Nothing has been shown yet; the first issuance is in flight or being retried. */
  | "connecting"
  /** The session is being renewed (planned early end, or the hard cap); the last port stays displayed. */
  | "renewing"
  /** Issuance was not answered (408/429/5xx); the last port stays displayed while it is asked again. */
  | "retrying"
  /** Access was refused or the origin changed: nothing loaded may stay on screen. */
  | "lost";

type Status = "idle" | "connecting" | "ready" | "unavailable" | "expired";
type Reason = "renewal" | "expiry" | "access-lost" | undefined;

const transientStatus = (status: number | undefined) =>
  status !== undefined && (status === 408 || status === 429 || status >= 500);

export function libraryConnectionPhase(
  status: Status,
  reason: Reason,
  issuanceStatus: number | undefined,
  shown: boolean,
): LibraryConnectionPhase {
  if (status === "ready") return "ready";
  if (status === "idle" || status === "connecting")
    return shown ? "renewing" : "connecting";
  if (status === "expired")
    return reason === "renewal" || reason === "expiry" ? "renewing" : "lost";
  // unavailable: only an answered refusal is definitive.
  return transientStatus(issuanceStatus)
    ? shown
      ? "retrying"
      : "connecting"
    : "lost";
}

/** Quiet backoff for an unanswered issuance; after the last delay the person is asked instead. */
export const RETRY_DELAYS_MS = Object.freeze([2_000, 5_000, 10_000, 30_000]);
export const retryDelayMs = (attempt: number) =>
  attempt < RETRY_DELAYS_MS.length ? RETRY_DELAYS_MS[attempt]! : null;
