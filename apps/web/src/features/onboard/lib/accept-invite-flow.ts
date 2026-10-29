/**
 * Decision table for the invitation receiver (`/accept-invite`).
 *
 * An organization invitation link carries two provider values: `__clerk_ticket` (the ticket
 * itself) and `__clerk_status` (`sign_in`, `sign_up` or `complete`), which selects the
 * supported Clerk acceptance API. This module reads those values, chooses exactly one
 * provider effect, and never retries: an uncertain outcome belongs to the original attempt
 * journal, so no second authentication effect is issued.
 */
export type InvitationStatus = "sign_in" | "sign_up" | "complete";

export type AcceptInvitePhase =
  | "loading"
  | "ready"
  | "create"
  | "signed-in-conflict"
  | "complete"
  | "expired"
  | "invalid-ticket"
  | "verification-hold";

/** The provider's own status selector. Anything else is not an invitation we can run. */
export function readInvitationStatus(value: string | null | undefined): InvitationStatus | null {
  return value === "sign_in" || value === "sign_up" || value === "complete" ? value : null;
}

export type AcceptInviteInput = {
  authLoaded: boolean;
  signUpLoaded: boolean;
  signInLoaded: boolean;
  isSignedIn: boolean;
  ticket: string | null;
  status: InvitationStatus | null;
  /** A provider status the retained sign-in resource is still paused at, if any. */
  retainedHold: string | null;
  localPhase: AcceptInvitePhase;
};

/** Which state the receiver shows for the current visitor. */
export function acceptInvitePhase({
  authLoaded,
  signUpLoaded,
  signInLoaded,
  isSignedIn,
  ticket,
  status,
  retainedHold,
  localPhase,
}: AcceptInviteInput): AcceptInvitePhase {
  const loaded = status === "sign_in" ? signInLoaded : signUpLoaded;
  if (!authLoaded || !loaded) return "loading";
  if (!ticket) return "expired";
  // Without a recognised provider selector there is no supported effect to run.
  if (!status) return "invalid-ticket";
  if (status === "complete") return "complete";
  // An existing session must not absorb someone else's invitation; the visitor signs out
  // and the same ticket returns. This is a deliberate conflict, not an error recovery.
  if (isSignedIn) return "signed-in-conflict";
  // The provider still holds this attempt (a verification step, before or after a remount).
  // It is resumed from the provider resource and never re-created from the ticket.
  if (status === "sign_in" && retainedHold) return "verification-hold";
  return localPhase === "loading" ? "ready" : localPhase;
}

export type TicketStatus = {
  kind: "ok";
  status?: string | null;
  createdSessionId?: string | null;
};
export type ProviderOutcome =
  | TicketStatus
  | { kind: "refused"; message: string }
  | { kind: "hold"; status: string }
  | { kind: "unknown" };
export type ProviderCall = (action: "sign_up" | "sign_in") => Promise<ProviderOutcome>;

export type TicketOutcome =
  | { kind: "signup-started" }
  | { kind: "signed-in"; sessionId: string }
  | { kind: "verification-hold"; status: string }
  | { kind: "refused"; message: string }
  | { kind: "failed" }
  | { kind: "complete" };

/**
 * Runs the one provider effect the status selects. There is deliberately no fallback: a
 * transport error, a 5xx or an arbitrary provider error is an unknown outcome recorded by
 * the caller's journal, and re-issuing the ticket would create a second authentication
 * effect under the same invitation.
 */
export async function acceptInvitationTicket(input: {
  status: InvitationStatus;
  run: ProviderCall;
}): Promise<TicketOutcome> {
  const { status, run } = input;
  if (status === "complete") return { kind: "complete" };
  const outcome = await run(status === "sign_in" ? "sign_in" : "sign_up");
  if (outcome.kind === "unknown") return { kind: "failed" };
  if (outcome.kind === "refused") return { kind: "refused", message: outcome.message };
  if (outcome.kind === "hold") return { kind: "verification-hold", status: outcome.status };
  if (status === "sign_up") return { kind: "signup-started" };
  // `needs_second_factor`, `needs_client_trust`, `needs_new_password`,
  // `needs_protect_check` and every other non-complete status are a verification hold:
  // the provider resource is kept and the ticket is not resubmitted.
  if (outcome.status === "complete") {
    if (!outcome.createdSessionId) return { kind: "failed" };
    return { kind: "signed-in", sessionId: outcome.createdSessionId };
  }
  return { kind: "verification-hold", status: outcome.status || "needs_verification" };
}

/**
 * Fixed same-origin return path that keeps both provider values. Used directly as the
 * provider's sign-out redirect so the route never depends on post-sign-out navigation, and
 * never contains a caller-supplied origin.
 */
export function invitationReturnPath(
  ticket: string | null,
  status: InvitationStatus | null,
): string {
  const params = new URLSearchParams();
  if (ticket) params.set("__clerk_ticket", ticket);
  if (status) params.set("__clerk_status", status);
  return `/accept-invite${params.size ? `?${params.toString()}` : ""}`;
}
