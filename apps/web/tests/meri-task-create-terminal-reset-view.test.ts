import { installPlatform } from "./command-recovery-platform";
installPlatform();
import { createElement, type ComponentProps } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, expect, it, vi } from "vitest";
import { context, harness } from "./meri-action-fixtures";
import { ActionWorkflowController } from "../src/features/meri/actions/action-workflow-state";
import { MeriActionWorkflow } from "../src/features/meri/actions/MeriActionWorkflow";

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
const label = "Start another task";
async function mounted(result = "execute-observed") {
  const h = harness(),
    controller = new ActionWorkflowController(h.port);
  controller.attach();
  await vi.waitFor(() =>
    expect(controller.getSnapshot().checkingRecovery).toBe(false),
  );
  const complete = async () => {
    h.queue.push("query", "draft", "prepare", result);
    await controller.query();
    controller.select(controller.getSnapshot().page!.items[0]!.key);
    controller.edit({ title: context.task.title, dueDate: null });
    await controller.reviewDraft();
    await controller.prepare();
    await controller.execute();
  };
  await complete();
  view.controller = controller;
  const render = () => {
    view.buttons = [];
    return renderToStaticMarkup(
      createElement(MeriActionWorkflow, {
        port: h.port,
        lifetimeKey: "synthetic-create",
        contextLabel: "Synthetic client",
      }),
    );
  };
  return { ...h, controller, render, complete };
}

it("renders the explicit terminal action and fences its captured callback from a later confirmed create", async () => {
  const h = await mounted();
  expect(h.render()).toContain("Task creation confirmed");
  const button = view.buttons.find((b) => b.children === label)!;
  expect(button).toBeDefined();
  expect(button.disabled).toBe(false);
  button.onClick!({} as never);
  await vi.waitFor(() =>
    expect(h.controller.getSnapshot().proposal).toBeNull(),
  );
  expect(h.render()).not.toContain(label);
  expect(h.render()).toContain("Find recommendations");
  expect(h.requests).toHaveLength(4);
  await h.complete();
  const next = h.controller.getSnapshot();
  expect(h.render()).toContain(label);
  button.onClick!({} as never);
  await new Promise((resolve) => setTimeout(resolve, 0));
  expect(h.controller.getSnapshot()).toBe(next);
  expect(h.requests).toHaveLength(8);
  h.controller.dispose();
  h.port.dispose();
});

it.each(["execute-approval-pending", "execute-indeterminate"])(
  "does not render a terminal reset for %s",
  async (result) => {
    const h = await mounted(result);
    expect(h.render()).not.toContain(label);
    expect(h.requests).toHaveLength(4);
    h.controller.dispose();
    h.port.dispose();
  },
);
