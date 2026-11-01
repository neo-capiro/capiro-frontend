import { beforeEach, expect, it, vi } from "vitest";
import { isValidElement, type ReactElement, type ReactNode } from "react";
import { StrategyCreate } from "../src/features/modules/strategies/StrategyCreate";
import { ActionButton, Modal, SelectInput } from "../src/shared/module-ui";

// Inspect actual event handlers with synthetic hook state; no browser/provider.
const hooks = vi.hoisted(() => ({ values: [] as unknown[], cursor: 0 }));
vi.mock("react", async () => ({
  ...(await vi.importActual<typeof import("react")>("react")),
  useState: (initial: unknown) => {
    const slot = hooks.cursor++;
    if (hooks.values.length <= slot) hooks.values[slot] = initial;
    return [
      hooks.values[slot],
      (value: unknown) => {
        hooks.values[slot] =
          typeof value === "function" ? value(hooks.values[slot]) : value;
      },
    ];
  },
}));
vi.mock("../src/shared/capiro/queries", () => ({
  useCapiroQuery: () => ({
    data: [
      { id: "client-a", name: "A", status: "active" },
      { id: "client-b", name: "B", status: "active" },
    ],
    loading: false,
    error: null,
    reload: vi.fn(),
  }),
  useCapiroMutation: vi.fn(),
}));
vi.mock("next/navigation", () => ({ useRouter: vi.fn() }));
vi.mock("../src/shared/module-ui", () => ({
  ActionButton: () => null,
  Field: () => null,
  Modal: () => null,
  SelectInput: () => null,
}));
vi.mock("../src/features/portfolio/objectives/strategy-intake-public", () => ({
  ObjectiveFields: () => null,
  useObjectiveEditorSession: vi.fn(),
  ObjectiveEditorActions: () => null,
  ObjectiveEditorFeedback: () => null,
  ObjectiveReadyConfirmation: () => null,
}));
type Element = ReactElement<Record<string, unknown>>;
function elements(node: ReactNode): Element[] {
  if (Array.isArray(node)) return node.flatMap(elements);
  if (!isValidElement<Record<string, unknown>>(node)) return [];
  return [
    node,
    ...elements(node.props.children as ReactNode),
    ...elements(node.props.footer as ReactNode),
  ];
}
const close = vi.fn();
function render() {
  hooks.cursor = 0;
  return elements(
    StrategyCreate({
      initialClientId: "client-a",
      onClose: close,
      onCreated: vi.fn(),
    }),
  );
}
const get = (nodes: Element[], type: unknown) =>
  nodes.find((node) => node.type === type)!;
beforeEach(() => {
  hooks.values = [];
  hooks.cursor = 0;
  close.mockClear();
});
it("keeps the current client and draft until an explicit client-change confirmation", () => {
  let nodes = render();
  (get(nodes, SelectInput).props.onValueChange as (value: string) => void)(
    "client-b",
  );
  nodes = render();
  expect(get(nodes, SelectInput).props.value).toBe("client-a");
  const confirmation = nodes.find(
    (node) => node.type === Modal && node.props.title === "Change client?",
  )!;
  expect(confirmation.props.open).toBe(true);
  const buttons = elements(confirmation.props.footer as ReactNode).filter(
    (node) => node.type === ActionButton,
  );
  (buttons[0]!.props.onClick as () => void)();
  expect(get(render(), SelectInput).props.value).toBe("client-a");
  (get(render(), SelectInput).props.onValueChange as (value: string) => void)(
    "client-b",
  );
  const next = render().find(
    (node) => node.type === Modal && node.props.title === "Change client?",
  )!;
  (
    elements(next.props.footer as ReactNode).filter(
      (node) => node.type === ActionButton,
    )[1]!.props.onClick as () => void
  )();
  expect(get(render(), SelectInput).props.value).toBe("client-b");
  expect(close).not.toHaveBeenCalled();
});
it("disables the client selector while the shared save or manual create is pending", () => {
  const setup = render().find(
    (node) => typeof node.props.onBusy === "function",
  )!;
  (setup.props.onBusy as (busy: boolean) => void)(true);
  expect(get(render(), SelectInput).props.disabled).toBe(true);
  (setup.props.onBusy as (busy: boolean) => void)(false);
  expect(get(render(), SelectInput).props.disabled).toBe(false);
});
