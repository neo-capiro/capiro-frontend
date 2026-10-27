import { installPlatform } from "./command-recovery-platform";
installPlatform();
import { createElement, type ComponentProps } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, expect, it, vi } from "vitest";
import {
  taskInput,
  taskResponse,
  taskWorkflow,
} from "./meri-task-command-fixtures";
import { TaskUpdateController } from "../src/features/meri/task-updates/workflow-state";
import { MeriTaskUpdates } from "../src/features/meri/task-updates/MeriTaskUpdates";

// Existing SSR controller binding pattern: actual mounted view and controller callbacks.
const view = vi.hoisted(() => ({
  controller: null as unknown,
  buttons: [] as ComponentProps<"button">[],
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
    Button: (props: ComponentProps<"button">) => {
      view.buttons.push(props);
      return createElement("button", props);
    },
  };
});
afterEach(() => {
  view.controller = null;
  view.buttons = [];
});
const label = "Start another task update";
async function mounted(
  result: "observed" | "pending" | "unknown" = "observed",
) {
  let step = 0;
  const fetcher = vi.fn(async () => {
    if (step++ % 2 === 0) return taskResponse("prepare");
    if (result === "unknown") throw new Error("lost response");
    return taskResponse(result);
  });
  const h = taskWorkflow(fetcher),
    controller = new TaskUpdateController(h.port);
  controller.attach();
  await vi.waitFor(() =>
    expect(controller.getSnapshot().checkingRecovery).toBe(false),
  );
  controller.edit({
    ...taskInput,
    title: "Updated",
    status: "open",
    dueDate: "",
  });
  await controller.prepare();
  await controller.execute();
  view.controller = controller;
  const render = () => {
    view.buttons = [];
    return renderToStaticMarkup(
      createElement(MeriTaskUpdates, {
        port: h.port,
        lifetimeKey: "synthetic-current",
      }),
    );
  };
  return { ...h, controller, fetcher, render };
}

it("renders the terminal action, starts an empty form, and fences its captured callback from the next workflow", async () => {
  const h = await mounted();
  expect(h.render()).toContain("Task update confirmed");
  const button = view.buttons.find((b) => b.children === label)!;
  expect(button).toBeDefined();
  expect(button.disabled).toBe(false);
  button.onClick!({} as never);
  await vi.waitFor(() =>
    expect(h.controller.getSnapshot().proposal).toBeNull(),
  );
  expect(h.render()).not.toContain(label);
  expect(h.fetcher).toHaveBeenCalledTimes(2);
  h.controller.edit({
    ...taskInput,
    title: "Updated",
    status: "open",
    dueDate: "",
  });
  await h.controller.prepare();
  await h.controller.execute();
  const next = h.controller.getSnapshot();
  expect(h.render()).toContain(label);
  button.onClick!({} as never); // Old render captured the previous opaque handle.
  await new Promise((resolve) => setTimeout(resolve, 0));
  expect(h.controller.getSnapshot()).toBe(next);
  expect(h.fetcher).toHaveBeenCalledTimes(4);
  h.controller.dispose();
  h.port.dispose();
});

it.each(["pending", "unknown"] as const)(
  "never offers a new workflow for %s",
  async (result) => {
    const h = await mounted(result);
    expect(h.render()).not.toContain(label);
    const before = h.controller.getSnapshot().proposal;
    await h.controller.startNew(before!.handle);
    expect(h.controller.getSnapshot().proposal).toBe(before);
    expect(h.fetcher).toHaveBeenCalledTimes(2);
    h.controller.dispose();
    h.port.dispose();
  },
);

it("a callback retained after disposal cannot reset the retired controller or make a request", async () => {
  const h = await mounted();
  h.render();
  const click = view.buttons.find((b) => b.children === label)!.onClick!;
  h.controller.dispose();
  h.port.dispose();
  click({} as never);
  await Promise.resolve();
  expect(h.controller.getSnapshot().proposal).toBeNull();
  expect(h.fetcher).toHaveBeenCalledTimes(2);
});
