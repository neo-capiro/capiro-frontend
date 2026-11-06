import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { legiwatchImpactOperations } from "../src/shared/capiro/operations/legiwatch-impact";
import {
  impactContextSchema,
  impactDetailSchema,
  impactPageSchema,
} from "../src/shared/capiro/operations/legiwatch-impact-schemas";
import { assertImpactAssociation } from "../src/features/portfolio/bill-tracker/impact-queries";
import { BillImpactEvidence } from "../src/features/portfolio/bill-tracker/BillImpactEvidence";
import { BillSourceDetails } from "../src/features/portfolio/bill-tracker/BillSourceDetails";
import { billStatusLabel } from "../src/features/portfolio/bill-tracker/impact-presentation";
import {
  BillResults,
  impactRowKey,
} from "../src/features/portfolio/bill-tracker/BillResults";
import {
  impactDetail,
  impactPage,
  impactRow,
  otherSyntheticClient,
} from "./legiwatch-impact-fixtures";

describe("canonical LegiWatch tracker contract", () => {
  it("defaults to a Core all-client read and never admits browser actor authority", () => {
    const operation = legiwatchImpactOperations["legiwatch.tracker"];
    expect(operation.service).toBe("core");
    expect(operation.path).toBe("/legiwatch/tracker");
    expect(operation.request.parse({ query: { limit: 25 } })).toEqual({
      query: { limit: 25 },
    });
    expect(
      operation.request.safeParse({ query: { actorId: "invented" } }).success,
    ).toBe(false);
  });
  it("retains duplicate bills belonging to different clients and exact unknown values", () => {
    const a = impactRow(),
      b = impactRow({
        clientId: otherSyntheticClient,
        passageProbability: null,
        stage: null,
      });
    const page = impactPageSchema.parse(impactPage([a, b]));
    expect(impactRowKey(page.rows[0]!)).not.toBe(impactRowKey(page.rows[1]!));
    expect(page.rows[1]!.passageProbability).toBeNull();
    expect(page.rows[1]!.stage).toBeNull();
  });
  it("refuses inconsistent pagination and unsafe source links", () => {
    expect(
      impactPageSchema.safeParse({ ...impactPage(), hasMore: true }).success,
    ).toBe(false);
    const detail = impactDetail();
    detail.versions[0]!.sourceUrl = "javascript:alert(1)";
    expect(impactDetailSchema.safeParse(detail).success).toBe(false);
  });
  it("rejects detail and mutation receipts for another client or bill", () => {
    const detail = impactDetail();
    expect(() =>
      assertImpactAssociation(detail, otherSyntheticClient, detail.row.billId),
    ).toThrow("did not match");
    expect(() =>
      assertImpactAssociation(detail, detail.row.clientId, "another-bill"),
    ).toThrow("did not match");
    expect(
      assertImpactAssociation(detail, detail.row.clientId, detail.row.billId),
    ).toBe(detail);
  });
  it("keeps analyst decisions separate from exposure and analysis source fields", () => {
    expect(
      impactContextSchema.parse({
        position: "oppose",
        priority: "high",
        analystNote: "Review suppliers",
      }).position,
    ).toBe("oppose");
    expect(
      impactContextSchema.safeParse({
        position: "negative",
        priority: "high",
        analystNote: null,
      }).success,
    ).toBe(false);
    expect(
      impactContextSchema.safeParse({
        position: null,
        priority: null,
        analystNote: null,
        impact: "positive",
      }).success,
    ).toBe(false);
    expect(
      legiwatchImpactOperations["legiwatch.impact.analyze"].request.safeParse({
        params: { clientId: "a", billId: "b" },
        body: { findings: [] },
      }).success,
    ).toBe(false);
  });
  it("accepts queued analysis without inventing a completed finding", () => {
    const detail = impactDetail();
    detail.refresh = {
      state: "queued",
      requestedAt: "2026-11-06T12:00:00Z",
      nextCheckAt: null,
      errorCode: null,
    };
    detail.row.impact = {
      ...detail.row.impact,
      status: "needs_evidence",
      findings: [],
      analyzedAt: null,
    };
    const parsed = impactDetailSchema.parse(detail);
    expect(parsed.refresh?.state).toBe("queued");
    expect(parsed.row.impact.findings).toEqual([]);
  });
});

describe("source-backed impact presentation", () => {
  it("keeps the overall direction visible even without individual findings", () => {
    const impact = {
      ...impactRow().impact,
      direction: "negative" as const,
      findings: [],
    };
    const html = renderToStaticMarkup(
      createElement(BillImpactEvidence, { impact }),
    );
    expect(html).toContain("Negative");
    expect(html).toContain("medium");
    expect(html).not.toContain("synthetic-model");
  });
  it("formats source status and civil dates and preserves structured facts without duplicating their quotation", () => {
    expect(billStatusLabel("passed_chamber")).toBe("Passed one chamber");
    expect(billStatusLabel("committee")).toBe("In committee");
    expect(billStatusLabel(null)).toBe("Status unavailable");
    const detail = impactDetail();
    detail.actions[0]!.date = "2026-09-14 00:00:00+00";
    const value = JSON.stringify({
      productName: "Synthetic sensor",
      supplier_origin: null,
      priorities: ["Domestic supply"],
    });
    detail.clientFacts[0]!.value = value;
    detail.clientFacts[0]!.citations = [
      { ...detail.row.impact.findings[0]!.provisions[0]!, quote: value },
    ];
    const html = renderToStaticMarkup(
      createElement(BillSourceDetails, { detail }),
    );
    expect(html).toContain("Sep 14, 2026");
    expect(html).not.toContain("00:00:00+00");
    expect(html).toContain("Product Name");
    expect(html).toContain("Supplier origin");
    expect(html).toContain("Unknown");
    expect(html.match(/Synthetic sensor/g)).toHaveLength(1);
    expect(html).toContain("profile-v2");
    expect(html).toContain("<summary>Source revision</summary>");
  });
  it("shows conditional mechanism, source quotations, revisions, uncertainty and next action", () => {
    const html = renderToStaticMarkup(
      createElement(BillImpactEvidence, { impact: impactRow().impact }),
    );
    for (const text of [
      "Applies if",
      "Supplier origin is not recorded",
      "Section 4",
      "sha256-synthetic-version",
      "Verified client profile",
      "Next action",
      "Confirm component supplier locations",
      "medium confidence",
    ])
      expect(html).toContain(text);
    expect(html).toContain('href="https://example.test/bill/text"');
    expect(html).toContain("Source link unavailable");
  });
  it.each(["needs_evidence", "unavailable"] as const)(
    "shows %s honestly without fabricating positive impact",
    (status) => {
      const impact = {
        ...impactRow().impact,
        status,
        summary: "Evidence unavailable",
        findings: [],
        direction: "uncertain" as const,
        analyzedAt: null,
      };
      const html = renderToStaticMarkup(
        createElement(BillImpactEvidence, { impact }),
      );
      expect(html).toContain(
        status === "needs_evidence"
          ? "More evidence is needed"
          : "analysis is unavailable",
      );
      expect(html).not.toContain("Domestic component requirement");
    },
  );
  it("makes client associations visible in the shared module table", () => {
    const rows = [
      impactRow(),
      impactRow({
        clientId: otherSyntheticClient,
        clientName: "Synthetic Energy",
      }),
    ];
    const html = renderToStaticMarkup(
      createElement(BillResults, {
        rows,
        showClient: true,
        view: "table",
        onOpen: () => {},
      }),
    );
    expect(html).toContain("Synthetic Aerospace");
    expect(html).toContain("Synthetic Energy");
    expect(html).not.toContain("0%");
    const client = renderToStaticMarkup(
      createElement(BillResults, {
        rows: [rows[0]!],
        showClient: false,
        view: "table",
        onOpen: () => {},
      }),
    );
    expect(client).not.toContain(">Client</th>");
  });
});
