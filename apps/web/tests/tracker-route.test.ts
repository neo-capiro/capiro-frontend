import { describe, expect, it } from "vitest";
import {
  trackerRouteHref,
  trackerViewParameter,
} from "../src/features/portfolio/bill-tracker/tracker-route";

describe("shared bill tracker navigation", () => {
  it("keeps the client profile destination and its existing view parameter", () => {
    expect(trackerViewParameter("/portfolio/synthetic-client/bills")).toBe(
      "view",
    );
    expect(
      trackerRouteHref(
        "/portfolio/synthetic-client/bills",
        "q=clean+energy",
        "view",
        "board",
      ),
    ).toBe("/portfolio/synthetic-client/bills?q=clean+energy&view=board");
  });

  it("preserves the module destination, section and optional client filter", () => {
    const href = trackerRouteHref(
      "/modules/intelligence",
      "view=legiwatch&lw=bills&clientId=synthetic-client",
      "view",
      "board",
    );
    expect(href).toBe(
      "/modules/intelligence?view=legiwatch&lw=bills&clientId=synthetic-client&trackerView=board",
    );
    expect(trackerViewParameter("/modules/legiwatch")).toBe("trackerView");
  });

  it("removes an empty filter without adding a client or leaving the route", () => {
    expect(trackerRouteHref("/modules/legiwatch", "q=energy", "q", "")).toBe(
      "/modules/legiwatch",
    );
    expect(
      trackerRouteHref(
        "/modules/legiwatch",
        "trackerView=board",
        "q",
        "H.R. 1",
      ),
    ).toBe("/modules/legiwatch?trackerView=board&q=H.R.+1");
  });
});
