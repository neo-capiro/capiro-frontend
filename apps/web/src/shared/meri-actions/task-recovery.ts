import { z } from "zod";
import { actionContextSchema, type ActionContext } from "./session-receipt";
import { sameJson } from "./correlation";
import {
  acknowledgeRecovery,
  discardUnexecutedTaskRecovery,
  retireUnexecutedTaskRecovery,
  readRecovery,
  readRecoveryDisposition,
  reserveRecovery,
  updateRecovery,
  withRecoveryCommandLock,
} from "../session/recovery/journal";

export type StandaloneTaskKind = "create" | "update";
/** A fresh admitted session may select a new run; the saved command keeps its original run. */
export function sameTaskConversation(
  original: ActionContext,
  current: ActionContext,
) {
  return (
    original.tenantId === current.tenantId &&
    original.actorId === current.actorId &&
    original.selectedClientId === current.selectedClientId &&
    original.conversationId === current.conversationId
  );
}
type Owner = Pick<ActionContext, "tenantId" | "actorId" | "selectedClientId">;
const schema = z.strictObject({
  requestId: z.uuid(),
  context: actionContextSchema,
  prepare: z.unknown(),
  prepared: z.unknown().optional(),
  preparedContext: actionContextSchema.optional(),
  executing: z.boolean(),
  notExecuted: z.unknown().optional(),
});
export type SavedTaskCommand = z.infer<typeof schema>;
const contract = {
  schema,
  requestId: (value: SavedTaskCommand) => value.requestId,
  validateUpdate(previous: SavedTaskCommand, next: SavedTaskCommand) {
    if (
      previous.requestId !== next.requestId ||
      !sameJson(previous.context, next.context) ||
      !sameJson(previous.prepare, next.prepare) ||
      (previous.prepared !== undefined &&
        (!sameJson(previous.prepared, next.prepared) ||
          !sameJson(
            previous.preparedContext ?? previous.context,
            next.preparedContext ?? next.context,
          ))) ||
      (previous.executing && !next.executing) ||
      (previous.notExecuted !== undefined &&
        !sameJson(previous.notExecuted, next.notExecuted)) ||
      (next.notExecuted !== undefined &&
        (!next.executing || next.prepared === undefined))
    )
      throw new Error("The original saved task command cannot change.");
  },
};

/** Exact standalone task wires in the existing encrypted journal; public receivers still own their shapes. */
export function standaloneTaskRecovery(
  kind: StandaloneTaskKind,
  owner: Owner,
  guard: () => void,
) {
  const scope = JSON.stringify([
    "meri-standalone-task-v1",
    kind,
    owner.tenantId,
    owner.actorId,
    owner.selectedClientId,
  ]);
  const check = (value: SavedTaskCommand) => {
    if (
      value.context.tenantId !== owner.tenantId ||
      value.context.actorId !== owner.actorId ||
      value.context.selectedClientId !== owner.selectedClientId
    )
      throw new Error(
        "Saved task context does not match the current account and client.",
      );
    if (
      value.preparedContext &&
      !sameTaskConversation(value.context, value.preparedContext)
    )
      throw new Error("Saved proposal conversation changed.");
    return value;
  };
  return {
    lock: <T>(action: () => Promise<T>) =>
      withRecoveryCommandLock(scope, guard, action),
    async load() {
      const value = await readRecovery(scope, contract, guard);
      return value ? check(value) : null;
    },
    async reserve(value: SavedTaskCommand) {
      check(value);
      const saved = await reserveRecovery(
        scope,
        value.requestId,
        value,
        contract,
        guard,
      );
      check(saved);
      if (!sameJson(saved, value))
        throw new Error(
          "A saved task command must be recovered before another can start.",
        );
      return saved;
    },
    async update(value: SavedTaskCommand) {
      check(value);
      await updateRecovery(scope, value.requestId, value, contract, guard);
      return value;
    },
    acknowledge: (value: SavedTaskCommand) =>
      acknowledgeRecovery(scope, check(value).requestId, guard),
    discard: (value: SavedTaskCommand) =>
      discardUnexecutedTaskRecovery(
        scope,
        check(value).requestId,
        contract,
        guard,
      ),
    retireNotExecuted: (value: SavedTaskCommand) =>
      retireUnexecutedTaskRecovery(
        scope,
        check(value).requestId,
        value.notExecuted,
        contract,
        guard,
      ),
    async discarded(requestId: string) {
      const disposition = await readRecoveryDisposition(
        scope,
        requestId,
        guard,
      );
      return (
        disposition?.state === "discarded" ||
        (disposition?.state === "refused" &&
          disposition.code === "TASK_EXECUTION_NOT_EXECUTED")
      );
    },
    async acknowledged(requestId: string) {
      return (
        (await readRecoveryDisposition(scope, requestId, guard))?.state ===
        "acknowledged"
      );
    },
  };
}
