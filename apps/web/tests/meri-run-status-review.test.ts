import { createElement, Fragment, type ComponentProps } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, it, vi } from "vitest";
import { RunStatus } from "../src/features/meri/conversation/RunStatus";
import {
  turnFromEvents,
  type TurnView,
} from "../src/features/meri/conversation/conversation-view";
import { RunLifecycleControls } from "../src/features/meri/conversation/lifecycle/RunLifecycleControls";
import { lifecycleAvailability } from "../src/shared/meri-conversation-lifecycle/availability";

function renderStop(
  state: string,
  cancel: string,
  receipt?: string,
  busy = false,
  historyState?: TurnView["runState"],
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
    createElement(RunStatus, {
      run,
      active: state === "running",
      savedCurrent: historyState
        ? turnFromEvents(
            [],
            { runId: "synthetic-current-run" },
            null,
            historyState,
            false,
          )
        : undefined,
    }),
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
  expect(pending).toContain("Stopping: requesting a cancellation fence.");
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

it("only saved history establishes Stopped; a receipt or stream terminal state alone does not", () => {
  for (const receipt of [undefined, "cancelled"]) {
    const html = renderStop("running", "observed", receipt, false, "cancelled");
    expect(html).toContain("<h3>Stopped</h3>");
    expect(html).toContain('data-tone="success">Complete</span>');
    expect(html).toContain("Stopped. Completed steps remain recorded.");
    expect(html).not.toContain("Meri must confirm cleanup");
    expect(html).not.toContain("finishing the current safe step");
    expect(html).not.toContain("Stop fence recorded");
    expect(html).not.toContain("<h3>Cancelling</h3>");
    expect(html).not.toContain("Open receipts");
    expect(html.match(/aria-label="Stop status"/g)).toHaveLength(1);
    expect(html.match(/<button/g)).toHaveLength(1);
  }
  for (const [state, receipt] of [
    ["running", "cancelled"],
    ["cancelled", "cancelled"],
    ["cancelled", undefined],
  ] as const) {
    const html = renderStop(state, "observed", receipt);
    expect(html).not.toContain("<h3>Stopped</h3>");
    expect(html).not.toContain("Stopped. Completed steps remain recorded.");
    if (receipt) expect(html).toContain("<h3>Cancelling</h3>");
  }
});

it("a saved completed or failed run cannot be presented as cancellation in progress", () => {
  for (const historyState of ["completed", "failed"] as const) {
    const html = renderStop(
      "running",
      "observed",
      "cancelled",
      false,
      historyState,
    );
    expect(html).not.toContain("<h3>Cancelling</h3>");
    expect(html).not.toContain("finishing the current safe step");
    expect(html).not.toContain("<h3>Stopped</h3>");
    const prior = renderStop(
      "running",
      "observed",
      historyState,
      false,
      historyState,
    );
    expect(prior).toContain(
      `The run had already ${historyState} when the stop request arrived.`,
    );
  }
});

it("held lifecycle presentation has one reason per instance without dead actions or duplicate ids", () => {
  const html = renderToStaticMarkup(
    createElement(
      Fragment,
      null,
      createElement(RunLifecycleControls),
      createElement(RunLifecycleControls),
    ),
  );
  expect(lifecycleAvailability.enabled).toBe(false);
  expect(html.split(lifecycleAvailability.reason)).toHaveLength(3);
  expect(html.match(/<summary>Pause and recovery<\/summary>/g)).toHaveLength(2);
  expect(html).not.toContain("<button");
  expect(html).not.toMatch(/\sid=/);
  expect(html).not.toContain("Resume from checkpoint");
});
