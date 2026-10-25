import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, expect, it, vi } from "vitest";
import { installPlatform } from "./command-recovery-platform";
import { harness } from "./meri-action-fixtures";
import { ActionWorkflowController } from "../src/features/meri/actions/action-workflow-state";
import { MeriActionWorkflow } from "../src/features/meri/actions/MeriActionWorkflow";

// Bind the exercised controller to the SSR view so the rendered copy uses its actual state.
const view = vi.hoisted(() => ({
  controller: null as unknown,
  controls: [] as Array<{ children: unknown; onClick?: () => void }>,
}));
vi.mock("react", async (original) => {
  const react = await original<typeof import("react")>();
  return {
    ...react,
    useMemo: (factory: () => unknown, deps: readonly unknown[]) =>
      view.controller ?? react.useMemo(factory, deps),
  };
});
vi.mock("@capiro/ui/button", async () => {
  const { createElement } = await import("react");
  return {
    Button: (props: { children: unknown; onClick?: () => void }) => {
      view.controls.push(props);
      return createElement(
        "button",
        props as import("react").ComponentProps<"button">,
      );
    },
  };
});
installPlatform();
afterEach(() => {
  view.controller = null;
  view.controls = [];
});

it("a failed recommendation query does not claim a saved task or offer a write retry", async () => {
  const h = harness();
  const controller = new ActionWorkflowController(h.port);
  controller.attach();
  await vi.waitFor(() =>
    expect(controller.getSnapshot().checkingRecovery).toBe(false),
  );
  h.queue.push(async () =>
    Response.json(
      { error: { code: "FRONTEND_ACTION_UNAVAILABLE" } },
      { status: 502 },
    ),
  );
  await controller.query();
  expect(controller.getSnapshot()).toMatchObject({
    problem: "unknown",
    savedRequest: false,
    proposal: null,
    canDiscard: false,
  });
  expect(h.journal.read()).toEqual({
    status: "unresolved",
    problem: "unknown",
  });
  expect(h.requests).toHaveLength(1);
  view.controller = controller;
  const html = renderToStaticMarkup(
    createElement(MeriActionWorkflow, {
      port: h.port,
      lifetimeKey: "synthetic-current",
      contextLabel: "Synthetic client",
    }),
  );
  expect(html).toContain("Outcome uncertain");
  expect(html).not.toContain("A task request is saved.");
  expect(html).not.toContain("Retry exact saved request");
  expect(html).toContain("Check saved task recovery");
  const retry = vi.spyOn(h.port, "retrySaved");
  view.controls.find(
    (button) => button.children === "Check saved task recovery",
  )!.onClick!();
  await vi.waitFor(() => expect(controller.getSnapshot().problem).toBe(null));
  expect(retry).not.toHaveBeenCalled();
  expect(h.requests).toHaveLength(1);
  expect(h.journal.read()).toEqual({ status: "idle" });
  controller.dispose();
  h.port.dispose();
});

it("an actually restored preparation still offers only its exact saved retry", async () => {
  const retry = vi.fn(async () => ({
    ok: false as const,
    problem: "unknown" as const,
  }));
  const h = harness();
  const port = {
    ...h.port,
    restore: async () => ({
      ok: true as const,
      value: {
        phase: "prepare" as const,
        fields: [{ label: "Task", value: "Retained synthetic task" }],
      },
    }),
    retrySaved: retry,
    query: h.port.query.bind(h.port),
    draft: h.port.draft.bind(h.port),
    prepare: h.port.prepare.bind(h.port),
    execute: h.port.execute.bind(h.port),
  };
  const controller = new ActionWorkflowController(port);
  controller.attach();
  await vi.waitFor(() =>
    expect(controller.getSnapshot().savedRequest).toBe(true),
  );
  view.controller = controller;
  const html = renderToStaticMarkup(
    createElement(MeriActionWorkflow, {
      port,
      lifetimeKey: "synthetic-restored",
      contextLabel: "Synthetic client",
    }),
  );
  expect(html).toContain("A task request is saved.");
  expect(html).toContain("Retained synthetic task");
  expect(html).toContain("Retry exact saved request");
  view.controls.find(
    (button) => button.children === "Retry exact saved request",
  )!.onClick!();
  await vi.waitFor(() => expect(retry).toHaveBeenCalledOnce());
  expect(h.requests).toHaveLength(0);
  controller.dispose();
  h.port.dispose();
});
