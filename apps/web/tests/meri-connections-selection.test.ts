import {
  Children,
  isValidElement,
  type ReactElement,
  type ReactNode,
} from "react";
import { beforeEach, expect, it, vi } from "vitest";
import {
  ConnectorAccountsScreen,
  type ConnectorAccountsView,
} from "../src/features/meri/screens/settings/ConnectorAccountsScreen";
import { connectionView } from "../src/features/meri/screens/settings/connections-view";
import { unavailablePreferences } from "../src/features/meri/screens/settings/preferences-unavailable";
import { DataTable } from "../src/features/meri/ui/DataTable";

const hooks = vi.hoisted(() => ({ values: [] as unknown[], index: 0 }));
vi.mock("react", async (original) => ({
  ...(await original<typeof import("react")>()),
  useState(initial: unknown) {
    const index = hooks.index++;
    if (index === hooks.values.length) hooks.values.push(initial);
    return [
      hooks.values[index],
      (next: unknown) => {
        hooks.values[index] = next;
      },
    ];
  },
  useRef: (current: unknown) => ({ current }),
}));
type Element = ReactElement<Record<string, unknown>>;
const base = unavailablePreferences.connections;
const connection = (id: string, email: string) => ({
  id,
  accountEmail: email,
  provider: "microsoft_365" as const,
  status: "connected" as const,
  scopes: [],
  displayName: null,
  lastSyncAt: null,
  lastError: null,
});
const first = connection("synthetic-first", "first@example.test");
const second = connection("synthetic-second", "second@example.test");
const view = (rows: Parameters<typeof connectionView>[0]) =>
  connectionView(rows, "/settings/integrations", base);
function elements(node: ReactNode): Element[] {
  return Children.toArray(node).flatMap((child) =>
    isValidElement<Record<string, unknown>>(child)
      ? [child, ...elements(child.props.children as ReactNode)]
      : [],
  );
}
function render(current: ConnectorAccountsView) {
  hooks.index = 0;
  const tree = ConnectorAccountsScreen({
    chrome: {
      nav: [],
      embedded: true,
      notice: { title: "Connections", detail: "" },
      unavailable: "Unavailable",
      localDrafts: false,
      headerOverlays: false,
    },
    view: current,
  });
  const table = elements(tree.props.primary).find(
    (node) => node.type === DataTable,
  )!;
  const scope = elements(tree.props.supporting).find(
    (node) => node.props.title === "Granted scope",
  )!;
  return {
    selected: table.props.selectedId,
    choose: table.props.onSelect as (id: string) => void,
    description: scope.props.description as string,
  };
}
beforeEach(() => {
  hooks.index = 0;
  hooks.values = [];
});

it("selects a current row when account data arrives after the loading view", () => {
  expect(render(base).selected).toBeUndefined();
  const loaded = render(view([first]));
  expect(loaded.selected).toBe(first.id);
  expect(loaded.description).toContain("first@example.test");
  expect(loaded.description).toContain("have not been verified");
  expect(loaded.description).not.toContain("No provider connection");
});

it("keeps the chosen current row and discards its detail when that row disappears", () => {
  render(view([first, second])).choose(second.id);
  expect(render(view([first, second])).description).toContain(
    "second@example.test",
  );
  const removed = render(view([first]));
  expect(removed.selected).toBe(first.id);
  expect(removed.description).toContain("first@example.test");
  expect(removed.description).not.toContain("second@example.test");
});

it("shows no previous account detail when current connections are unavailable", () => {
  render(view([first]));
  const unavailable = render(base);
  expect(unavailable.selected).toBeUndefined();
  expect(unavailable.description).not.toContain("first@example.test");
});
