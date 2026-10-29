/**
 * Decision table for the invitation receiver (`/accept-invite`).
 *
 * Clerk organization invitations are accepted with the provider's own ticket flow, so this
 * module only decides which existing flow to run. It is pure so every entry case can be
 * tested without a browser: a new invited account, an invited person whose account already
 * exists (Clerk accepts that ticket through sign-in, not sign-up), a signed-in visitor whose
 * session must not absorb someone else's invitation, and a ticket Clerk refuses.
 */
export type AcceptInvitePhase =
  | "loading"
  | "ready"
  | "create"
  | "signed-in-conflict"
  | "expired"
  | "invalid-ticket";

export type AcceptInviteInput = {
  authLoaded: boolean;
  signUpLoaded: boolean;
  isSignedIn: boolean;
  ticket: string | null;
  localPhase: AcceptInvitePhase;
};

/** Which state the receiver shows for the current visitor. */
export function acceptInvitePhase({
  authLoaded,
  signUpLoaded,
  isSignedIn,
  ticket,
  localPhase,
}: AcceptInviteInput): AcceptInvitePhase {
  if (!authLoaded || !signUpLoaded) return "loading";
  if (!ticket) return "expired";
  // An existing session would create the account for the wrong person, so the visitor has to
  // sign out first; the ticket stays in the URL and is replayed afterwards.
  if (isSignedIn) return "signed-in-conflict";
  return localPhase === "loading" ? "ready" : localPhase;
}

/**
 * Ticket rejections that a second provider attempt cannot fix: the ticket is malformed,
 * expired, already used or no longer valid. Clerk hands these back as `code` values.
 */
const TERMINAL_TICKET_CODES = new Set([
  "ticket_invalid",
  "ticket_expired",
  "ticket_not_found",
  "ticket_already_used",
  "ticket_revoked",
  "verification_failed",
  "verification_expired",
]);

export function ticketRejectedByProvider(error: unknown): boolean {
  const code = (error as { errors?: { code?: unknown }[] } | null)?.errors?.[0]?.code;
  return typeof code === "string" && TERMINAL_TICKET_CODES.has(code);
}

/**
 * Whether a failed ticket signup may be retried through sign-in, which is how Clerk accepts
 * an organization invitation for someone who already has an account. Terminal ticket
 * rejections are never retried, and without a sign-in instance there is no second path.
 */
export function ticketFallbackAllowed(error: unknown, signInAvailable: boolean): boolean {
  return signInAvailable && !ticketRejectedByProvider(error);
}

/**
 * Same-origin return path that keeps the ticket in the query. Used after sign-out so the
 * provider does not have to preserve it across the sign-out navigation.
 */
export function ticketReturnPath(ticket: string | null): string {
  return ticket
    ? `/accept-invite?__clerk_ticket=${encodeURIComponent(ticket)}`
    : "/accept-invite";
}
