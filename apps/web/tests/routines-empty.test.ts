import { describe, expect, it } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { RoutinesEmpty } from "../src/features/meri/routines/RoutinesWorkspace";

const render = (rows: number) =>
  renderToStaticMarkup(createElement(RoutinesEmpty, { rows }));

describe("routines empty state", () => {
  it("says no routines yet when the read returns no rows", () => {
    // 2 Nov acceptance: routine-list answered 200 with no rows and the page said nothing a person could act on.
    expect(render(0)).toContain("No routines yet.");
  });
  it("is absent when routines are listed", () => {
    expect(render(2)).toBe("");
  });
});
