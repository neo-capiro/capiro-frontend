import { describe, expect, it } from "vitest";
import {
  productHref,
  routeClientId,
  scopedHref,
} from "../src/shared/session/client-route";

describe("Settings client navigation hints", () => {
  it("reads Settings hints without treating a lookalike path as a client route", () => {
    const search = new URLSearchParams("clientId=client-a");
    expect(routeClientId("/settings/personal", search)).toBe("client-a");
    expect(routeClientId("/settings", search)).toBe("client-a");
    expect(routeClientId("/settings-other", search)).toBeUndefined();
    expect(
      routeClientId("/settings/team", new URLSearchParams()),
    ).toBeUndefined();
  });
  it("uses the same verified hint for Settings and the three product modes", () => {
    expect(scopedHref("/settings/team?view=pending", "client-a")).toBe(
      "/settings/team?view=pending&clientId=client-a",
    );
    expect(scopedHref("/settings/team")).toBe("/settings/team");
    expect(productHref("meri", "client-a")).toBe("/meri?clientId=client-a");
    expect(productHref("modules", "client-a")).toBe(
      "/modules?clientId=client-a",
    );
    expect(productHref("portfolio", "client-a")).toBe("/portfolio/client-a");
  });
  it("defaults the unscoped entry to Meri with General and Portfolio to its own route", () => {
    expect(productHref("meri")).toBe("/meri?scope=general");
    expect(productHref("portfolio")).toBe("/portfolio");
    expect(productHref("modules")).toBe("/modules");
    // An explicit or verified client scope still wins over the General default.
    expect(productHref("meri", "client-a")).toBe("/meri?clientId=client-a");
    expect(productHref("portfolio", "client-a")).toBe("/portfolio/client-a");
  });
});
