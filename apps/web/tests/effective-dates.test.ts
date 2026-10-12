import { expect, it } from "vitest";
import {
  effectiveDatePage,
  effectiveDateQuery,
  loadEffectiveDatePages,
} from "../src/shared/federal-register/effective-dates";
import { effectivePage, effectiveRecord } from "./effective-date-fixtures";
import { fetchEffectiveDates } from "../src/features/portfolio/calendar/effective-feed";
import { createApiClient } from "../src/shared/portfolio/api/http";
it("continues past an empty excluded page and preserves incomplete coverage", async () => {
  const pages: number[] = [];
  const result = await loadEffectiveDatePages(
    async (query) => {
      pages.push(query.page!);
      const p = effectivePage(query.dateFrom, query.dateTo, query.page);
      return query.page === 1
        ? {
            ...p,
            data: [],
            pagination: {
              totalCandidates: 2,
              returned: 0,
              excludedOnPage: 1,
              hasMoreCandidates: true,
            },
          }
        : p;
    },
    "2026-10-01",
    "2026-10-31",
  );
  expect(pages).toEqual([1, 2]);
  expect(result.records).toHaveLength(1);
  expect(result.warnings.join(" ")).toContain("coverage is incomplete");
  expect(result.warnings.join(" ")).toContain("1 excluded");
});
it.each(["2026-02-30", "2026-1-09", "2026-10-09T00:00:00Z"])(
  "refuses noncanonical date %s",
  (dateFrom) =>
    expect(
      effectiveDateQuery.safeParse({ dateFrom, dateTo: "2026-10-31" }).success,
    ).toBe(false),
);
it("refuses unsupported correction and mismatched official/projection identities", () => {
  for (const provenance of [
    { ...effectiveRecord.provenance, status: "correction_requires_review" },
    {
      ...effectiveRecord.provenance,
      officialPdfUrl:
        "https://www.govinfo.gov/content/pkg/FR-2026-10-01/pdf/2026-99999.pdf",
    },
    { ...effectiveRecord.provenance, date: "2026-10-10" },
    { ...effectiveRecord.provenance, sourceField: "publication_date" },
    {
      ...effectiveRecord.provenance,
      corrections: [
        "https://www.federalregister.gov/api/v1/documents/2026-99999.json",
      ],
    },
  ])
    expect(
      effectiveDatePage.safeParse({
        ...effectivePage(),
        data: [{ ...effectiveRecord, provenance }],
      }).success,
    ).toBe(false);
});
it.each(["stale", "future", "wrong-range", "repeated"])(
  "holds %s source evidence without substituting another date",
  async (mode) => {
    const reader = async () => {
      const p = effectivePage();
      if (mode === "stale") p.coverage.asOf = "2026-10-12T12:00:00.000Z";
      if (mode === "future") p.coverage.asOf = "2026-10-07T12:00:00.000Z";
      if (mode === "wrong-range") p.range.dateTo = "2026-11-01";
      if (mode === "repeated") {
        p.data.push(structuredClone(effectiveRecord));
        p.pagination.returned = 2;
      }
      return p;
    };
    await expect(
      loadEffectiveDatePages(reader, "2026-10-01", "2026-10-31"),
    ).rejects.toThrow();
  },
);
it("Portfolio uses Core date-only inclusive bounds and retains the provenance object", async () => {
  const calls: string[] = [];
  const api = createApiClient(async (input) => {
    calls.push(String(input));
    return Response.json(effectivePage());
  });
  const result = await fetchEffectiveDates(api, "2026-10-01", "2026-11-01");
  expect(calls).toEqual([
    "/api/backend/core/federal-register/effective-date-calendar?dateFrom=2026-10-01&dateTo=2026-10-31&page=1&limit=100",
  ]);
  expect(result.items[0]).toMatchObject({
    kind: "government",
    day: "2026-10-09",
    effectiveDate: effectiveRecord,
  });
  expect(result.items[0]!.startAt).toBeUndefined();
});
