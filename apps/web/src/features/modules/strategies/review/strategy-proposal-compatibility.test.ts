import { describe, expect, it } from "vitest";
import { strategyChangeSet } from "../../../../shared/capiro/operations/strategy-change-set";
import {
  classifyProposalOperations,
  isProposalSelectionValid,
  proposalActionAllowed,
  proposalOperationBasis,
  proposalSnapshot,
  selectableProposalIndexes,
} from "./proposal-operations";

const id = "51000000-0000-4000-8000-000000000001";
const otherId = "51000000-0000-4000-8000-000000000002";
const valid = {
  op: "update",
  title: "Synthetic recognized step",
  sources: [{ section: "Synthetic", ref: "original" }],
};
const ops = [
  { op: "synthetic-unrecognized", original: { nested: [1, null] } },
  { op: "remove", nodeId: id },
  valid,
  null,
  { op: 3 },
  { title: "Missing discriminator" },
  "text",
  [],
  { op: "add", title: 4 },
  { op: "update", sources: [{ section: null }] },
];
function proposal(extra: Record<string, unknown> = {}) {
  return strategyChangeSet.parse({
    id,
    strategyId: id,
    summary: "Synthetic original audit",
    ops,
    risk: "low",
    status: "proposed",
    strategyVersionId: id,
    appliedVersionId: null,
    createdAt: "2026-10-14T12:00:00Z",
    appliedAt: null,
    approvedAt: null,
    ...extra,
  });
}

describe("Strategy proposal display and selection boundaries", () => {
  it("classifies unsupported entries without removing, rewriting or renumbering them", () => {
    const rows = classifyProposalOperations(ops);
    expect(rows).toHaveLength(ops.length);
    expect(rows.map((row) => row.index)).toEqual([
      0, 1, 2, 3, 4, 5, 6, 7, 8, 9,
    ]);
    expect(rows.map((row) => row.raw)).toEqual(ops);
    expect(rows.map((row) => row.state)).toEqual([
      "unsupported",
      "supported",
      "supported",
      "unsupported",
      "unsupported",
      "unsupported",
      "unsupported",
      "unsupported",
      "unsupported",
      "unsupported",
    ]);
    rows.forEach((row, index) => expect(row.raw).toBe(ops[index]));
    expect(selectableProposalIndexes(ops)).toEqual([1, 2]);
  });
  it("admits only nonempty unique integer indexes of recognized operations", () => {
    expect(isProposalSelectionValid(ops, [2])).toBe(true);
    expect(isProposalSelectionValid(ops, [2, 1])).toBe(true);
    for (const indexes of [[], [0], [1, 0], [-1], [10], [1, 1], [1.5], [NaN]])
      expect(isProposalSelectionValid(ops, indexes)).toBe(false);
  });
  it("keeps Approve original indexes and Apply compact approved indexes", () => {
    const approved = proposal({ status: "approved", approvedOps: [valid] });
    expect(proposalOperationBasis(approved, "approve")).toEqual(ops);
    expect(proposalOperationBasis(approved, "apply")).toEqual([valid]);
    expect(
      isProposalSelectionValid(proposalOperationBasis(approved, "apply"), [0]),
    ).toBe(true);
    expect(
      isProposalSelectionValid(proposalOperationBasis(approved, "apply"), [2]),
    ).toBe(false);
    expect(approved.ops[0]).toEqual(ops[0]);
    expect(approved.ops[2]).toEqual(valid);
  });
  it("honors an empty approved array and uses original ops only for null/omission", () => {
    expect(
      proposalOperationBasis(proposal({ approvedOps: [] }), "apply"),
    ).toEqual([]);
    expect(
      proposalActionAllowed(
        proposal({ status: "approved", approvedOps: [] }),
        "apply",
        [1],
      ),
    ).toBe(false);
    for (const approvedOps of [undefined, null])
      expect(
        proposalOperationBasis(proposal({ approvedOps }), "apply"),
      ).toEqual(ops);
  });
  it("does not select unsupported operations in an approved basis", () => {
    const current = proposal({
      status: "approved",
      approvedOps: [ops[0], valid],
    });
    expect(
      selectableProposalIndexes(proposalOperationBasis(current, "apply")),
    ).toEqual([1]);
    expect(proposalActionAllowed(current, "apply", [0])).toBe(false);
    expect(proposalActionAllowed(current, "apply", [1])).toBe(true);
  });
  it.each([
    ["proposed", true, true, true, false],
    ["approved", false, true, true, false],
    ["applied", false, false, false, true],
    ["rejected", false, false, false, false],
    ["undone", false, false, false, false],
    ["stale", false, false, false, false],
    ["superseded", false, false, false, false],
  ])(
    "retains status-gated decisions for %s",
    (status, approve, apply, reject, undo) => {
      const current = proposal({ status });
      expect(proposalActionAllowed(current, "approve", [2])).toBe(approve);
      expect(proposalActionAllowed(current, "apply", [2])).toBe(apply);
      expect(proposalActionAllowed(current, "reject", [])).toBe(reject);
      expect(proposalActionAllowed(current, "undo", [])).toBe(undo);
    },
  );
  it("retains Reject for an unsupported-only proposal while denying execution", () => {
    const current = proposal({ ops: [ops[0], null] });
    expect(selectableProposalIndexes(current.ops)).toEqual([]);
    expect(proposalActionAllowed(current, "approve", [0])).toBe(false);
    expect(proposalActionAllowed(current, "apply", [0])).toBe(false);
    expect(proposalActionAllowed(current, "reject", [])).toBe(true);
  });
  it("invalidates same-ID selection identity when content, status, pin or approved basis changes", () => {
    const initial = proposal();
    expect(proposalSnapshot(proposal())).toBe(proposalSnapshot(initial));
    for (const current of [
      proposal({ ops: [ops[0], { ...valid, title: "Replacement step" }] }),
      proposal({ status: "approved" }),
      proposal({ strategyVersionId: otherId }),
      proposal({ approvedOps: [valid] }),
      proposal({ approvedOps: [] }),
    ]) {
      expect(current.id).toBe(initial.id);
      expect(proposalSnapshot(current)).not.toBe(proposalSnapshot(initial));
    }
  });
});
