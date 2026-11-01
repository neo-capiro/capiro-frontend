import { createElement, type ComponentProps } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, it, vi } from "vitest";
import { RunStatus } from "../src/features/meri/conversation/RunStatus";
import { RunLifecycleControls } from "../src/features/meri/conversation/lifecycle/RunLifecycleControls";

function renderStop(
  state: string,
  cancel: string,
  receipt?: string,
  busy = false,
) {
  const run = {
    snapshot: {
      observation: { runState: state },
      cancelReceipt: receipt ? { state: receipt } : null,
    },
    intent: { cancel },
    busy,
    transcript: "loaded",
    observing: "live",
    history: vi.fn(),
    cancel: vi.fn(),
  } as unknown as ComponentProps<typeof RunStatus>["run"];
  return renderToStaticMarkup(
    createElement(RunStatus, { run, active: state === "running" }),
  );
}

it.each(["completed", "failed"])(
  "a %s stop receipt reports the prior outcome without claiming cancellation",
  (state) => {
    const html = renderStop("running", "observed", state);
    expect(html).toContain(`<h3>Run already ${state}</h3>`);
    expect(html).toContain(
      `The run had already ${state} when the stop request arrived.`,
    );
    expect(html).not.toContain("Stop fence recorded");
    expect(html).not.toContain("finishing the current safe step");
    expect(html).not.toContain("Cancellation is recorded");
    expect(html).not.toContain("completion of cleanup");
    expect(html).toContain(
      state === "completed"
        ? 'data-tone="success">Complete</span>'
        : 'data-tone="danger">Attention</span>',
    );
    expect(html).toMatch(/<button[^>]*>Reload transcript<\/button>/);
    expect(html.match(/aria-label="Stop status"/g)).toHaveLength(1);
  },
);

it("cancelling distinguishes an outstanding request from a fence and an uncertain delivery", () => {
  const pending = renderStop("running", "pending", undefined, true);
  expect(pending).toContain("<h3>Requesting stop</h3>");
  expect(pending).not.toContain("<h3>Cancelling</h3>");
  expect(pending).toContain('data-tone="warning">Attention</span>');
  expect(pending).toContain("Requesting stop…");
  expect(pending).not.toContain("Stop fence recorded");
  expect(pending).not.toContain("finishing the current safe step");
  expect(pending).toMatch(
    /<button[^>]*disabled=""[^>]*>Reload transcript<\/button>/,
  );
  const fenced = renderStop("running", "observed", "cancelled");
  expect(fenced).toContain("<h3>Cancelling</h3>");
  expect(fenced).toContain(
    "Meri is finishing the current safe step before stopping.",
  );
  expect(fenced).not.toContain("Stop fence recorded");
  expect(fenced).not.toContain("completion of cleanup");
  expect(fenced).not.toContain("<h3>Stopped</h3>");
  const unknown = renderStop("running", "unknown");
  expect(unknown).toContain("<h3>Stop request uncertain</h3>");
  expect(unknown).toContain("The stop request may not have reached Meri.");
  expect(unknown).toMatch(/<button[^>]*>Retry Stop<\/button>/);
  expect(unknown).not.toContain(">Reload transcript</button>");
  expect(unknown).not.toContain("finishing the current safe step");
});

it("a settled run retires its stop feedback; the turn's own state is the outcome", () => {
  for (const receipt of [undefined, "cancelled"]) {
    const html = renderStop("cancelled", "observed", receipt);
    expect(html).not.toContain('aria-label="Stop status"');
    expect(html).not.toContain("<h3>Stopped</h3>");
    expect(html).not.toContain("<h3>Cancelling</h3>");
    expect(html).not.toContain("Complete</span>");
    expect(html).not.toContain("<button");
  }
  const live = renderStop("running", "observed", "cancelled");
  expect(live).toContain("<h3>Cancelling</h3>");
  expect(live.match(/aria-label="Stop status"/g)).toHaveLength(1);
});

it("a Stop that arrived after the run finished keeps saying so, and is never presented as cancellation", () => {
  for (const state of ["completed", "failed"] as const) {
    const cancelled = renderStop(state, "observed", "cancelled");
    expect(cancelled).not.toContain("<h3>Cancelling</h3>");
    expect(cancelled).not.toContain("finishing the current safe step");
    expect(cancelled).not.toContain('aria-label="Stop status"');
    // The receipt survives the run settling: the person asked for something that did not happen.
    for (const live of ["running", state]) {
      const prior = renderStop(live, "observed", state);
      expect(prior).toContain(
        `The run had already ${state} when the stop request arrived.`,
      );
      expect(prior).not.toContain("<h3>Cancelling</h3>");
    }
  }
});

it("lifecycle controls offer exact recovery without a second pause or steer", () => {
  const html = renderToStaticMarkup(
    createElement(RunLifecycleControls, {
      lifecycle: {
        command: { controlId: "retained", intent: "pause" },
        available: true,
        busy: false,
        retry: vi.fn(),
      } as unknown as ComponentProps<typeof RunLifecycleControls>["lifecycle"],
      turn: null,
      disabled: false,
    }),
  );
  expect(html).toContain("Retry same control");
  expect(html).not.toContain("Send guidance");
  expect(html).not.toContain(">Pause</button>");
  expect(html).not.toMatch(/\sid=/);
});
