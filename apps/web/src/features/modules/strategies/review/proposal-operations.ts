import {
  planEditSchema,
  type PlanEdit,
  type StrategyChangeSet,
} from "../../../../shared/capiro/operations/strategy-change-set";

export type ProposalDecision = "approve" | "apply" | "reject" | "undo";
type StoredOperation = StrategyChangeSet["ops"][number];
export type ProposalOperation =
  | { index: number; raw: StoredOperation; state: "supported"; edit: PlanEdit }
  | { index: number; raw: StoredOperation; state: "unsupported" };

/** Reading a stored proposal never establishes backend executable validity. */
export function classifyProposalOperations(ops: StrategyChangeSet["ops"]) {
  return ops.map((raw, index): ProposalOperation => {
    const parsed = planEditSchema.safeParse(raw);
    return parsed.success
      ? { index, raw, state: "supported", edit: parsed.data }
      : { index, raw, state: "unsupported" };
  });
}

export function proposalOperationBasis(
  proposal: StrategyChangeSet,
  decision: "approve" | "apply",
) {
  return decision === "apply"
    ? (proposal.approvedOps ?? proposal.ops)
    : proposal.ops;
}

export function selectableProposalIndexes(ops: StrategyChangeSet["ops"]) {
  return classifyProposalOperations(ops)
    .filter((operation) => operation.state === "supported")
    .map((operation) => operation.index);
}

export function isProposalSelectionValid(
  ops: StrategyChangeSet["ops"],
  indexes: readonly number[],
) {
  const supported = new Set(selectableProposalIndexes(ops));
  return (
    indexes.length > 0 &&
    new Set(indexes).size === indexes.length &&
    indexes.every((index) => Number.isInteger(index) && supported.has(index))
  );
}

/** Local view identity only; the backend owns status, plan pin and authorization. */
export function proposalSnapshot(proposal: StrategyChangeSet) {
  return JSON.stringify(proposal);
}

export function proposalActionAllowed(
  proposal: StrategyChangeSet,
  decision: ProposalDecision,
  indexes: readonly number[] = [],
) {
  if (decision === "undo") return proposal.status === "applied";
  const reviewable =
    proposal.status === "proposed" || proposal.status === "approved";
  if (decision === "reject") return reviewable;
  return (
    (decision === "approve" ? proposal.status === "proposed" : reviewable) &&
    isProposalSelectionValid(
      proposalOperationBasis(proposal, decision),
      indexes,
    )
  );
}

export function proposalOperationTitle(operation: ProposalOperation) {
  return operation.state === "supported"
    ? (operation.edit.title ?? `${operation.edit.op} step`)
    : "Unsupported change";
}
