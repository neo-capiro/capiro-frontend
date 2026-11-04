import { describe, expect, it, vi } from "vitest";
import {
  prospectDetailHref,
  prospectReturnTo,
  rememberProspectListScroll,
  restoreProspectListScroll,
} from "../src/features/portfolio/prospects/list-navigation";

describe("prospect list return context", () => {
  it("saves and restores the scrolling shell instead of the fixed browser window", () => {
    const values = new Map<string, string>();
    const main = { scrollTop: 720, scrollTo: vi.fn() };
    vi.stubGlobal("document", { getElementById: () => main });
    vi.stubGlobal("window", { scrollY: 0, scrollTo: vi.fn() });
    vi.stubGlobal("sessionStorage", {
      setItem: (key: string, value: string) => values.set(key, value),
      getItem: (key: string) => values.get(key) ?? null,
    });
    try {
      rememberProspectListScroll("/portfolio/prospects?status=dismissed");
      main.scrollTop = 0;
      restoreProspectListScroll("/portfolio/prospects?status=dismissed");
      expect(main.scrollTo).toHaveBeenCalledWith({
        top: 720,
        behavior: "instant",
      });
    } finally {
      vi.unstubAllGlobals();
    }
  });
  it("carries stage, archived state, search, owner and list ordering", () => {
    const list =
      "/portfolio/prospects?q=Satellite&status=dismissed&stage=outreach&ownerId=synthetic&sort=name&view=list";
    const detail = new URL(
      prospectDetailHref("synthetic", list),
      "https://example.test",
    );
    expect(prospectReturnTo(detail.searchParams.get("returnTo"))).toBe(list);
  });
  it.each([
    "https://elsewhere.test/",
    "//elsewhere.test/portfolio",
    "/\\elsewhere.test",
    "/modules",
    "/portfolio/prospects/other",
    "/portfolio/%2e%2e/meri",
    "/%2felsewhere.test/portfolio",
    "/portfolio/../",
    "/portfolio?view=list#untrusted",
  ])("rejects an unrelated return destination %s", (value) => {
    expect(prospectReturnTo(value)).toBe("/portfolio/prospects");
  });
  it("retains overview filters and drops transient editor flags", () => {
    expect(
      prospectReturnTo(
        "/portfolio?type=prospect&owner=member&layout=list&new=objective&returnTo=external",
      ),
    ).toBe("/portfolio?type=prospect&owner=member&layout=list");
  });
});
