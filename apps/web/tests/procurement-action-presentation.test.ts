import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { ProcurementActionDetail } from "@capiro/shared/defense-procurement";
import fixture from "./fixtures/procurement-action-details-native.json";
import {
  ProcurementActionTable,
  filterProcurementActions,
} from "../src/features/modules/intelligence/research/ProcurementActionTable";

// Captured from the closed app-role SQL projection on the explicitly synthetic local fixture.
const actions = fixture.actionDetails as ProcurementActionDetail[];

describe("qualified action presentation", () => {
  it("uses the same fiscal and vendor subset as the displayed groups", () => {
    const groups = fixture.groups.filter(
      (group) =>
        group.fiscalYear === 2025 && group.vendorKey === "uei:ABC123456DEF",
    );
    const selected = filterProcurementActions(actions, groups);
    expect(selected.map((action) => action.modificationNumber)).toEqual([
      "P00001",
      "P00002",
    ]);
    expect(
      selected.every((action) => action.submittingAgencyCode === "9700"),
    ).toBe(true);
    expect(filterProcurementActions(actions, [])).toEqual([]);
  });
  it("keeps source funding and contracting organizations distinct and shows signed obligations", () => {
    const html = renderToStaticMarkup(
      createElement(ProcurementActionTable, { actions }),
    );
    expect(html).toContain("Funding organization");
    expect(html).toContain("Contracting organization");
    expect(html).toContain("1200-FUNDING");
    expect(html).toContain("2100-CONTRACT");
    expect(html).toContain("-$500,000.00");
    expect(html).toContain("P00002");
    expect(html).toContain("Unknown");
  });
});
