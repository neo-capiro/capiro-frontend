import { describe, expect, it } from "vitest";
import {
  addWidget,
  defaultLayout,
  emptyLayout,
  layoutProblems,
  movePhoneOrder,
  moveWidget,
  normalizePhoneOrder,
  removeWidget,
  resizeWidget,
  widgetsForPhone,
} from "./dashboard-layout";

describe("client dashboard layout", () => {
  it("starts from a valid default and reports an empty layout as unsaveable", () => {
    expect(layoutProblems(defaultLayout())).toEqual([]);
    expect(layoutProblems(emptyLayout())).toEqual(["Add at least one widget."]);
  });

  it("adds widgets below everything else and keeps the phone order complete", () => {
    const layout = addWidget(
      addWidget(emptyLayout(), "header", "a"),
      "commentary",
      "b",
    );
    expect(layout.widgets.map((w) => [w.id, w.x, w.y, w.w, w.h])).toEqual([
      ["a", 0, 0, 12, 2],
      ["b", 0, 2, 6, 3],
    ]);
    expect(layout.phoneOrder).toEqual(["a", "b"]);
    expect(addWidget(layout, "sources", "a")).toBe(layout);
  });

  it("drops a moved widget on the first free row instead of overlapping", () => {
    const layout = addWidget(
      addWidget(emptyLayout(), "key_totals", "a"),
      "client_fit",
      "b",
    );
    const moved = moveWidget(layout, "b", 0, 0);
    expect(moved.widgets.find((w) => w.id === "b")).toMatchObject({
      x: 0,
      y: 3,
    });
    const beside = moveWidget(layout, "b", 6, 0);
    expect(beside.widgets.find((w) => w.id === "b")).toMatchObject({
      x: 6,
      y: 0,
    });
    expect(
      moveWidget(layout, "b", 40, 0).widgets.find((w) => w.id === "b")?.x,
    ).toBe(6);
    expect(moveWidget(layout, "missing", 0, 0)).toBe(layout);
  });

  it("clamps resizes to the widget minimum and the grid, and refuses overlaps", () => {
    const layout = moveWidget(
      addWidget(addWidget(emptyLayout(), "key_totals", "a"), "client_fit", "b"),
      "b",
      6,
      0,
    );
    expect(resizeWidget(layout, "a", 1, 1).widgets[0]).toMatchObject({
      w: 3,
      h: 2,
    });
    expect(resizeWidget(layout, "b", 99, 3).widgets[1]).toMatchObject({ w: 6 });
    expect(resizeWidget(layout, "a", 8, 3)).toBe(layout);
  });

  it("removes widgets from the grid and the phone order", () => {
    const layout = removeWidget(defaultLayout(), "fit");
    expect(layout.widgets.some((w) => w.id === "fit")).toBe(false);
    expect(layout.phoneOrder).not.toContain("fit");
    expect(layoutProblems(layout)).toEqual([]);
  });

  it("reorders the phone reading order and repairs an incomplete one", () => {
    const layout = defaultLayout();
    expect(movePhoneOrder(layout, "fit", -1).phoneOrder.slice(0, 3)).toEqual([
      "header",
      "fit",
      "totals",
    ]);
    expect(movePhoneOrder(layout, "header", -1)).toBe(layout);
    const broken = { ...layout, phoneOrder: ["subjects", "ghost", "subjects"] };
    expect(layoutProblems(broken)).toContain(
      "The phone order must list every widget exactly once.",
    );
    expect(normalizePhoneOrder(broken).phoneOrder).toEqual([
      "subjects",
      "header",
      "totals",
      "fit",
      "funding",
      "changes",
    ]);
    expect(widgetsForPhone(broken).map((w) => w.id)[0]).toBe("subjects");
  });

  it("flags overlapping and duplicate widgets", () => {
    const layout = defaultLayout();
    const overlapping = {
      ...layout,
      widgets: layout.widgets.map((w) => (w.id === "fit" ? { ...w, x: 3 } : w)),
    };
    expect(layoutProblems(overlapping)).toEqual([
      "Key totals overlaps another widget or leaves the grid.",
      "Client fit overlaps another widget or leaves the grid.",
    ]);
    const duplicate = {
      ...layout,
      widgets: [...layout.widgets, { ...layout.widgets[0]!, y: 40 }],
    };
    expect(layoutProblems(duplicate)).toContain(
      "Widget id header is used twice.",
    );
  });
});
