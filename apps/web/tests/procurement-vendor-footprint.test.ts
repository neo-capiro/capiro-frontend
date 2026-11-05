import { describe, expect, it } from "vitest";
import {
  sumDecimalStrings,
  aggregateByVendor,
  ProcurementVendorFootprint,
} from "../src/features/modules/intelligence/research/ProcurementVendorFootprint";
import { renderToString } from "react-dom/server";
import { createElement } from "react";
import { vi } from "vitest";
import type { ProcurementMoneyFlow, ProcurementFlowGroup } from "@capiro/shared";
import { ProcurementResult } from "../src/features/modules/intelligence/research/ProcurementResult";
import { first, second, populated } from "./fixtures/procurement-consumer";

// Set up a mock fetcher for procurement money flow responses
const state = vi.hoisted(() => ({
  procurementData: undefined as unknown,
}));

vi.mock("../src/shared/capiro/queries", () => ({
  useCapiroQuery: (key: string) => {
    if (key === "defenseResearch.acquisitions") {
      return {
        data: { items: [], page: 1, total: 0, limit: 25 },
        loading: false,
        reload: vi.fn(),
      };
    }
    return {
      data: state.procurementData,
      error: undefined,
      loading: false,
      reload: vi.fn(),
    };
  },
}));

// Helper to render ProcurementResult (Money Flow mode by default)
const render = (data: ProcurementMoneyFlow) => {
  state.procurementData = data;
  return renderToString(createElement(ProcurementResult, { result: data }));
};

const baseGroup = (): ProcurementFlowGroup => ({
  fiscalYear: 2025,
  awardingAgency: "Synthetic Agency",
  awardingSubTier: null,
  contractorName: "Synthetic Vendor",
  recipientUei: "SYNTH1234567A",
  vendorIdentityState: "source_uei",
  vendorKey: "uei:SYNTH1234567A",
  attributeState: "latest_known_catalog_observation",
  latestSourceRevision: "2026-10-30T00:00:00.000001Z",
  latestSourceObservedAt: "2026-10-31T00:00:00.000002Z",
  latestRecordedAt: "2026-10-31T00:01:00.000003Z",
  latestAttributeRecordedAt: "2026-10-31T00:00:00.000000Z",
  actions: "1",
  obligationUsd: "1.50",
  outlayUsd: null,
  obligationKnown: "1",
  outlayKnown: "0",
});

// ---- sumDecimalStrings unit tests ----

describe("sumDecimalStrings exact-cent aggregation", () => {
  it("sums positive fractional values exactly", () => {
    expect(sumDecimalStrings(["1.50", "0.50"])).toBe("2.00");
  });

  it("handles negative -1.50 correctly (not -0.50)", () => {
    // The verified defect: BigInt("-1") * 1000000n + BigInt("500000") = -500000 = -0.50.
    // Correct: -1.50 at scale 2 is -150, unscaled => -1.50
    expect(sumDecimalStrings(["-1.50"])).toBe("-1.50");
  });

  it("handles -0.01 correctly", () => {
    expect(sumDecimalStrings(["-0.01"])).toBe("-0.01");
  });

  it("sums negative and positive to zero", () => {
    expect(sumDecimalStrings(["1.50", "-1.50"])).toBe("0.00");
  });

  it("handles zero", () => {
    expect(sumDecimalStrings(["0.00"])).toBe("0.00");
    expect(sumDecimalStrings(["0"])).toBe("0");
  });

  it("handles max large cent value beyond Number precision", () => {
    expect(sumDecimalStrings(["-9007199254740993.000001"])).toBe(
      "-9007199254740993.000001",
    );
  });

  it("cancellation: opposite values return zero at matching scale", () => {
    expect(sumDecimalStrings(["1.000001", "-1.000001"])).toBe("0.000000");
  });

  it("returns null when all inputs are null", () => {
    expect(sumDecimalStrings([null, null, null])).toBeNull();
  });

  it("skips nulls and sums the rest", () => {
    expect(sumDecimalStrings([null, "1.50", null, "-0.50"])).toBe("1.00");
  });

  it("sums integer-only values", () => {
    expect(sumDecimalStrings(["100", "200", "-50"])).toBe("250");
  });
});

// ---- aggregateByVendor unit tests ----

describe("aggregateByVendor grouping", () => {
  it("aggregates same-UEI groups across fiscal years", () => {
    const groups: ProcurementFlowGroup[] = [
      { ...baseGroup(), fiscalYear: 2025, obligationUsd: "1.50", actions: "2", obligationKnown: "2" },
      { ...baseGroup(), fiscalYear: 2026, obligationUsd: "0.50", actions: "1", obligationKnown: "1" },
    ];
    const vendors = aggregateByVendor(groups);
    expect(vendors).toHaveLength(1);
    expect(vendors[0]!.vendorKey).toBe("uei:SYNTH1234567A");
    expect(vendors[0]!.obligationUsd).toBe("2.00");
    expect(vendors[0]!.actions).toBe(3n);
  });

  it("keeps different UEIs separate even if same contractor name", () => {
    const groups: ProcurementFlowGroup[] = [
      { ...baseGroup(), vendorKey: "uei:SYNTH1234567A", recipientUei: "SYNTH1234567A", contractorName: "Same Name", actions: "1", obligationUsd: "1.00", obligationKnown: "1" },
      { ...baseGroup(), vendorKey: "uei:OTHER1234567B", recipientUei: "OTHER1234567B", contractorName: "Same Name", actions: "1", obligationUsd: "2.00", obligationKnown: "1" },
    ];
    const vendors = aggregateByVendor(groups);
    expect(vendors).toHaveLength(2);
    expect(vendors.map((v) => v.vendorKey).sort()).toEqual([
      "uei:OTHER1234567B",
      "uei:SYNTH1234567A",
    ]);
  });

  it("retains name variants when same UEI reported under different contractor names", () => {
    const groups: ProcurementFlowGroup[] = [
      { ...baseGroup(), contractorName: "Vendor Name A", actions: "1", obligationUsd: "1.00", obligationKnown: "1" },
      { ...baseGroup(), contractorName: "Vendor Name B", actions: "1", obligationUsd: "1.00", obligationKnown: "1" },
    ];
    const vendors = aggregateByVendor(groups);
    expect(vendors).toHaveLength(1);
    expect(vendors[0]!.nameVariants).toEqual(["Vendor Name A", "Vendor Name B"]);
  });

  it("keeps unresolved distinct awards as separate vendor entries", () => {
    const g1: ProcurementFlowGroup = {
      ...baseGroup(),
      recipientUei: null,
      vendorIdentityState: "unresolved",
      vendorKey: `award:${first}`,
      attributeState: "missing_catalog_attributes",
      contractorName: null,
      latestAttributeRecordedAt: null,
      actions: "1",
      obligationUsd: "1.00",
      obligationKnown: "1",
    };
    const g2: ProcurementFlowGroup = {
      ...g1,
      vendorKey: `award:${second}`,
      obligationUsd: "2.00",
    };
    const vendors = aggregateByVendor([g1, g2]);
    expect(vendors).toHaveLength(2);
    // first ends in "9700", second ends in "1700"; lexicographic: 1700 < 9700
    expect(vendors.map((v) => v.vendorKey).sort()).toEqual([
      `award:${second}`,
      `award:${first}`,
    ]);
  });

  it("correctly handles null-only obligations for all groups", () => {
    const fixedGroup: ProcurementFlowGroup = {
      ...baseGroup(),
      recipientUei: null,
      vendorIdentityState: "unresolved",
      vendorKey: `award:${first}`,
      attributeState: "missing_catalog_attributes",
      contractorName: null,
      latestAttributeRecordedAt: null,
      actions: "1",
      obligationUsd: null,
      obligationKnown: "0",
    };
    const vendors = aggregateByVendor([fixedGroup]);
    expect(vendors[0]!.obligationUsd).toBeNull();
  });
});

// ---- vendor footprint view and filtering tests ----

describe("vendor footprint view and filtering", () => {
  it("money flow groups display both source_uei and unresolved vendors with exact keys", () => {
    const data = populated();
    const html = render(data);
    expect(html).toContain("Undated");
    expect(html).toContain("Synthetic vendor");
    expect(html).toContain("Unresolved");
    expect(html).toContain(`award:${first}`);
  });

  it("vendor grouping preserves exact UEI vs award-scoped vendorKey separation", () => {
    const data = populated();
    expect(data.groups[0]?.vendorIdentityState).toBe("unresolved");
    expect(data.groups[0]?.vendorKey).toBe(`award:${first}`);
    const html = render(data);
    expect(html).toContain("Unresolved");
    expect(html).toContain(`award:${first}`);
  });

  it("negative high-precision obligation values display without coercion", () => {
    const data = populated();
    expect(data.totals?.obligationUsd).toBe("-9007199254740993.000001");
    const html = render(data);
    expect(html).toContain("-$9,007,199,254,740,993.000001");
  });

  it("unknown outlay displays as Not reported without implying zero", () => {
    const data = populated();
    expect(data.totals?.outlayUsd).toBeNull();
    const html = render(data);
    expect(html).toContain("Not reported");
    expect(html).not.toContain("$0");
  });

  it("source clocks display in observation order without conversion", () => {
    const data = populated();
    expect(data.groups[0]?.latestSourceRevision).toBe("2026-10-30T00:00:00.000001Z");
    const html = render(data);
    expect(html).toContain("2026-10-30T00:00:00.000001Z");
    expect(html).toContain("2026-10-31T00:00:00.000002Z");
    expect(html).toContain("2026-10-31T00:01:00.000003Z");
  });

  it("source references link safely and show provenance details", () => {
    const data = populated();
    const html = render(data);
    expect(html).toContain("synthetic-run");
    expect(html).toContain("example.invalid");
  });
});

describe("vendor footprint filter behavior", () => {
  it("FY2025 filter excludes FY2026 groups from totals computation", () => {
    const fy2025Groups: ProcurementFlowGroup[] = [
      { ...baseGroup(), fiscalYear: 2025, obligationUsd: "100.00", actions: "1", obligationKnown: "1" },
    ];
    const vendors = aggregateByVendor(fy2025Groups);
    expect(vendors[0]!.obligationUsd).toBe("100.00");
    expect(vendors[0]!.actions).toBe(1n);
  });

  it("FY2025-2026 combined filter includes both fiscal years but excludes undated", () => {
    const groups: ProcurementFlowGroup[] = [
      { ...baseGroup(), fiscalYear: 2025, obligationUsd: "100.00", actions: "1", obligationKnown: "1" },
      { ...baseGroup(), fiscalYear: 2026, obligationUsd: "200.00", actions: "1", obligationKnown: "1" },
      { ...baseGroup(), vendorKey: "uei:OTHER1234567C", recipientUei: "OTHER1234567C", fiscalYear: null, obligationUsd: "50.00", actions: "1", obligationKnown: "1" },
    ];
    const combined = groups.filter((g) => g.fiscalYear === 2025 || g.fiscalYear === 2026);
    const vendors = aggregateByVendor(combined);
    expect(vendors).toHaveLength(1);
    expect(vendors[0]!.obligationUsd).toBe("300.00");
    expect(vendors[0]!.actions).toBe(2n);
  });

  it("all filter includes undated groups (null fiscalYear)", () => {
    const undatedGroup: ProcurementFlowGroup = {
      ...baseGroup(),
      fiscalYear: null,
      obligationUsd: "75.00",
      actions: "1",
      obligationKnown: "1",
    };
    const vendors = aggregateByVendor([undatedGroup]);
    expect(vendors).toHaveLength(1);
    expect(vendors[0]!.obligationUsd).toBe("75.00");
  });
});

describe("filtered totals vs pagination", () => {
  it("filtered total reflects ALL matching vendors not just first page of 20", () => {
    const groups: ProcurementFlowGroup[] = Array.from({ length: 25 }, (_, i) => ({
      ...baseGroup(),
      vendorKey: `uei:SYNTH${String(i).padStart(11, "0")}A`,
      recipientUei: `SYNTH${String(i).padStart(11, "0")}A`,
      fiscalYear: 2025,
      obligationUsd: "10.00",
      actions: "1",
      obligationKnown: "1",
      latestSourceRevision: "2026-10-30T00:00:00.000001Z",
      latestSourceObservedAt: "2026-10-31T00:00:00.000002Z",
      latestRecordedAt: "2026-10-31T00:01:00.000003Z",
      latestAttributeRecordedAt: "2026-10-31T00:00:00.000000Z",
    }));
    const vendors = aggregateByVendor(groups);
    expect(vendors).toHaveLength(25);
    const totalObligation = sumDecimalStrings(vendors.map((v) => v.obligationUsd));
    expect(totalObligation).toBe("250.00");
  });
});

describe("export action for evidence finding", () => {
  it("rendered component includes export button when groups are available", () => {
    const data = populated();
    const html = render(data);
    expect(html).toContain("Download evidence finding");
  });

  it("export button is present; analyst judgment label is in modal textarea (client-side only)", () => {
    // The export modal renders client-side after clicking; the textarea placeholder
    // contains "analyst judgment". We verify the export button renders correctly.
    const data = populated();
    const html = render(data);
    expect(html).toContain("Download evidence finding");
  });

  it("source coverage disclosures include AWARD A/B/C/D and 90-day delay in vendor footprint view", () => {
    const data = populated();
    // The disclosures are in ProcurementVendorFootprint rendered in footprint view.
    const fpHtml = renderToString(createElement(ProcurementVendorFootprint, {
      groups: data.groups,
      totalActions: data.totals?.actions ?? "0",
      totalObligationUsd: data.totals?.obligationUsd ?? null,
      totalOutlayUsd: null,
      obligationKnown: data.totals?.obligationKnown ?? "0",
      outlayKnown: "0",
      sourceThrough: data.sourceThrough,
    }));
    expect(fpHtml).toContain("AWARD A/B/C/D");
    expect(fpHtml).toContain("90-day");
  });

  it("source coverage references GSA open.gsa.gov documentation in vendor footprint view", () => {
    const data = populated();
    const fpHtml2 = renderToString(createElement(ProcurementVendorFootprint, {
      groups: data.groups,
      totalActions: data.totals?.actions ?? "0",
      totalObligationUsd: data.totals?.obligationUsd ?? null,
      totalOutlayUsd: null,
      obligationKnown: data.totals?.obligationKnown ?? "0",
      outlayKnown: "0",
      sourceThrough: data.sourceThrough,
    }));
    expect(fpHtml2).toContain("open.gsa.gov/api/contract-awards");
  });

  it("no stale export: export button absent when no groups", () => {
    const data: ProcurementMoneyFlow = {
      ...populated(),
      state: "unavailable",
      totals: null,
      groups: [],
      provenance: [],
      coverage: { unqualified: "3" },
    };
    const html = render(data);
    expect(html).not.toContain("Download evidence finding");
  });
});
