import { describe, expect, it, vi } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  clientSearchSchema,
  type OpportunitySearch,
} from "../src/features/portfolio/opportunities/contracts";
import { OpportunitiesPage } from "../src/features/portfolio/opportunities/OpportunitiesPage";
import {
  opportunityLink,
  opportunityAmount,
  opportunityDate,
  pageWorkflowCounts,
  boundedPage,
} from "../src/features/portfolio/opportunities/presentation";
import { opportunity, opportunitySearch, clientId } from "./browser/fixtures";
const observed = vi.hoisted(() => ({
  data: undefined as OpportunitySearch | undefined,
}));
vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(),
  useRouter: () => ({ push: vi.fn() }),
}));
vi.mock("../src/features/portfolio/opportunities/queries", () => ({
  useMatchedOpportunities: () => ({
    data: observed.data,
    isSuccess: true,
    isPending: false,
    isFetching: false,
    error: null,
  }),
  useRelevantPrograms: () => ({
    data: { data: [], total: 0, page: 1, limit: 20 },
    isSuccess: true,
    isPending: false,
    isFetching: false,
    error: null,
  }),
}));
describe("client opportunity contracts", () => {
  it("rejects a different client's search or bookmark instead of presenting it", () => {
    const schema = clientSearchSchema(clientId, 1);
    expect(schema.safeParse(opportunitySearch).success).toBe(true);
    expect(
      schema.safeParse({ ...opportunitySearch, clientId: "another" }).success,
    ).toBe(false);
    expect(
      schema.safeParse({
        ...opportunitySearch,
        opportunities: [
          {
            ...opportunity,
            decoration: {
              ...opportunity.decoration,
              bookmark: {
                ...opportunity.decoration.bookmark,
                clientId: "another",
              },
            },
          },
        ],
      }).success,
    ).toBe(false);
    expect(
      clientSearchSchema(clientId, 2).safeParse(opportunitySearch).success,
    ).toBe(false);
  });
  it("does not infer currency, missing workflow totals or timezone shifts for civil dates", () => {
    expect(opportunityAmount({ value: 123, valueBasis: "source_backed" })).toBe(
      "Source amount 123",
    );
    expect(
      opportunityAmount({ value: 123, valueBasis: "not_stated_by_source" }),
    ).toBe("Value not stated");
    expect(opportunityDate("2026-10-24")).toContain("24");
    expect(opportunityDate("2026-10-24")).not.toContain("23");
    expect(
      pageWorkflowCounts([{ ...opportunity, decoration: undefined }]),
    ).toEqual({ pursuing: null, saved: null });
    expect(boundedPage("-2")).toBe(1);
    expect(boundedPage("1.5")).toBe(1);
  });
  it("encodes opaque source IDs and preserves client scope in existing Module links", () => {
    const result = opportunityLink("http://127.0.0.1", clientId, {
      source: "sam_gov",
      sourceRecordId: "abc/def?x=1",
    });
    expect(result).toContain("/sam_gov/abc%2Fdef%3Fx%3D1?");
    expect(new URL(result).searchParams.get("clientId")).toBe(clientId);
    expect(new URL(result).searchParams.get("mode")).toBe("matched");
  });
});

describe("available opportunities are not mislabeled as proven matches", () => {
  function renderResult(raw: unknown) {
    observed.data = clientSearchSchema(clientId, 1).parse(raw);
    return renderToStaticMarkup(
      createElement(OpportunitiesPage, {
        clientId,
        destinations: { existingApp: "https://example.test" },
      }),
    );
  }
  const unscored = {
    ...opportunitySearch,
    total: 11886,
    counts: { ...opportunitySearch.counts, active: 11886 },
    opportunities: [
      {
        ...opportunity,
        relevanceScore: null,
        matchedSignals: [],
        decoration: {
          ...opportunity.decoration,
          workflow: { available: true, status: null, unavailableReason: null },
        },
      },
    ],
    profileGaps: { items: [], actualUnscoredCount: 11886 },
  };
  it("preserves the server unscored count and renders truthful population/workflow labels", () => {
    const html = renderResult(unscored);
    expect(observed.data?.profileGaps?.actualUnscoredCount).toBe(11886);
    expect(html).toContain("Available active opportunities");
    expect(html).not.toContain("Active matched opportunities");
    expect(html).toContain(
      "11,886 available results have no relevance score for this client.",
    );
    expect(html).toContain("No saved workflow status");
    expect(html).toContain("Page 1");
    expect(html).toContain("11,886");
    expect(html).toContain("clientId=" + clientId);
  });
  it.each([null, undefined, 0])(
    "does not invent an unscored count for %s",
    (actualUnscoredCount) => {
      const html = renderResult({
        ...unscored,
        profileGaps: { items: [], actualUnscoredCount },
      });
      expect(html).not.toContain("available results have no relevance score");
    },
  );
  it.each([-1, 1.5, "11886"])(
    "rejects malformed server unscored count %s",
    (actualUnscoredCount) => {
      expect(
        clientSearchSchema(clientId, 1).safeParse({
          ...unscored,
          profileGaps: { items: [], actualUnscoredCount },
        }).success,
      ).toBe(false);
    },
  );
  it("preserves saved workflow, missing-workflow and catalog-health disclosure", () => {
    expect(renderResult(opportunitySearch)).toContain("pursuing");
    const html = renderResult({
      ...opportunitySearch,
      catalogComplete: false,
      opportunities: [{ ...opportunity, decoration: undefined }],
    });
    expect(html).toContain("Workflow unavailable");
    expect(html).toContain("Some catalogs are incomplete or out of date.");
  });
});
