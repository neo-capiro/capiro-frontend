import { isValidElement, type ReactElement, type ReactNode } from "react";
import { beforeEach, expect, it, vi } from "vitest";
import { ResearchPortfolioDetail } from "./ResearchDetail";

const detail = vi.hoisted(() => ({
  data: null as null | { id: string; name: string; purpose: string },
  reloads: 0,
}));
vi.mock("../../../shared/capiro/queries", () => ({
  useCapiroQuery: () => ({
    data: detail.data,
    loading: false,
    reload: () => detail.reloads++,
  }),
}));
vi.mock("../../../shared/module-ui", () => ({
  ActionButton: "action-button",
  PageHeader: "page-header",
  StatusPanel: "status-panel",
  Tabs: "tabs",
}));

type Element = ReactElement<Record<string, unknown>>;
function findElement(node: ReactNode, type: string): Element | undefined {
  if (Array.isArray(node)) {
    for (const child of node) {
      const found = findElement(child, type);
      if (found) return found;
    }
    return undefined;
  }
  if (!isValidElement(node)) return undefined;
  if (node.type === type) return node as Element;
  return findElement((node.props as { children?: ReactNode }).children, type);
}

beforeEach(() => {
  detail.data = null;
  detail.reloads = 0;
});

it("withholds another portfolio's title, body and action on a mismatched response", () => {
  detail.data = {
    id: "other-portfolio",
    name: "Other portfolio private title",
    purpose: "Other portfolio private purpose",
  };
  const tree = ResearchPortfolioDetail({
    id: "selected-portfolio",
    view: "overview",
    onView: () => undefined,
    onBack: () => undefined,
  });
  expect(findElement(tree, "page-header")).toBeUndefined();
  expect(findElement(tree, "tabs")).toBeUndefined();
  const status = findElement(tree, "status-panel");
  expect(status?.props.error).toBe(
    "This research portfolio could not be verified. Try again.",
  );
  expect(status?.props.children).toBeUndefined();
  (status?.props.onRetry as () => void)();
  expect(detail.reloads).toBe(1);
});

it("still renders a matching, verified portfolio", () => {
  detail.data = {
    id: "selected-portfolio",
    name: "Selected portfolio",
    purpose: "Selected purpose",
  };
  const tree = ResearchPortfolioDetail({
    id: "selected-portfolio",
    view: "overview",
    onView: () => undefined,
    onBack: () => undefined,
  });
  expect(findElement(tree, "page-header")?.props.title).toBe(
    "Selected portfolio",
  );
  expect(findElement(tree, "tabs")).toBeDefined();
  expect(findElement(tree, "status-panel")?.props.error).toBeUndefined();
});
