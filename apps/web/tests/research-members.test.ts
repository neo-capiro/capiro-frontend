import { describe, expect, it } from "vitest";
import {
  memberAwards,
  memberSearch,
  researchMemberDiscoveryOperations,
} from "../src/shared/capiro/operations/research-member-discovery";
import {
  awardTargets,
  researchTargets,
  unresolvedMember,
} from "../src/features/modules/research-portfolios/members/member-discovery";
import { researchMember } from "../src/shared/capiro/operations/research-schemas";

const uuid = "30000000-0000-4000-8000-000000000001";
const hit = (type: string, id: string) => ({
  subject: { type, id, label: "Synthetic match" },
  secondaryLabel: null,
  matchKind: "canonical_name",
  score: null,
  explanation: {
    queryTerm: "synthetic",
    matchedFields: ["title"],
    rationale: "Matched title",
    negativeControls: [],
  },
  availability: "available",
  evidence: [],
});
const response = (items: object[]) =>
  memberSearch.parse({
    query: "synthetic",
    expansion: {
      original: "synthetic",
      normalized: "synthetic",
      terms: [],
      excludedTerms: [],
      applied: false,
    },
    exact: { status: "available", reason: null, items },
    capability: { status: "available", reason: null, items },
    semantic: { status: "disabled", reason: "Skipped", items: [] },
    limitations: [],
  });

describe("native member discovery contracts", () => {
  it("keeps canonical PE codes and UUID families, deduplicates lanes and refuses unrelated identities", () => {
    const search = response([
      hit("program_element", "0601234A"),
      hit("program", uuid),
      hit("program", "external-name"),
      hit("acquisition", uuid),
      hit("office", uuid),
    ]);
    expect(
      researchTargets(search, "program_element").map((row) => row.id),
    ).toEqual(["0601234A"]);
    expect(researchTargets(search, "program").map((row) => row.id)).toEqual([
      uuid,
    ]);
    expect(researchTargets(search, "award")).toEqual([]);
  });
  it("uses the FederalAward row UUID and never its PIID as target identity", () => {
    const awards = memberAwards.parse({
      total: 1,
      rows: [
        {
          id: uuid,
          piid: "PIID-EXTERNAL",
          contractorName: "Synthetic contractor",
          awardingAgency: "Synthetic agency",
          description: null,
          raw: { secret: "stripped" },
        },
      ],
    });
    expect(awardTargets(awards)[0]).toMatchObject({ kind: "award", id: uuid });
    expect(awards.rows[0]).not.toHaveProperty("raw");
    expect(() =>
      memberAwards.parse({
        total: 1,
        rows: [{ ...awards.rows[0], id: "PIID-EXTERNAL" }],
      }),
    ).toThrow();
  });
  it("keeps semantic discovery disabled and requires the canonical resolve contract", () => {
    const search =
      researchMemberDiscoveryOperations["research.members.search"].request;
    expect(
      search.safeParse({ query: { q: "budget", semanticEnabled: false } })
        .success,
    ).toBe(true);
    expect(
      search.safeParse({ query: { q: "budget", semanticEnabled: true } })
        .success,
    ).toBe(false);
    expect(
      researchMemberDiscoveryOperations[
        "research.members.resolve"
      ].request.safeParse({
        params: { id: uuid, memberId: uuid },
        body: {
          expectedRevision: 2,
          idempotencyKey: "key",
          targetKind: "acquisition",
          targetId: uuid,
        },
      }).success,
    ).toBe(false);
  });
  it("preserves unresolved metadata after exclusion so it cannot bypass canonical resolution", () => {
    const row = researchMember.parse({
      id: uuid,
      targetKind: "program",
      targetId: "unresolved-import",
      label: null,
      disposition: "excluded",
      reason: "Set aside",
      unresolvedInput: { name: "Synthetic imported label" },
      resolvedAt: null,
      revision: 2,
      updatedAt: "2026-10-27T12:00:00.000Z",
    });
    expect(unresolvedMember(row)).toBe(true);
    expect(unresolvedMember({ ...row, unresolvedInput: null })).toBe(false);
  });
});
