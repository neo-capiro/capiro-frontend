import { describe, expect, it } from "vitest";
import {
  readResearchPortfolioFilters,
  readResearchPortfolioView,
  researchPortfolioHref,
} from "./research-navigation";

describe("research portfolio URL navigation", () => {
  it("keeps a selected portfolio and tab in history while preserving other query hints", () => {
    const list =
      "/modules/research-portfolios?clientId=selected-client&source=hub";
    const opened = researchPortfolioHref(
      { portfolioId: "portfolio-1", view: "overview" },
      list.split("?")[1],
    );
    expect(opened).toBe(
      "/modules/research-portfolios?clientId=selected-client&source=hub&portfolioId=portfolio-1",
    );

    const tab = researchPortfolioHref(
      { portfolioId: "portfolio-1", view: "members" },
      opened.split("?")[1],
    );
    expect(tab).toBe(
      "/modules/research-portfolios?clientId=selected-client&source=hub&portfolioId=portfolio-1&view=members",
    );
    const restored = new URL(tab, "https://local.example");
    expect(restored.searchParams.get("portfolioId")).toBe("portfolio-1");
    expect(readResearchPortfolioView(restored.searchParams.get("view"))).toBe(
      "members",
    );

    const backToList = researchPortfolioHref(
      { view: "members" },
      restored.search.slice(1),
    );
    expect(backToList).toBe(
      "/modules/research-portfolios?clientId=selected-client&source=hub&view=members",
    );
    expect(
      readResearchPortfolioView(
        new URL(opened, restored).searchParams.get("view"),
      ),
    ).toBe("overview");
  });

  it("normalizes invalid views and duplicate owned parameters on navigation", () => {
    expect(readResearchPortfolioView("unknown")).toBe("overview");
    expect(
      researchPortfolioHref(
        { portfolioId: "portfolio-2", view: "overview" },
        "clientId=selected&portfolioId=old&portfolioId=older&view=unknown&view=members",
      ),
    ).toBe(
      "/modules/research-portfolios?clientId=selected&portfolioId=portfolio-2",
    );
  });

  it("restores validated filters from a URL and removes opaque cursors from navigation", () => {
    const filtered = new URLSearchParams(
      "clientId=selected&role=viewer&mode=hybrid&lifecycle=all&cursor=private-page",
    );
    expect(readResearchPortfolioFilters(filtered)).toEqual({
      role: "viewer",
      mode: "hybrid",
      lifecycle: "all",
    });
    const opened = researchPortfolioHref(
      { portfolioId: "portfolio-1", view: "members" },
      filtered.toString(),
    );
    expect(opened).toBe(
      "/modules/research-portfolios?clientId=selected&portfolioId=portfolio-1&view=members&role=viewer&mode=hybrid&lifecycle=all",
    );
    const back = researchPortfolioHref(
      { view: "members" },
      opened.split("?")[1],
    );
    expect(back).toBe(
      "/modules/research-portfolios?clientId=selected&view=members&role=viewer&mode=hybrid&lifecycle=all",
    );
    expect(
      readResearchPortfolioFilters(
        new URL(back, "https://local.example").searchParams,
      ),
    ).toEqual(readResearchPortfolioFilters(filtered));
  });

  it("defaults unsupported filter values without promoting them to links", () => {
    const invalid = new URLSearchParams(
      "role=administrator&mode=automatic&lifecycle=deleted",
    );
    expect(readResearchPortfolioFilters(invalid)).toEqual({
      role: "",
      mode: "",
      lifecycle: "active",
    });
    expect(
      researchPortfolioHref({ view: "overview" }, invalid.toString()),
    ).toBe("/modules/research-portfolios");
  });
});
