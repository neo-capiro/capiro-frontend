import { expect, it } from "vitest";
import { loadHearingCalendar } from "../src/shared/capiro/operations/legiwatch-calendar-feed";
import {
  coverage,
  federalHearing,
  floridaHearing,
} from "../test/browser/hearing-fixtures";

it("loads both jurisdictions through later pages", async () => {
  const requests: number[] = [];
  const result = await loadHearingCalendar(
    async (query) => {
      requests.push(query.page!);
      expect(query.jurisdiction).toBe("ALL");
      return {
        rows: [query.page === 1 ? federalHearing : floridaHearing],
        total: 2,
        page: query.page!,
        pageSize: 1,
      };
    },
    async () => coverage,
    { jurisdiction: "ALL", from: "2026-10-01", to: "2026-10-31" },
  );
  expect(requests).toEqual([1, 2]);
  expect(result.rows.map((row) => row.geographicJurisdiction)).toEqual([
    "US",
    "FL",
  ]);
  expect(result.warnings.join(" ")).toContain(
    "Florida calendar sources are incomplete",
  );
});

it("keeps received hearings but reports a stalled or failed later page", async () => {
  for (const failure of ["empty", "repeated", "error"]) {
    const result = await loadHearingCalendar(
      async (query) => {
        if (query.page === 2 && failure === "error")
          throw new Error("Synthetic unavailable page");
        return {
          rows: query.page === 2 && failure === "empty" ? [] : [federalHearing],
          total: 2,
          page: query.page!,
          pageSize: 1,
        };
      },
      async () => ({ rows: [], asOf: coverage.asOf }),
      {},
    );
    expect(result.rows).toEqual([federalHearing]);
    expect(result.warnings.join(" ")).toContain("incomplete");
    expect(result.warnings.join(" ")).toContain("No Florida source coverage");
  }
});

it("does not hide successful hearings when source coverage is unavailable", async () => {
  const result = await loadHearingCalendar(
    async () => ({ rows: [federalHearing], total: 1, page: 1, pageSize: 200 }),
    async () => {
      throw new Error("Synthetic coverage failure");
    },
    {},
  );
  expect(result.rows).toEqual([federalHearing]);
  expect(result.warnings.join(" ")).toContain("could not be checked");
});
