import { expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import {
  basisKey,
  selectWidgetDashboard,
  WidgetContent,
} from "../src/features/modules/research-portfolios/share/DashboardWidgets";
import type {
  ResearchDashboardWidget,
  ResearchShareDashboard,
} from "../src/shared/capiro/operations/research-share-schemas";
const basis = {
  fundingFiscalYear: 2027,
  stage: "requested",
  metric: "budget_authority",
  unit: "usd_millions",
  currency: "USD",
  priceBasis: null,
  requestEdition: "FY2027",
  knownAt: null,
};
const later = { ...basis, fundingFiscalYear: 2028 };
const data = {
  totals: [
    { basis, value: "100.01", contributionCount: 2 },
    { basis: later, value: "4", contributionCount: 1 },
  ],
  contributions: [
    {
      contributionId: "one",
      memberId: "m1",
      disposition: "included",
      basis,
      value: "40.01",
      sourceRevisionIds: ["r1"],
    },
    {
      contributionId: "two",
      memberId: "m2",
      disposition: "included",
      basis,
      value: "60",
      sourceRevisionIds: ["r2"],
    },
    {
      contributionId: "three",
      memberId: "m1",
      disposition: "included",
      basis: later,
      value: "4",
      sourceRevisionIds: ["r3"],
    },
    {
      contributionId: "excluded",
      memberId: "m1",
      disposition: "excluded",
      basis,
      value: "900",
      sourceRevisionIds: ["r4"],
    },
  ],
  subjects: [
    { id: "m1", disposition: "included" },
    { id: "m2", disposition: "included" },
    { id: "private", disposition: "excluded" },
  ],
  sources: ["r1", "r2", "r3", "r4"].map((id) => ({ id, sourceRevisionId: id })),
  comparison: null,
  limitations: [],
  changes: [],
  clientFit: null,
  coverage: { eligibleMembers: 2, supportedMembers: 2 },
};
const dashboard = { data } as unknown as ResearchShareDashboard;
it("renders frozen purpose and qualified fit basis without opaque fingerprint dumps", () => {
  const frozen: ResearchShareDashboard = {
    ...dashboard,
    portfolioName: "Synthetic portfolio",
    portfolioPurpose: "Synthetic frozen purpose",
    preparedFor: { clientName: "Synthetic client" },
    branding: null,
    asOf: "2026-10-27T00:00:00Z",
    data: {
      ...dashboard.data,
      clientFit: {
        availability: "partial",
        fitScore: 50,
        refreshedAt: null,
        basis: {
          scoreBasis: "direct_qualified_pe_association_share",
          totalIncludedMemberCount: 4,
          supportedMemberCount: 2,
          matchedMemberCount: 1,
          limitations: ["Two subjects lack support."],
          basisFingerprint: "opaque-not-for-display",
        },
      },
    },
  };
  const header = renderToStaticMarkup(
    WidgetContent({ widget: widget("header", {}), dashboard: frozen }),
  );
  expect(header).toContain("Synthetic frozen purpose");
  const fit = renderToStaticMarkup(
    WidgetContent({ widget: widget("client_fit", {}), dashboard: frozen }),
  );
  expect(fit).toContain("Partial evidence");
  expect(fit).toContain("direct qualified program-element association");
  expect(fit).toContain("Supported subjects");
  expect(fit).toContain("Two subjects lack support.");
  expect(fit).not.toContain("opaque-not-for-display");
});
function widget(
  kind: ResearchDashboardWidget["kind"],
  settings: Record<string, unknown>,
): ResearchDashboardWidget {
  return { id: "widget", kind, x: 0, y: 0, w: 6, h: 3, settings };
}
it("uses the exact eight-field financial basis and selects existing totals without adding or recomputing", () => {
  expect(basisKey(basis)).toBe(
    JSON.stringify([
      2027,
      "requested",
      "budget_authority",
      "usd_millions",
      "USD",
      null,
      "FY2027",
      null,
    ]),
  );
  const result = selectWidgetDashboard(
    widget("key_totals", { basisKey: basisKey(basis), subjectIds: ["m1"] }),
    dashboard,
  );
  expect(result.data.totals).toEqual([data.totals[0]]);
  expect(result.data.totals[0]).toBe(data.totals[0]);
  expect(result.data.totals[0]!.value).toBe("100.01");
});
it("filters funding by exact member identity and basis, with explicit empty different from all", () => {
  const settings = {
    subjectIds: ["m1"],
    fundingFiscalYear: 2027,
    basisKey: basisKey(basis),
  };
  expect(
    selectWidgetDashboard(
      widget("funding_table", settings),
      dashboard,
    ).data.contributions.map((row) => row.contributionId),
  ).toEqual(["one"]);
  expect(
    selectWidgetDashboard(
      widget("funding_table", { subjectIds: [] }),
      dashboard,
    ).data.contributions,
  ).toEqual([]);
  expect(
    selectWidgetDashboard(widget("funding_table", {}), dashboard).data
      .contributions,
  ).toHaveLength(3);
  expect(
    selectWidgetDashboard(
      widget("funding_table", { subjectIds: ["foreign"] }),
      dashboard,
    ).data.contributions,
  ).toEqual([]);
});
it("traces selected evidence through included contribution source revisions and preserves frozen input", () => {
  const result = selectWidgetDashboard(
    widget("sources", { subjectIds: ["m1"], fundingFiscalYear: 2027 }),
    dashboard,
  );
  expect(result.data.sources.map((source) => source.id)).toEqual(["r1"]);
  expect(dashboard.data.sources).toHaveLength(4);
  expect(
    selectWidgetDashboard(widget("subjects", { subjectIds: [] }), dashboard)
      .data.subjects,
  ).toEqual([]);
});
it("applies compatible-basis filtering to comparison current rows and yields an empty unmatched selection", () => {
  expect(
    selectWidgetDashboard(
      widget("snapshot_comparison", { fundingFiscalYear: 2028 }),
      dashboard,
    ).data.totals,
  ).toEqual([data.totals[1]]);
  expect(
    selectWidgetDashboard(
      widget("key_totals", { basisKey: "not-captured" }),
      dashboard,
    ).data.totals,
  ).toEqual([]);
});
