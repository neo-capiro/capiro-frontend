import type { ReconnectState } from "../../../shared/meri-conversations/reconnect-schedule";

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

/**
 * What the shared reconnect schedule sees. A planned early renewal reconnects at once and is not an episode;
 * a hard-cap expiry (a session that could not renew in time) and an unanswered issuance are "failing", so the
 * next attempt waits on the shared ladder (2 s doubling to 30 s) and a short-lived receipt can never drive a
 * request storm; an attempt in flight is "busy"; a ready port ends the episode.
 */
export function libraryReconnectState(
  phase: LibraryConnectionPhase,
  status: Status,
  reason: Reason,
): ReconnectState {
  if (status === "connecting") return "busy";
  if (phase === "renewing" && status === "expired" && reason === "expiry")
    return "failing";
  if (phase === "retrying") return "failing";
  if (phase === "connecting" && status === "unavailable") return "failing";
  return "ok";
}

/**
 * Automatic re-asks of an unanswered issuance or a hard-cap expiry before the person is asked instead: on the
 * shared ladder (2 s doubling to 30 s) these take about four and a half minutes, then polling stops and the page
 * offers "Check access again".
 */
export const LIBRARY_RECONNECT_ATTEMPTS = 12;

/** The planned early end of a session: reconnect now, outside the ladder. */
export const immediateRenewal = (
  phase: LibraryConnectionPhase,
  status: Status,
  reason: Reason,
) => phase === "renewing" && status === "expired" && reason === "renewal";
