import { describe, expect, it } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { RoutineListStatus } from "../src/features/meri/routines/RoutinesWorkspace";

type Status = Parameters<typeof RoutineListStatus>[0]["page"];
const render = (page: Status) =>
  renderToStaticMarkup(createElement(RoutineListStatus, { page }));

describe("routine list status", () => {
  it("says no routines yet and that partial coverage may hide some", () => {
    // 2 Nov acceptance: routine-list answered 200 with no rows and incomplete coverage, and the page said nothing.
    const html = render({
      rows: [],
      coverage: { complete: false, currentRetryVerified: false },
    } as Status);
    expect(html).toContain("No routines yet.");
    expect(html).toContain("Some routines may not be shown yet.");
  });
  it("states only the coverage caveat when routines are listed", () => {
    const html = render({
      rows: [{}],
      coverage: { complete: false, currentRetryVerified: false },
    } as unknown as Status);
    expect(html).not.toContain("No routines yet.");
    expect(html).toContain("Some routines may not be shown yet.");
  });
  it("omits the caveat when coverage is complete", () => {
    const html = render({
      rows: [],
      coverage: { complete: true, currentRetryVerified: true },
    } as unknown as Status);
    expect(html).toContain("No routines yet.");
    expect(html).not.toContain("may not be shown");
  });
});
