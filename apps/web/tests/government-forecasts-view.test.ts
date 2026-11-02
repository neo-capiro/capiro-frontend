import { createElement, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { Temporal } from "temporal-polyfill";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { moduleCatalog, moduleHref } from "../src/shared/shell/module-catalog";
import { IntelligenceScreen } from "../src/features/modules/intelligence/IntelligenceScreen";
import { FundingOpportunities } from "../src/features/modules/intelligence/FundingOpportunities";
import { defaultForecastRange } from "../src/features/modules/intelligence/GovernmentForecasts";

const state = vi.hoisted(() => ({
  search: "",
  replace: vi.fn(),
  push: vi.fn(),
  capiroInputs: [] as { query: { source?: string } }[],
  queryKeys: [] as unknown[][],
}));
vi.mock("next/navigation", () => ({
  usePathname: () => "/modules/intelligence",
  useRouter: () => ({ push: state.push, replace: state.replace }),
  useSearchParams: () => new URLSearchParams(state.search),
}));
vi.mock("../src/shared/capiro/queries", () => ({
  useCapiroQuery: (_key: string, input: { query: { source?: string } }) => {
    state.capiroInputs.push(input);
    return { loading: true, reload: vi.fn() };
  },
}));
vi.mock("@tanstack/react-query", () => ({
  useQuery: ({ queryKey }: { queryKey: unknown[] }) => {
    state.queryKeys.push(queryKey);
    return { isSuccess: false, isFetching: true, error: null };
  },
}));
vi.mock("@/shared/portfolio/api/provider", () => ({
  DataProvider: ({ children }: { children: ReactNode }) => children,
  useApi: () => ({}),
}));
vi.mock("@/shared/portfolio/ui/QueryState", () => ({ QueryState: () => null }));
// Sibling views are not under test; several touch browser globals at import.
vi.mock("../src/features/modules/intelligence/DataExplorer", () => ({
  DataExplorer: () => null,
}));
vi.mock("../src/features/modules/intelligence/DefenseBudget", () => ({
  DefenseBudget: () => null,
}));
vi.mock("../src/features/modules/intelligence/DistrictNexus", () => ({
  DistrictNexus: () => null,
}));
vi.mock(
  "../src/features/modules/intelligence/legiwatch/LegiWatchScreen",
  () => ({
    LegiWatchScreen: () => null,
  }),
);
vi.mock(
  "../src/features/modules/intelligence/research/ResearchWorkspace",
  () => ({
    ResearchWorkspace: () => null,
  }),
);
vi.mock(
  "../src/features/modules/intelligence/research/ResearchCoverage",
  () => ({
    ResearchCoverage: () => null,
  }),
);
vi.mock(
  "../src/features/modules/intelligence/changes/ChangesWorkspace",
  () => ({
    ChangesWorkspace: () => null,
  }),
);

beforeEach(() => {
  state.search = "";
  state.capiroInputs = [];
  state.queryKeys = [];
  state.replace.mockReset();
});

describe("government forecasts reach the Intelligence module", () => {
  it("offers a Forecasts chip on the Intelligence card", () => {
    const intelligence = moduleCatalog.find((m) => m.slug === "intelligence")!;
    expect(intelligence.chips).toContainEqual({
      label: "Forecasts",
      view: "forecasts",
    });
    expect(moduleHref("intelligence", "forecasts")).toBe(
      "/modules/intelligence?view=forecasts",
    );
  });
  it("renders the Core forecast windows read for the next two quarters", () => {
    state.search = "view=forecasts";
    const html = renderToStaticMarkup(createElement(IntelligenceScreen));
    expect(html).toContain("Government forecast windows");
    expect(html).toContain("Unified Agenda");
    const range = defaultForecastRange();
    expect(state.queryKeys).toEqual([
      [
        "government-forecast-windows",
        expect.objectContaining({ from: range.from, to: range.to, page: 1 }),
      ],
    ]);
  });
  it("keeps the range on civil days: six calendar months, exclusive end", () => {
    expect(defaultForecastRange(Temporal.PlainDate.from("2026-11-02"))).toEqual(
      { from: "2026-11-02", to: "2027-05-02" },
    );
    expect(defaultForecastRange(Temporal.PlainDate.from("2026-08-31"))).toEqual(
      { from: "2026-08-31", to: "2027-02-28" },
    );
  });
});

describe("funding source filter follows the URL", () => {
  it("opens on ?source=agency_forecast and sends it to the search", () => {
    state.search = "view=funding&source=agency_forecast";
    const html = renderToStaticMarkup(createElement(FundingOpportunities));
    expect(html).toMatch(/<option selected="">agency_forecast<\/option>/);
    expect(state.capiroInputs[0]?.query.source).toBe("agency_forecast");
  });
  it("ignores a source outside the wire contract", () => {
    state.search = "source=unknown_feed";
    const html = renderToStaticMarkup(createElement(FundingOpportunities));
    expect(html).not.toContain('selected="">unknown_feed');
    expect(html).toMatch(
      /<option (?:selected="" value=""|value="" selected="")>Source/,
    );
    expect(state.capiroInputs[0]?.query.source).toBeUndefined();
  });
});
