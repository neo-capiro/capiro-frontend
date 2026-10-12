import { describe, expect, it } from "vitest";
import { clientViews } from "@/shared/portfolio/shell/client-views";

describe("available client view navigation", () => {
  it("binds the designed shortcuts only to allocated client routes", () => {
    expect(
      Object.fromEntries(
        clientViews
          .filter((view) => view.shortcut)
          .map((view) => [view.shortcut, view.suffix]),
      ),
    ).toEqual({
      o: "",
      j: "/objectives",
      c: "/calendar",
      r: "/relationships",
      w: "/work",
      k: "/capabilities",
      q: "/opportunities",
      f: "/files",
    });
    expect(new Set(clientViews.map((view) => view.suffix)).size).toBe(9);
    expect(
      clientViews.find((view) => view.suffix === "/bills")?.shortcut,
    ).toBeNull();
  });
});
