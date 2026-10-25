import { z } from "zod";
import {
  receiveRoutinesRequest,
  receiveRoutinesResponse,
  type RoutinesPrepareRequest,
  type RoutinesProposal,
  type RoutinesApproveRequest,
  type RoutinesReconcileRequest,
} from "@capiro/meri-contracts/routines-application";
import { actionContextSchema } from "../meri-actions/session-receipt";
import { sameJson } from "../meri-actions/correlation";
import {
  acknowledgeRecovery,
  readRecovery,
  readRecoveryDisposition,
  reserveRecovery,
  updateRecovery,
  withRecoveryCommandLock,
  discardUnapprovedRoutineRecovery,
} from "../session/recovery/journal";

export const routineContextSchema = actionContextSchema.extend({
  selectedClientId: z.uuid().nullable(),
});
export type RoutineContext = z.infer<typeof routineContextSchema>;
const savedSchema = z.strictObject({
  requestId: z.uuid(),
  context: routineContextSchema,
  prepare: z.unknown(),
  proposal: z.unknown().optional(),
  approving: z.boolean(),
  result: z
    .strictObject({
      route: z.enum(["approve", "reconcile"]),
      value: z.unknown(),
    })
    .optional(),
});
type Stored = z.infer<typeof savedSchema>;
export type SavedRoutine = Omit<Stored, "prepare" | "proposal"> & {
  prepare: RoutinesPrepareRequest;
  proposal?: RoutinesProposal;
};
export type RoutineOwner = Pick<
  RoutineContext,
  "tenantId" | "actorId" | "selectedClientId"
>;
export function routineDecision(value: SavedRoutine): RoutinesReconcileRequest {
  if (!value.proposal)
    throw new Error("The exact routine proposal is unavailable.");
  return {
    operation: value.prepare.operation,
    request: value.prepare.request,
    proposalId: value.proposal.proposalId,
    intentSha256: value.proposal.intentSha256,
  } as RoutinesReconcileRequest;
}
export const routineApproval = (value: SavedRoutine): RoutinesApproveRequest =>
  ({
    ...routineDecision(value),
    decision: "approved",
  }) as RoutinesApproveRequest;

/** Stored wires are re-admitted through the public contract, never trusted as current authority. */
export async function receiveSavedRoutine(raw: Stored): Promise<SavedRoutine> {
  const prepare = await receiveRoutinesRequest(
    "prepare",
    JSON.stringify(raw.prepare),
  );
  if (prepare.requestId !== raw.requestId)
    throw new Error("Saved routine identity changed.");
  const result: SavedRoutine = { ...raw, prepare, proposal: undefined };
  if (raw.proposal !== undefined) {
    const admitted = await receiveRoutinesResponse(
      "prepare",
      200,
      JSON.stringify({ status: "approval_required", proposal: raw.proposal }),
      { request: prepare },
    );
    if ("error" in admitted)
      throw new Error("Saved routine proposal is unavailable.");
    const owner = admitted.proposal.projection.owner;
    if (
      owner.tenantId !== raw.context.tenantId ||
      owner.actorId !== raw.context.actorId
    )
      throw new Error("Saved routine owner changed.");
    result.proposal = admitted.proposal;
  }
  if (raw.approving && !result.proposal)
    throw new Error("Saved routine approval is incomplete.");
  if (raw.result) {
    if (!result.proposal || !raw.approving)
      throw new Error("Saved routine result is incomplete.");
    const response =
      raw.result.route === "approve"
        ? await receiveRoutinesResponse(
            "approve",
            200,
            JSON.stringify(raw.result.value),
            { request: routineApproval(result), proposal: result.proposal },
          )
        : await receiveRoutinesResponse(
            "reconcile",
            200,
            JSON.stringify(raw.result.value),
            { request: routineDecision(result), proposal: result.proposal },
          );
    if (
      "error" in response ||
      !("status" in response
        ? response.status === "acknowledged"
        : response.outcome === "ACKNOWLEDGED")
    )
      throw new Error("The saved routine result does not confirm this change.");
  }
  return result;
}
const contract = {
  schema: savedSchema,
  requestId: (value: Stored) => value.requestId,
  validateUpdate(previous: Stored, next: Stored) {
    if (
      previous.requestId !== next.requestId ||
      !sameJson(previous.context, next.context) ||
      !sameJson(previous.prepare, next.prepare) ||
      (previous.proposal !== undefined &&
        !sameJson(previous.proposal, next.proposal)) ||
      (previous.approving && !next.approving) ||
      (previous.result !== undefined && !sameJson(previous.result, next.result))
    )
      throw new Error("The original routine request cannot change.");
  },
};

/** One existing encrypted-journal slot for a dedicated editor or one retained chat proposal. */
export function routineRecovery(
  owner: RoutineOwner,
  guard: () => void,
  proposalId?: string,
) {
  const scope = JSON.stringify([
    "meri-routine-v1",
    owner.tenantId,
    owner.actorId,
    proposalId ? ["proposal", proposalId] : ["client", owner.selectedClientId],
  ]);
  const check = async (raw: Stored) => {
    const value = await receiveSavedRoutine(raw);
    if (
      value.context.tenantId !== owner.tenantId ||
      value.context.actorId !== owner.actorId ||
      value.context.selectedClientId !== owner.selectedClientId ||
      (proposalId && value.proposal?.proposalId !== proposalId)
    )
      throw new Error("Saved routine belongs to another account or scope.");
    return value;
  };
  return {
    lock: <T>(action: () => Promise<T>) =>
      withRecoveryCommandLock(scope, guard, action),
    async load() {
      const value = await readRecovery(scope, contract, guard);
      return value ? check(value) : null;
    },
    async reserve(value: SavedRoutine) {
      await check(value);
      return check(
        await reserveRecovery(scope, value.requestId, value, contract, guard),
      );
    },
    async update(value: SavedRoutine) {
      await check(value);
      await updateRecovery(scope, value.requestId, value, contract, guard);
      return value;
    },
    acknowledge: (value: SavedRoutine) =>
      acknowledgeRecovery(scope, value.requestId, guard),
    discard: (value: SavedRoutine) =>
      discardUnapprovedRoutineRecovery(scope, value.requestId, contract, guard),
    disposition: (requestId: string) =>
      readRecoveryDisposition(scope, requestId, guard),
  };
}
