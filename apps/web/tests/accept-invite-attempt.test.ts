import { QueryClient } from "@tanstack/react-query";
// The installed Clerk error class itself, so the refusal path is the real type guard.
import { ClerkAPIResponseError } from "@qualification/clerk-errors";
import { describe, expect, it, vi } from "vitest";
import { createOnboardAttempt } from "../src/features/onboard/lib/attempt-journal";
import {
  retainedSignInHold,
  runAcceptInvitation,
} from "../src/features/onboard/lib/accept-invite-run";

/**
 * Page-level orchestration for the invitation receiver, exercised through the REAL attempt
 * journal (createOnboardAttempt over a real QueryClient) and the REAL run owner the page calls.
 * The provider resources are fakes, so no Clerk call, invitation or browser session occurs.
 */
const ticket = "ticket_synthetic";
const journalName = `accept-invitation:${ticket}`;
const owner = () => true;

function openJournal(cache: QueryClient) {
  const attempt = createOnboardAttempt(cache, journalName, owner);
  attempt.mount();
  return attempt;
}

type SignInResult = { status: string; createdSessionId: string | null };

function fakeSignUp() {
  const calls: string[] = [];
  return {
    calls,
    resource: {
      async create(args: { strategy: "ticket"; ticket: string }) {
        calls.push(args.ticket);
        return { status: "missing_requirements" };
      },
    },
  };
}

function fakeSignIn(next: () => Promise<SignInResult>) {
  const calls: string[] = [];
  const resource = {
    status: null as string | null,
    createdSessionId: null as string | null,
    async create(args: { strategy: "ticket"; ticket: string }) {
      calls.push(args.ticket);
      const result = await next();
      // The provider keeps its own resource state, exactly as the SDK does.
      resource.status = result.status;
      resource.createdSessionId = result.createdSessionId;
      return result;
    },
  };
  return { calls, resource };
}

describe("invitation acceptance through the attempt journal", () => {
  it("holds an incomplete sign-in, and a remount resumes instead of re-consuming the ticket", async () => {
    const cache = new QueryClient();
    const attempt = openJournal(cache);
    const signIn = fakeSignIn(async () => ({
      status: "needs_second_factor",
      createdSessionId: null,
    }));
    const activate = vi.fn(async () => ({}));

    const first = await runAcceptInvitation({
      status: "sign_in",
      ticket,
      write: attempt,
      resources: { signIn: signIn.resource, setActive: activate },
    });

    expect(first).toEqual({ kind: "verification-hold", status: "needs_second_factor" });
    expect(signIn.calls).toHaveLength(1);
    expect(activate).not.toHaveBeenCalled();
    // Not authoritative completion, so the attempt is UNKNOWN rather than confirmed.
    expect(attempt.read()?.phase).toBe("unknown");
    expect(retainedSignInHold(signIn.resource)).toBe("needs_second_factor");

    // Returning to /sign-in and back remounts the page over the same journal cache.
    const remounted = openJournal(cache);
    expect(remounted.read()?.phase).toBe("unknown");
    const second = await runAcceptInvitation({
      status: "sign_in",
      ticket,
      write: remounted,
      resources: { signIn: signIn.resource, setActive: activate },
    });
    expect(second).toEqual({ kind: "verification-hold", status: "needs_second_factor" });

    // Even after a full reload the provider resource still owns the attempt, so the ticket is
    // not consumed again; a fresh journal changes nothing about the provider call count.
    const reloaded = openJournal(new QueryClient());
    const third = await runAcceptInvitation({
      status: "sign_in",
      ticket,
      write: reloaded,
      resources: { signIn: signIn.resource, setActive: activate },
    });
    expect(third).toEqual({ kind: "verification-hold", status: "needs_second_factor" });
    expect(signIn.calls).toHaveLength(1);
  });

  it("does not journal-confirm a complete sign-in that carries no session identity", async () => {
    const cache = new QueryClient();
    const attempt = openJournal(cache);
    const signIn = fakeSignIn(async () => ({ status: "complete", createdSessionId: null }));
    const activate = vi.fn(async () => ({}));

    const outcome = await runAcceptInvitation({
      status: "sign_in",
      ticket,
      write: attempt,
      resources: { signIn: signIn.resource, setActive: activate },
    });

    expect(outcome).toEqual({ kind: "failed" });
    expect(activate).not.toHaveBeenCalled();
    expect(attempt.read()?.phase).toBe("unknown");

    // No replay: the retained complete resource short-circuits, and the journal would refuse
    // the submission anyway.
    const replay = await runAcceptInvitation({
      status: "sign_in",
      ticket,
      write: attempt,
      resources: { signIn: signIn.resource, setActive: activate },
    });
    expect(replay).toEqual({ kind: "failed" });
    expect(signIn.calls).toHaveLength(1);
  });

  it("keeps a transport failure unknown and lets the journal refuse the retry", async () => {
    const cache = new QueryClient();
    const attempt = openJournal(cache);
    const signIn = fakeSignIn(async () => {
      throw new Error("synthetic transport failure");
    });
    const activate = vi.fn(async () => ({}));

    const outcome = await runAcceptInvitation({
      status: "sign_in",
      ticket,
      write: attempt,
      resources: { signIn: signIn.resource, setActive: activate },
    });
    expect(outcome).toEqual({ kind: "failed" });
    expect(attempt.read()?.phase).toBe("unknown");

    const retry = await runAcceptInvitation({
      status: "sign_in",
      ticket,
      write: attempt,
      resources: { signIn: signIn.resource, setActive: activate },
    });
    expect(retry).toEqual({ kind: "failed" });
    expect(signIn.calls).toHaveLength(1);
  });

  it("starts the sign-up flow and journals the ticket acceptance", async () => {
    const attempt = openJournal(new QueryClient());
    const signUp = fakeSignUp();

    const outcome = await runAcceptInvitation({
      status: "sign_up",
      ticket,
      write: attempt,
      resources: { signUp: signUp.resource },
    });

    expect(outcome).toEqual({ kind: "signup-started" });
    expect(signUp.calls).toEqual([ticket]);
    expect(attempt.read()?.phase).toBe("confirmed");
  });

  it("binds the session of a completed sign-in and confirms the attempt", async () => {
    const attempt = openJournal(new QueryClient());
    const signIn = fakeSignIn(async () => ({
      status: "complete",
      createdSessionId: "sess_1",
    }));
    const activate = vi.fn(async () => ({}));

    const outcome = await runAcceptInvitation({
      status: "sign_in",
      ticket,
      write: attempt,
      resources: { signIn: signIn.resource, setActive: activate },
    });

    expect(outcome).toEqual({ kind: "signed-in", sessionId: "sess_1" });
    expect(signIn.calls).toEqual([ticket]);
    expect(activate).toHaveBeenCalledWith({ session: "sess_1" });
    expect(attempt.read()?.phase).toBe("confirmed");
  });

  it("reports a provider input refusal once and never retries it automatically", async () => {
    const attempt = openJournal(new QueryClient());
    const refusal = new ClerkAPIResponseError("Unprocessable Entity", {
      data: [
        {
          code: "form_identifier_exists",
          message: "exists",
          long_message: "That email address already exists.",
        },
      ],
      status: 422,
    });
    let calls = 0;
    const signIn = {
      status: null as string | null,
      createdSessionId: null as string | null,
      async create() {
        calls += 1;
        throw refusal;
      },
    };

    const outcome = await runAcceptInvitation({
      status: "sign_in",
      ticket,
      write: attempt,
      resources: { signIn, setActive: vi.fn(async () => ({})) },
    });

    expect(outcome).toEqual({
      kind: "refused",
      message: "That email address already exists.",
    });
    expect(calls).toBe(1);
    expect(attempt.read()?.phase).toBe("rejected");
  });

  it("does nothing while the selected provider API is unavailable", async () => {
    const cache = new QueryClient();
    const attempt = openJournal(cache);

    for (const resources of [{}, { signIn: null, setActive: null }, { signUp: null }]) {
      const outcome = await runAcceptInvitation({
        status: "sign_in",
        ticket,
        write: attempt,
        resources,
      });
      expect(outcome).toEqual({ kind: "not-ready" });
    }
    // An unloaded provider state never settles the attempt as confirmed.
    expect(attempt.read()).toBeUndefined();
    expect(attempt.blocked()).toBe(false);
  });
});
