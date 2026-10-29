import assert from "node:assert/strict";
import test from "node:test";
import {
  acceptInvitePhase,
  ticketFallbackAllowed,
  ticketRejectedByProvider,
  ticketReturnPath,
} from "../src/features/onboard/lib/accept-invite-flow.ts";

const loaded = { authLoaded: true, signUpLoaded: true };
const clerkError = (code) => ({ errors: [{ code, message: "synthetic" }] });

test("a new invited account gets the ticket signup flow", () => {
  const base = { ...loaded, isSignedIn: false, ticket: "ticket_synthetic" };
  assert.equal(acceptInvitePhase({ ...base, localPhase: "loading" }), "ready");
  // After the signup create succeeds the receiver shows the credential step, not a reset.
  assert.equal(acceptInvitePhase({ ...base, localPhase: "create" }), "create");
});

test("an invited person who already has an account falls back to the ticket sign-in", () => {
  // The provider rejects ticket signup for an existing identifier; Clerk accepts the same
  // ticket through sign-in, so the fallback is allowed once, for non-terminal codes.
  const existing = clerkError("form_identifier_exists");
  assert.equal(ticketFallbackAllowed(existing, true), true);
  assert.equal(ticketRejectedByProvider(existing), false);
  // No sign-in instance means no second path; the visitor sees the failure instead.
  assert.equal(ticketFallbackAllowed(existing, false), false);
});

test("an existing signed-in visitor is not allowed to absorb the invitation", () => {
  assert.equal(
    acceptInvitePhase({ ...loaded, isSignedIn: true, ticket: "ticket_synthetic", localPhase: "loading" }),
    "signed-in-conflict",
  );
  // Sign-out returns to the same route with the ticket still in the query.
  assert.equal(
    ticketReturnPath("ticket_synthetic"),
    "/accept-invite?__clerk_ticket=ticket_synthetic",
  );
  // The ticket is re-encoded, never re-interpreted, and the ordinary route stays plain.
  assert.equal(ticketReturnPath("a b&c"), "/accept-invite?__clerk_ticket=a%20b%26c");
  assert.equal(ticketReturnPath(null), "/accept-invite");
});

test("malformed, expired and reused tickets are terminal and are never retried", () => {
  for (const code of ["ticket_invalid", "ticket_expired", "ticket_already_used", "verification_failed"]) {
    assert.equal(ticketRejectedByProvider(clerkError(code)), true, code);
    assert.equal(ticketFallbackAllowed(clerkError(code), true), false, code);
  }
  // A transient failure is not a ticket verdict: the message is shown and the ticket kept.
  assert.equal(ticketRejectedByProvider(new Error("network")), false);
  assert.equal(ticketRejectedByProvider(undefined), false);
  assert.equal(ticketRejectedByProvider({ errors: [{}] }), false);
});

test("ordinary navigation without a ticket shows the no-invitation state", () => {
  assert.equal(
    acceptInvitePhase({ ...loaded, isSignedIn: false, ticket: null, localPhase: "loading" }),
    "expired",
  );
  // Nothing renders the ticket flow until Clerk and the sign-up instance are ready.
  assert.equal(
    acceptInvitePhase({ authLoaded: false, signUpLoaded: false, isSignedIn: false, ticket: "t", localPhase: "loading" }),
    "loading",
  );
});
