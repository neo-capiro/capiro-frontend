import { expect, it, vi } from "vitest";
import type { ReactElement } from "react";
import { Tabs } from "../src/shared/module-ui/Tabs";
import { researchPortfolioTabs } from "../src/features/modules/research-portfolios/research-navigation";
vi.mock("react", async (original) => ({
  ...(await original<typeof import("react")>()),
  useId: () => "tabs",
  useRef: (value: unknown) => ({ current: value }),
}));
type Button = ReactElement<{
  onKeyDown: (event: unknown) => void;
  ref: (node: unknown) => void;
  children: unknown;
  role: string;
}>;
it("keeps all Research tabs in keyboard order with opt-in wrapping", () => {
  const onChange = vi.fn();
  const tree = Tabs({
    items: researchPortfolioTabs,
    value: "overview",
    onChange,
    wrap: true,
  });
  const buttons = tree.props.children as Button[];
  // Bills (requirement 14c) is the seventeenth tab and the last in keyboard order.
  expect(buttons).toHaveLength(17);
  const focus = vi.fn();
  buttons.at(-1)!.props.ref({ focus });
  buttons[0]!.props.onKeyDown({ key: "End", preventDefault: vi.fn() });
  expect(onChange).toHaveBeenLastCalledWith("bills");
  expect(focus).toHaveBeenCalledOnce();
  expect(tree.props.className).toContain("wrappedTabs");
  expect(
    Tabs({ items: researchPortfolioTabs, value: "overview", onChange }).props
      .className,
  ).not.toContain("wrappedTabs");
});
