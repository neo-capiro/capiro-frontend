import { createElement, type ComponentProps } from "react";
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
      reconnect: vi.fn(),
    } as unknown as ComponentProps<typeof RunStatus>["run"];
    const markup = renderToStaticMarkup(
      createElement(RunStatus, { run, active: true }),
    );
    expect(markup).toContain(
      "The current run status is unknown. Reconnect to check for updates.",
    );
    expect(markup).not.toContain("The run continues on the service.");
    expect(markup).not.toContain("the run keeps going");
    expect(markup).toContain(
      "Leaving this page stops watching and does not cancel the run. Use Stop to request cancellation.",
    );
    expect(markup).toMatch(/<button[^>]*>Reconnect<\/button>/);
  },
);
