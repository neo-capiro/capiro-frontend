/**
 * The diagnostic class of a locally produced 401.
 *
 * A 401 says a request was not authorized. It does not say why, and this
 * application previously collapsed every 401 into one visible "your session
 * expired" claim even when all it knew was that it could not verify a session.
 * This module is the single closed vocabulary that lets the producing boundary
 * state what it actually observed, and lets the browser report it back without
 * carrying any identity, path, body, token or exception detail.
 *
 * Only these four values exist. Anything absent, unreadable, duplicated or
 * unrecognized is `unknown` - never inferred from a response body.
 */
export const authFailureHeader = "X-Capiro-Auth-Class";

export type AuthFailureClass =
  /** This application could not obtain or verify its credential (not proof of expiry). */
  | "credential-unverified"
  /** No signed-in session was presented at all. */
  | "no-session"
  /** A downstream service answered the request with 401. */
  | "upstream-rejected"
  /** Fixed fallback: unmarked, unrecognized or unreadable. */
  | "unknown";

const admitted: readonly string[] = [
  "credential-unverified",
  "no-session",
  "upstream-rejected",
];

/** Admit only the closed vocabulary; everything else is the `unknown` fallback. */
export function admitAuthFailure(
  value: string | null | undefined,
): AuthFailureClass {
  return admitted.includes(value ?? "")
    ? (value as AuthFailureClass)
    : "unknown";
}

/**
 * 401 headers carrying exactly one local class. Built through `Headers.set`, so
 * any inherited value of the same name (any case) is replaced rather than joined
 * - a downstream service cannot spoof the class it is being classified as.
 */
export function authFailureHeaders(
  failure: AuthFailureClass,
  base: HeadersInit = {},
): Headers {
  const headers = new Headers(base);
  headers.set(authFailureHeader, failure);
  return headers;
}
