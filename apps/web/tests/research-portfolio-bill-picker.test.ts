import { describe, expect, it } from "vitest";
import {
  billTargets,
  isBillTargetKind,
} from "@/features/modules/research-portfolios/members/member-discovery";
import type { ResearchBillSearchResponse } from "@/shared/capiro/operations/research-bills";

/**
 * The member picker must not let a user add a bill they cannot distinguish. These
 * assertions are about what the user sees *before* adding: the server identity is
 * carried verbatim, and jurisdiction/session travel with it.
 */
const response: ResearchBillSearchResponse = {
  items: [
    {
      targetKind: "state_bill",
      targetId: "CA-20252026-HB123",
      identifier: "HB 123",
      title: "Defense innovation procurement",
      jurisdiction: "CA",
      session: "2025-2026",
      status: "committee",
      latestActionDate: "2026-04-01",
      latestActionText: "Referred to committee.",
      sourceUrl: null,
      matchReason: "exact_identifier",
    },
    {
      targetKind: "state_bill",
      targetId: "TX-20252026-HB123",
      identifier: "HB 123",
      title: "Defense innovation procurement",
      jurisdiction: "TX",
      session: "2025-2026",
      status: "introduced",
      latestActionDate: "2026-02-03",
      latestActionText: null,
      sourceUrl: null,
      matchReason: "title",
    },
    {
      targetKind: "federal_bill",
      targetId: "119-hr-8800",
      identifier: "H.R. 8800",
      title: "Defense Appropriations",
      jurisdiction: "US",
      session: "119",
      status: "reported",
      latestActionDate: "2026-09-10",
      latestActionText: null,
      sourceUrl: null,
      matchReason: "exact_identifier",
    },
  ],
  nextCursor: null,
  coverage: {
    federal: "searched",
    state: "searched",
    statesWithData: ["CA", "TX"],
    note: "test",
  },
};

describe("bill member picker targets", () => {
  it("keeps identically numbered bills from two states as two distinct choices", () => {
    const targets = billTargets(response, "state_bill");

    expect(targets).toHaveLength(2);
    expect(targets.map((target) => target.id)).toEqual([
      "CA-20252026-HB123",
      "TX-20252026-HB123",
    ]);
    // Both read "HB 123"; only the detail distinguishes them.
    expect(targets[0]?.label).toBe(targets[1]?.label);
    expect(targets[0]?.detail).toContain("CA");
    expect(targets[1]?.detail).toContain("TX");
  });

  it("states the jurisdiction and session the identity depends on", () => {
    const [ca] = billTargets(response, "state_bill");
    expect(ca?.detail).toContain("CA");
    expect(ca?.detail).toContain("session 2025-2026");
    expect(ca?.detail).toContain("committee");
  });

  it("never mixes federal and state results in one list", () => {
    expect(billTargets(response, "federal_bill").map((target) => target.id)).toEqual([
      "119-hr-8800",
    ]);
    expect(billTargets(response, "state_bill")).toHaveLength(2);
  });

  it("returns nothing for a non-bill kind or an absent response", () => {
    expect(billTargets(response, "award")).toEqual([]);
    expect(billTargets(response, "program_element")).toEqual([]);
    expect(billTargets(undefined, "state_bill")).toEqual([]);
  });

  it("carries the server targetId verbatim instead of rebuilding it", () => {
    const [ca] = billTargets(response, "state_bill");
    expect(ca?.id).toBe("CA-20252026-HB123");
    expect(ca?.kind).toBe("state_bill");
  });

  it("names the bill kinds the catalog serves", () => {
    expect(isBillTargetKind("federal_bill")).toBe(true);
    expect(isBillTargetKind("state_bill")).toBe(true);
    expect(isBillTargetKind("program_element")).toBe(false);
    expect(isBillTargetKind("award")).toBe(false);
  });
});
