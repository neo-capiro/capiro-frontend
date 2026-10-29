import assert from "node:assert/strict";
import test from "node:test";
import {
  acceptInvitationTicket,
  acceptInvitePhase,
  invitationReturnPath,
  readInvitationStatus,
} from "../src/features/onboard/lib/accept-invite-flow.ts";

const loaded = { authLoaded: true, signUpLoaded: true, signInLoaded: true };
const ticket = "ticket_synthetic";
const status = "sign_up";

/** Records the provider effects the receiver would issue for one invitation. */
function recorder(outcome) {
  const calls = [];
  return {
    calls,
    run: async (action) => {
      calls.push(action);
      return typeof outcome === "function" ? outcome(action) : outcome;
    },
  };
}

test("the provider status selects exactly one installed ticket API", async () => {
  const signUpPath = recorder({ kind: "ok" });
  assert.deepEqual(
    await acceptInvitationTicket({ status: "sign_up", run: signUpPath.run }),
    { kind: "signup-started" },
  );
  assert.deepEqual(signUpPath.calls, ["sign_up"]);

  const signInPath = recorder({ kind: "ok", status: "complete", createdSessionId: "sess_1" });
  assert.deepEqual(
    await acceptInvitationTicket({ status: "sign_in", run: signInPath.run }),
    { kind: "signed-in", sessionId: "sess_1" },
  );
  assert.deepEqual(signInPath.calls, ["sign_in"]);
});

test("a transport error, 5xx or arbitrary rejection issues no second authentication effect", async () => {
  // Every unknown outcome (network, 5xx, arbitrary provider error) reaches the caller as the
  // journal's unknown result, so the ticket is never resubmitted through another API.
  for (const outcome of [
    { kind: "unknown" },
    () => ({ kind: "unknown" }),
  ]) {
    const attempt = recorder(outcome);
    assert.deepEqual(
      await acceptInvitationTicket({ status: "sign_up", run: attempt.run }),
      { kind: "failed" },
    );
    assert.deepEqual(attempt.calls, ["sign_up"], "no fallback effect");
    const second = recorder(outcome);
    assert.deepEqual(
      await acceptInvitationTicket({ status: "sign_in", run: second.run }),
      { kind: "failed" },
    );
    assert.deepEqual(second.calls, ["sign_in"], "no fallback effect");
  }
});

test("every incomplete verification status is held, not treated as an invalid ticket", async () => {
  for (const providerStatus of [
    "needs_second_factor",
    "needs_client_trust",
    "needs_new_password",
    "needs_protect_check",
    "needs_first_factor",
  ]) {
    const attempt = recorder({ kind: "ok", status: providerStatus, createdSessionId: null });
    assert.deepEqual(
      await acceptInvitationTicket({ status: "sign_in", run: attempt.run }),
      { kind: "verification-hold", status: providerStatus },
      providerStatus,
    );
    assert.deepEqual(attempt.calls, ["sign_in"], providerStatus);
  }
});

test("a completed invitation or current session never re-consumes the ticket", async () => {
  const complete = recorder({ kind: "ok" });
  assert.deepEqual(
    await acceptInvitationTicket({ status: "complete", run: complete.run }),
    { kind: "complete" },
  );
  assert.deepEqual(complete.calls, [], "status=complete performs no provider call");

  // An already-signed-in visitor with a completed invitation is routed onward, not forced
  // into the conflict state or made to consume the ticket again.
  assert.equal(
    acceptInvitePhase({ ...loaded, isSignedIn: true, ticket, status: "complete", localPhase: "loading" }),
    "complete",
  );
  // A confirmed refusal is reported without a retry, and the ticket is not re-sent.
  const refused = recorder({ kind: "refused", message: "identifier already exists" });
  assert.deepEqual(
    await acceptInvitationTicket({ status: "sign_up", run: refused.run }),
    { kind: "refused", message: "identifier already exists" },
  );
  assert.deepEqual(refused.calls, ["sign_up"]);
});

test("sign-out carries the ticket and the provider status to the fixed same-origin route", () => {
  assert.equal(readInvitationStatus("sign_in"), "sign_in");
  assert.equal(readInvitationStatus("sign_up"), "sign_up");
  assert.equal(readInvitationStatus("complete"), "complete");
  // An unrecognised or absent selector never guesses an effect.
  for (const bad of ["", "signed_in", "sign_in ", null, undefined])
    assert.equal(readInvitationStatus(bad), null, String(bad));

  assert.equal(
    invitationReturnPath(ticket, "sign_in"),
    "/accept-invite?__clerk_ticket=ticket_synthetic&__clerk_status=sign_in",
  );
  assert.equal(
    invitationReturnPath(ticket, "complete"),
    "/accept-invite?__clerk_ticket=ticket_synthetic&__clerk_status=complete",
  );
  // Relative, no origin, no arbitrary external return URL, and re-encoded rather than parsed.
  assert.equal(invitationReturnPath(ticket, null), "/accept-invite?__clerk_ticket=ticket_synthetic");
  assert.equal(invitationReturnPath(null, null), "/accept-invite");
  assert.equal(
    invitationReturnPath("a b&c=http://evil.example", "sign_up"),
    "/accept-invite?__clerk_ticket=a+b%26c%3Dhttp%3A%2F%2Fevil.example&__clerk_status=sign_up",
  );
  assert.match(invitationReturnPath("/../x", "sign_up"), /^\/accept-invite\?/);
});

test("the receiver phase respects the selected status and the existing session", () => {
  const base = { ...loaded, isSignedIn: false, ticket, status, localPhase: "loading" };
  assert.equal(acceptInvitePhase(base), "ready");
  assert.equal(acceptInvitePhase({ ...base, localPhase: "create" }), "create");
  // No ticket → the ordinary expired state; no selector → fail safe with no effect.
  assert.equal(acceptInvitePhase({ ...base, ticket: null }), "expired");
  assert.equal(acceptInvitePhase({ ...base, status: null }), "invalid-ticket");
  // An existing session is a deliberate conflict, not an uncertainty recovery.
  assert.equal(acceptInvitePhase({ ...base, isSignedIn: true }), "signed-in-conflict");
  // Each status waits only for the API it will actually call.
  assert.equal(acceptInvitePhase({ ...base, signUpLoaded: false }), "loading");
  assert.equal(
    acceptInvitePhase({ ...base, status: "sign_in", signInLoaded: false }),
    "loading",
  );
  assert.equal(
    acceptInvitePhase({ ...base, status: "sign_in", signInLoaded: true }),
    "ready",
  );
});
