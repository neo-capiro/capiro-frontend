import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, it, vi } from "vitest";
import { LibraryActions } from "../src/features/meri/files/DocumentLibrary";
import { createReconnectSchedule } from "../src/shared/meri-conversations/reconnect-schedule";
import {
  LIBRARY_RECONNECT_ATTEMPTS,
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

it("disables the shown files' actions unless a current port is mounted", () => {
  const render = (phase: Parameters<typeof LibraryActions>[0]["phase"]) =>
    renderToStaticMarkup(
      createElement(
        LibraryActions,
        { phase },
        createElement("button", { type: "button" }, "Load more files"),
      ),
    );
  // Renewing or asked again, the displayed session is closed: Load more, Reload, Inspect and Download wait.
  for (const phase of ["renewing", "retrying", "connecting", "lost"] as const)
    expect(render(phase)).toMatch(/<fieldset[^>]* disabled=""/);
  expect(render("ready")).not.toContain("disabled");
});

it("stops polling a steady unanswered issuance after a bounded number of attempts", () => {
  vi.useFakeTimers();
  try {
    const run = vi.fn();
    const schedule = createReconnectSchedule(
      undefined,
      undefined,
      LIBRARY_RECONNECT_ATTEMPTS,
    );
    let elapsed = 0;
    for (let attempt = 0; attempt < LIBRARY_RECONNECT_ATTEMPTS; attempt++) {
      schedule.observe("failing", run);
      expect(schedule.pending()).toBe(true);
      while (schedule.pending()) {
        vi.advanceTimersByTime(1_000);
        elapsed += 1_000;
      }
      schedule.observe("busy", run);
    }
    expect(run).toHaveBeenCalledTimes(LIBRARY_RECONNECT_ATTEMPTS);
    // About five minutes of quiet re-asks, then the person is asked instead.
    expect(elapsed).toBeGreaterThanOrEqual(4 * 60_000);
    expect(elapsed).toBeLessThanOrEqual(5 * 60_000);
    schedule.observe("failing", run);
    expect(schedule.stopped()).toBe(true);
    expect(schedule.pending()).toBe(false);
    vi.advanceTimersByTime(60 * 60_000);
    expect(run).toHaveBeenCalledTimes(LIBRARY_RECONNECT_ATTEMPTS);
    // "Check access again" starts the ladder over.
    schedule.reset();
    expect(schedule.stopped()).toBe(false);
    schedule.observe("failing", run);
    expect(schedule.pending()).toBe(true);
    // A success also ends the stop.
    vi.advanceTimersByTime(2_000);
    schedule.observe("ok", run);
    expect(schedule.stopped()).toBe(false);
    expect(schedule.attempts()).toBe(0);
  } finally {
    vi.useRealTimers();
  }
});
