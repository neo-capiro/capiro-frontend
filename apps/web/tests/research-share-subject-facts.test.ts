import { describe, expect, it } from "vitest";
import {
  billSubjectSummary,
  frozenFact,
} from "@/features/modules/research-portfolios/share/subject-facts";

/**
 * The recipient dashboard shows only facts frozen into the published payload (requirement
 * 14f). These assertions pin the honesty rules: a bill's status comes from the snapshot, a
 * missing or malformed fact renders nothing, and nothing is inferred.
 */
describe("frozen subject facts on a published dashboard", () => {
  const facts = {
    jurisdiction: "US",
    session: "119",
    status: "reported",
    latestActionDate: "2026-09-10",
    fundingBasis: "not_applicable",
  };

  it("summarizes a bill from its frozen status and action date", () => {
    expect(billSubjectSummary(facts)).toBe("reported · action 2026-09-10");
    expect(billSubjectSummary({ status: "introduced" })).toBe("introduced");
  });

  it("renders nothing rather than inventing a status", () => {
    expect(billSubjectSummary(null)).toBeUndefined();
    expect(billSubjectSummary(undefined)).toBeUndefined();
    expect(billSubjectSummary({})).toBeUndefined();
    expect(billSubjectSummary({ status: "   " })).toBeUndefined();
    expect(billSubjectSummary({ status: 42 })).toBeUndefined();
    expect(billSubjectSummary("reported")).toBeUndefined();
    expect(billSubjectSummary(["reported"])).toBeUndefined();
  });

  it("reads only string facts, trimmed, from an object", () => {
    expect(frozenFact(facts, "session")).toBe("119");
    expect(frozenFact({ status: "  reported  " }, "status")).toBe("reported");
    expect(frozenFact({ status: { nested: "reported" } }, "status")).toBeUndefined();
    expect(frozenFact(facts, "fundingBasis")).toBe("not_applicable");
  });

  it("keeps a pre-capture member's row free of a fabricated status", () => {
    // Members stored before fact capture carry no facts at all.
    const legacy = { id: "m1", targetKind: "federal_bill", targetId: "119-hr-8800" };
    expect(billSubjectSummary(legacy)).toBeUndefined();
  });
});
