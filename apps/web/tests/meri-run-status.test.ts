import {
  Children,
  createElement,
  isValidElement,
  type ComponentProps,
  type ReactElement,
  type ReactNode,
} from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, it, vi } from "vitest";
import { observeUntilSettled } from "../src/features/meri/conversation/observation-loop";
import { RunStatus } from "../src/features/meri/conversation/RunStatus";

it.each(["queued", "running"] as const)(
  "does not claim execution continues after observing %s stalls",
  async (runState) => {
    const observation = { runState, after: 3 };
    const attempt = vi.fn(async () => {
      throw new Error("Synthetic subscription unavailable");
    });
    const observing = await observeUntilSettled({
      attempt,
      settled: () => false,
      progress: () => observation.after,
      signal: new AbortController().signal,
      wait: async () => {},
    });
    expect(observing).toBe("stalled");
    expect(attempt).toHaveBeenCalledTimes(4);
    expect(observation).toEqual({ runState, after: 3 });

    const run = {
      snapshot: { observation },
      intent: {},
      busy: false,
      error: null,
      transcript: "loaded",
      observing,
      refreshRunStatus: vi.fn(),
    } as unknown as ComponentProps<typeof RunStatus>["run"];
    const markup = renderToStaticMarkup(
      createElement(RunStatus, { run, active: true }),
    );
    expect(markup).toContain(
      "The current run status is unknown. Refresh to check its current status.",
    );
    expect(markup).not.toContain("The run continues on the service.");
    expect(markup).not.toContain("the run keeps going");
    expect(markup).toContain(
      "Leaving this page stops watching and does not cancel the run. Use Stop to request cancellation.",
    );
    expect(markup).toMatch(/<button[^>]*>Refresh run status<\/button>/);
  },
);

function refreshButtons(
  node: ReactNode,
): ReactElement<{ onClick: () => void; disabled: boolean }>[] {
  return Children.toArray(node).flatMap((child) => {
    if (
      !isValidElement<{
        children?: ReactNode;
        onClick: () => void;
        disabled: boolean;
      }>(child)
    )
      return [];
    return child.props.children === "Refresh run status"
      ? [child]
      : refreshButtons(child.props.children);
  });
}
it.each(["paused", "waiting-for-approval", "unknown"])(
  "exposes a read-only status action for %s while retaining command recovery separately",
  (state) => {
    const refresh = vi.fn(),
      submit = vi.fn(),
      cancel = vi.fn();
    const run = {
      snapshot: {
        status: "ready",
        observation: { runState: state === "unknown" ? "queued" : state },
      },
      intent:
        state === "unknown"
          ? { submit: { state: "unknown", prompt: "synthetic original" } }
          : {},
      transcript: "loaded",
      observing: "settled",
      busy: false,
      refreshRunStatus: refresh,
      submit,
      cancel,
    } as unknown as ComponentProps<typeof RunStatus>["run"];
    const buttons = refreshButtons(RunStatus({ run, active: true }));
    expect(buttons).toHaveLength(1);
    expect(buttons[0]!.props.disabled).toBe(false);
    buttons[0]!.props.onClick();
    expect(refresh).toHaveBeenCalledTimes(1);
    expect(submit).not.toHaveBeenCalled();
    expect(cancel).not.toHaveBeenCalled();
    const held = refreshButtons(
      RunStatus({ run: { ...run, busy: true }, active: true }),
    );
    expect(held[0]!.props.disabled).toBe(true);
  },
);

it("does not offer status refresh for a terminal or disposed run", () => {
  for (const status of ["ready", "disposed"] as const) {
    const run = {
      snapshot: { status, observation: { runState: "completed" } },
      intent: {},
      transcript: "loaded",
      observing: "settled",
      busy: false,
    } as unknown as ComponentProps<typeof RunStatus>["run"];
    expect(refreshButtons(RunStatus({ run, active: false }))).toHaveLength(0);
  }
});
