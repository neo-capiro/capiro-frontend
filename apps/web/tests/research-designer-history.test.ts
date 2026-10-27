import {
  Children,
  isValidElement,
  type ReactElement,
  type ReactNode,
} from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DashboardDesigner } from "../src/features/modules/research-portfolios/share/DashboardDesigner";
import {
  addWidget,
  emptyLayout,
} from "../src/features/modules/research-portfolios/share/dashboard-layout";

const hooks = vi.hoisted(() => ({ values: [] as unknown[], index: 0 }));
vi.mock("react", async (original) => ({
  ...(await original<typeof import("react")>()),
  useState(initial: unknown) {
    const index = hooks.index++;
    if (index === hooks.values.length) hooks.values.push(initial);
    return [
      hooks.values[index],
      (next: unknown) => {
        hooks.values[index] =
          typeof next === "function" ? next(hooks.values[index]) : next;
      },
    ];
  },
  useRef: (current: unknown) => ({ current }),
  useCallback: (callback: unknown) => callback,
  useEffect: (effect: () => void) => effect(),
}));

type Element = ReactElement<Record<string, unknown>>;
let keydown: (event: KeyboardEvent) => void;
let tree: ReactNode;
const save = vi.fn();
const cancel = vi.fn();
const initialLayout = addWidget(emptyLayout(), "sources", "synthetic-sources");
const render = () => {
  hooks.index = 0;
  tree = DashboardDesigner({
    initialName: "Synthetic design",
    initialLayout,
    busy: false,
    onSave: save,
    onCancel: cancel,
  });
};
function elements(node: ReactNode): Element[] {
  return Children.toArray(node).flatMap((child) =>
    isValidElement<Record<string, unknown>>(child)
      ? [child, ...elements(child.props.children as ReactNode)]
      : [],
  );
}
function text(node: ReactNode): string {
  return Children.toArray(node)
    .map((child) =>
      isValidElement<Record<string, unknown>>(child)
        ? text(child.props.children as ReactNode)
        : String(child),
    )
    .join("");
}
const groups = () =>
  elements(tree).filter((node) => node.props.role === "group");
const status = () =>
  text(elements(tree).find((node) => node.props.role === "status")!);
function remove() {
  const widget = groups()[0]!;
  const target = {};
  const onKeyDown = widget.props.onKeyDown as (event: unknown) => void;
  onKeyDown({
    key: "Delete",
    target,
    currentTarget: target,
    preventDefault: vi.fn(),
  });
  render();
}
function shortcut(shiftKey = false, tagName = "SECTION") {
  const preventDefault = vi.fn();
  keydown({
    key: "z",
    ctrlKey: true,
    shiftKey,
    target: { tagName },
    preventDefault,
  } as unknown as KeyboardEvent);
  render();
  return preventDefault;
}
function click(label: string) {
  const button = elements(tree).find(
    (node) => text(node.props.children as ReactNode) === label,
  )!;
  expect(button.props.disabled).toBe(false);
  (button.props.onClick as () => void)();
  render();
}

beforeEach(() => {
  hooks.values = [];
  save.mockReset();
  cancel.mockReset();
  vi.stubGlobal("window", {
    addEventListener: (_name: string, listener: typeof keydown) => {
      keydown = listener;
    },
    removeEventListener: vi.fn(),
  });
  vi.stubGlobal(
    "requestAnimationFrame",
    vi.fn(() => 1),
  );
  render();
});
afterEach(() => vi.unstubAllGlobals());

describe("dashboard history announcements", () => {
  it("announces keyboard restoration and redo instead of retaining the removal message", () => {
    const label = groups()[0]!.props["aria-label"];
    remove();
    expect(groups()).toHaveLength(0);
    expect(status()).toBe("Sources removed.");
    expect(shortcut()).toHaveBeenCalledOnce();
    expect(groups()).toHaveLength(1);
    expect(groups()[0]!.props["aria-label"]).toBe(label);
    expect(status()).toBe("Previous change undone. Layout restored.");
    shortcut(true);
    expect(groups()).toHaveLength(0);
    expect(status()).toBe("Change redone. Layout restored.");
    expect(save).not.toHaveBeenCalled();
    expect(cancel).not.toHaveBeenCalled();
  });

  it("uses the same announcements for toolbar undo and redo", () => {
    remove();
    click("Undo");
    expect(groups()).toHaveLength(1);
    expect(status()).toBe("Previous change undone. Layout restored.");
    click("Redo");
    expect(groups()).toHaveLength(0);
    expect(status()).toBe("Change redone. Layout restored.");
  });

  it("does not claim a history change at a boundary or capture text editing undo", () => {
    shortcut();
    expect(status()).toBe("");
    remove();
    expect(shortcut(false, "TEXTAREA")).not.toHaveBeenCalled();
    expect(groups()).toHaveLength(0);
    expect(status()).toBe("Sources removed.");
    shortcut();
    const restored = status();
    shortcut();
    expect(status()).toBe(restored);
    expect(groups()).toHaveLength(1);
  });
});
