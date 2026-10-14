import { describe, expect, it } from "vitest";
import { strategiesAgentOperations } from "./operations/strategies-agents";
import {
  planEditSchema,
  strategyChangeSet,
} from "./operations/strategy-change-set";

const id = "51000000-0000-4000-8000-000000000001";
const mixedOps = [
  {
    op: "synthetic-unrecognized",
    title: "Opaque stored action",
    extra: { a: [1, null] },
  },
  { title: "Missing discriminator" },
  { op: 17 },
  null,
  "stored text",
  ["nested", { op: "update" }],
  { op: "update", title: 42 },
  { op: "remove", sources: [{ section: 9 }] },
  {
    op: "update",
    title: "Recognized change",
    note: null,
    sources: [{ section: "Synthetic", ref: "fixture" }],
  },
];
function proposal(extra: Record<string, unknown> = {}) {
  return {
    id,
    strategyId: id,
    summary: "Synthetic mixed proposal",
    ops: mixedOps,
    risk: "low",
    status: "proposed",
    strategyVersionId: id,
    appliedVersionId: null,
    createdAt: "2026-10-14T12:00:00Z",
    appliedAt: null,
    approvedAt: null,
    ...extra,
  };
}

describe("Stored Strategy operations remain readable without becoming executable", () => {
  it("preserves every JSON entry, raw field, original order and approved subset", () => {
    const input = proposal({ approvedOps: [mixedOps[8]] });
    const parsed = strategyChangeSet.parse(input);
    expect(parsed.ops).toEqual(mixedOps);
    expect(parsed.ops).toHaveLength(9);
    expect(parsed.approvedOps).toEqual([mixedOps[8]]);
    expect(parsed.ops[0]).toEqual(mixedOps[0]);
  });
  it.each([undefined, null, []])(
    "preserves optional/null/empty approval basis %j",
    (approvedOps) => {
      const parsed = strategyChangeSet.parse(proposal({ approvedOps }));
      expect(parsed.approvedOps).toEqual(approvedOps);
    },
  );
  it("accepts the same readable proposal shape for list, approve and reject", () => {
    const input = proposal({ approvedOps: [mixedOps[8]], status: "approved" });
    expect(
      strategiesAgentOperations["strategies.proposals"].response.parse([
        input,
      ])[0]?.ops,
    ).toEqual(mixedOps);
    for (const key of [
      "strategies.proposal.approve",
      "strategies.proposal.reject",
    ] as const) {
      const result = strategiesAgentOperations[key].response.parse(input);
      expect(result.ops).toEqual(mixedOps);
      expect(result.approvedOps).toEqual([mixedOps[8]]);
    }
  });
  it("keeps exactly the existing four executable operation discriminators", () => {
    for (const op of ["add", "update", "remove", "retime"])
      expect(planEditSchema.safeParse({ op }).success).toBe(true);
    for (const raw of mixedOps.slice(0, 8))
      expect(planEditSchema.safeParse(raw).success).toBe(false);
    expect(
      planEditSchema.safeParse({ op: "synthetic-unrecognized" }).success,
    ).toBe(false);
    expect(planEditSchema.safeParse({ op: "UPDATE" }).success).toBe(false);
  });
  it.each([
    { id: "invalid" },
    { strategyId: "invalid" },
    { strategyVersionId: "invalid" },
    { risk: "unknown" },
    { status: "unknown" },
    { summary: null },
    { ops: {} },
    { approvedOps: {} },
    { ops: [undefined] },
    { ops: [NaN] },
    { ops: [() => "not JSON"] },
  ])(
    "still rejects invalid proposal envelopes and non-JSON operations %j",
    (invalid) => {
      expect(strategyChangeSet.safeParse(proposal(invalid)).success).toBe(
        false,
      );
    },
  );
  it("retains strict mutation envelopes and selected integer indexes", () => {
    for (const key of [
      "strategies.proposal.approve",
      "strategies.proposal.apply",
    ] as const) {
      const request = strategiesAgentOperations[key].request;
      expect(
        request.safeParse({ params: { id }, body: { opIndexes: [2] } }).success,
      ).toBe(true);
      expect(
        request.safeParse({ params: { id }, body: { opIndexes: ["2"] } })
          .success,
      ).toBe(false);
      expect(
        request.safeParse({ params: { id }, body: { opIndexes: [-1] } })
          .success,
      ).toBe(false);
      expect(
        request.safeParse({
          params: { id },
          body: { opIndexes: [2], tenantId: id },
        }).success,
      ).toBe(false);
    }
  });
});
