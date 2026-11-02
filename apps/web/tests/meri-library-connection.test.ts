import { expect, it } from "vitest";
import {
  libraryConnectionPhase,
  retryDelayMs,
  RETRY_DELAYS_MS,
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
  expect(libraryConnectionPhase("connecting", undefined, undefined, false)).toBe(
    "connecting",
  );
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

it("backs off a bounded number of times, then leaves the retry to the person", () => {
  expect(RETRY_DELAYS_MS.map((_, index) => retryDelayMs(index))).toEqual([
    2_000, 5_000, 10_000, 30_000,
  ]);
  expect(retryDelayMs(RETRY_DELAYS_MS.length)).toBeNull();
  expect(retryDelayMs(99)).toBeNull();
});
