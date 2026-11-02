import { expect, it } from "vitest";
import {
  immediateRenewal,
  libraryConnectionPhase,
  libraryReconnectState,
} from "../src/features/meri/files/library-connection";

it("keeps the loaded files through the session's own renewal and its hard cap", () => {
  expect(libraryConnectionPhase("expired", "renewal", undefined, true)).toBe(
    "renewing",
  );
  expect(libraryConnectionPhase("expired", "expiry", undefined, true)).toBe(
    "renewing",
  );
  // The reissue in flight after a renewal is still a renewal, not a first connection.
  expect(libraryConnectionPhase("connecting", "renewal", undefined, true)).toBe(
    "renewing",
  );
  expect(libraryConnectionPhase("idle", undefined, undefined, true)).toBe(
    "renewing",
  );
  expect(libraryConnectionPhase("ready", undefined, undefined, true)).toBe(
    "ready",
  );
});

it("keeps the loaded files through an issuance the control did not answer and asks again quietly", () => {
  for (const status of [408, 429, 500, 502, 503, 504])
    expect(libraryConnectionPhase("unavailable", undefined, status, true)).toBe(
      "retrying",
    );
  // Nothing loaded yet: an unanswered first issuance keeps the connecting notice while it is retried.
  expect(libraryConnectionPhase("unavailable", undefined, 503, false)).toBe(
    "connecting",
  );
  expect(
    libraryConnectionPhase("connecting", undefined, undefined, false),
  ).toBe("connecting");
  expect(libraryConnectionPhase("idle", undefined, undefined, false)).toBe(
    "connecting",
  );
});

it("clears the loaded files only on a refusal, a lost membership or a changed origin", () => {
  expect(libraryConnectionPhase("unavailable", "access-lost", 401, true)).toBe(
    "lost",
  );
  expect(libraryConnectionPhase("unavailable", "access-lost", 403, true)).toBe(
    "lost",
  );
  expect(libraryConnectionPhase("unavailable", undefined, 403, true)).toBe(
    "lost",
  );
  // A port-level denial ends the session as access-lost without an issuance status.
  expect(
    libraryConnectionPhase("expired", "access-lost", undefined, true),
  ).toBe("lost");
  // A receipt, context or account mismatch is not retried either.
  expect(
    libraryConnectionPhase("unavailable", undefined, undefined, true),
  ).toBe("lost");
});

it("reconnects at once only for the planned renewal; the hard cap and unanswered issuance go through the shared ladder", () => {
  expect(immediateRenewal("renewing", "expired", "renewal")).toBe(true);
  expect(immediateRenewal("renewing", "expired", "expiry")).toBe(false);
  expect(immediateRenewal("renewing", "connecting", "renewal")).toBe(false);
  expect(libraryReconnectState("renewing", "expired", "renewal")).toBe("ok");
  expect(libraryReconnectState("renewing", "expired", "expiry")).toBe(
    "failing",
  );
  expect(libraryReconnectState("retrying", "unavailable", undefined)).toBe(
    "failing",
  );
  expect(libraryReconnectState("connecting", "unavailable", undefined)).toBe(
    "failing",
  );
  // An attempt in flight neither schedules another nor resets the ladder; a ready port ends the episode.
  expect(libraryReconnectState("renewing", "connecting", "expiry")).toBe(
    "busy",
  );
  expect(libraryReconnectState("connecting", "connecting", undefined)).toBe(
    "busy",
  );
  expect(libraryReconnectState("ready", "ready", undefined)).toBe("ok");
  expect(libraryReconnectState("lost", "unavailable", "access-lost")).toBe(
    "ok",
  );
});
