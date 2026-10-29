import { clerkInputAttempt } from "./clerk-input-attempt";
import { ConfirmedInputRefusal, type AttemptGuard } from "./attempt-journal";
import {
  acceptInvitationTicket,
  type InvitationStatus,
  type ProviderOutcome,
} from "./accept-invite-flow";

/**
 * Page-level orchestration for the invitation receiver.
 *
 * It owns the two rules the page cannot express in component state alone:
 *   - the provider effect runs inside the existing attempt journal, so a result that is not
 *     authoritative completion settles as UNKNOWN instead of CONFIRMED;
 *   - a retained unfinished provider attempt is resumed from the provider resource itself,
 *     never re-created from the ticket on a remount or a fresh page load.
 */
export type SignUpResource = {
  create(args: { strategy: "ticket"; ticket: string }): Promise<unknown>;
};
export type SignInResource = {
  status?: string | null;
  createdSessionId?: string | null;
  create(args: {
    strategy: "ticket";
    ticket: string;
  }): Promise<{ status?: string | null; createdSessionId?: string | null }>;
};
export type InvitationResources = {
  signUp?: SignUpResource | null;
  signIn?: SignInResource | null;
  setActive?: ((args: { session: string }) => Promise<unknown>) | null;
};
export type InvitationWriter = {
  run<T>(intent: string, perform: (guard: AttemptGuard) => Promise<T>): Promise<T>;
};

/** Any status the provider retains on its sign-in resource, `complete` included. */
export function retainedSignInStatus(
  signIn: SignInResource | null | undefined,
): string | null {
  const status = signIn?.status;
  return status && status.length > 0 ? status : null;
}

/** A retained attempt that is paused at a verification step (not a finished sign-in). */
export function retainedSignInHold(
  signIn: SignInResource | null | undefined,
): string | null {
  const status = retainedSignInStatus(signIn);
  return status && status !== "complete" ? status : null;
}

/** A journaled provider effect that the provider did not finish. */
export class InvitationVerificationHold extends Error {
  readonly providerStatus: string;
  constructor(providerStatus: string) {
    super(`The provider did not complete this invitation (${providerStatus}).`);
    this.name = "InvitationVerificationHold";
    this.providerStatus = providerStatus;
  }
}

/** A completion that cannot be bound: the provider returned no session identity. */
export class InvitationUnboundCompletion extends Error {
  constructor() {
    super("The provider reported completion without a session.");
    this.name = "InvitationUnboundCompletion";
  }
}

export type InvitationRunOutcome =
  | { kind: "signup-started" }
  | { kind: "signed-in"; sessionId: string }
  | { kind: "verification-hold"; status: string }
  | { kind: "refused"; message: string }
  | { kind: "failed" }
  | { kind: "complete" }
  | { kind: "not-ready" };

export async function runAcceptInvitation(input: {
  status: InvitationStatus;
  ticket: string;
  resources: InvitationResources;
  write: InvitationWriter;
}): Promise<InvitationRunOutcome> {
  const { status, ticket, resources, write } = input;
  if (status === "complete") return { kind: "complete" };

  const selected = status === "sign_up" ? resources.signUp : resources.signIn;
  // An unavailable provider API is not a settled outcome: nothing runs and nothing is journaled.
  if (!selected) return { kind: "not-ready" };

  const signIn = resources.signIn;
  const activate = resources.setActive;
  if (status === "sign_in") {
    // Resume the retained attempt rather than consuming the ticket again. This is the same
    // guard after a remount, a return navigation or a fresh page load.
    const retained = retainedSignInStatus(signIn);
    if (retained)
      return retained === "complete"
        ? // The provider already finished this sign-in but no session was bound here; the
          // ticket must not be consumed a second time to reach the same state.
          { kind: "failed" }
        : { kind: "verification-hold", status: retained };
    if (!signIn || !activate) return { kind: "not-ready" };
  }

  const providerCall = (action: "sign_up" | "sign_in"): Promise<ProviderOutcome> =>
    write
      .run("Accept this invitation", async (guard) => {
        if (action === "sign_up") {
          await guard.wait(() =>
            resources.signUp!.create({ strategy: "ticket", ticket }),
          );
          return { kind: "ok" } as ProviderOutcome;
        }
        const attempt = await guard.wait(() =>
          clerkInputAttempt(() =>
            signIn!.create({ strategy: "ticket", ticket }),
          ),
        );
        // A non-complete status is an unfinished provider attempt, and `complete` without a
        // session is not bindable: both are thrown before the journal can confirm anything.
        if (attempt.status !== "complete")
          throw new InvitationVerificationHold(attempt.status || "needs_verification");
        const session = attempt.createdSessionId;
        if (!session) throw new InvitationUnboundCompletion();
        await guard.wait(() => activate!({ session }));
        return {
          kind: "ok",
          status: "complete",
          createdSessionId: session,
        } as ProviderOutcome;
      })
      .catch((error): ProviderOutcome => {
        if (error instanceof ConfirmedInputRefusal)
          return { kind: "refused", message: error.message };
        if (error instanceof InvitationVerificationHold)
          return { kind: "hold", status: error.providerStatus };
        // Transport error, 5xx, unbound completion or any other failure: the journal holds
        // the unknown outcome and this attempt issues no second authentication effect.
        return { kind: "unknown" };
      });

  const outcome = await acceptInvitationTicket({ status, run: providerCall });
  if (outcome.kind === "verification-hold")
    return { kind: "verification-hold", status: outcome.status };
  if (outcome.kind === "signed-in")
    return { kind: "signed-in", sessionId: outcome.sessionId };
  return outcome;
}
