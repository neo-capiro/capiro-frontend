import { z } from "zod";
import type { QueryClient } from "@tanstack/react-query";
import type { ApiClient } from "@/shared/portfolio/api/http";
import {
  assertClientWriter,
  type ClientWriter,
} from "@/shared/portfolio/auth/client-writer";
import { verifyCoreWriter } from "@/shared/portfolio/auth/verify-writer";
import {
  acknowledgeRecovery,
  readRecovery,
  reserveRecovery,
  updateRecovery,
  retireObjectiveFailureRecovery,
  withRecoveryCommandLock,
} from "@/shared/session/recovery/journal";
import {
  objectiveGenerationAccepted,
  objectiveGenerationRequest,
  requireObjectiveGeneration,
  type ObjectiveGenerationAccepted,
  type ObjectiveGenerationRequest,
} from "@/shared/capiro/operations/objective-generation";
import { scopedObjectivesSchema } from "./contracts";

const record = z
  .object({
    request: objectiveGenerationRequest,
    accepted: objectiveGenerationAccepted.optional(),
  })
  .strict()
  .refine((v) => {
    try {
      if (v.accepted) requireObjectiveGeneration(v.accepted, v.request);
      return true;
    } catch {
      return false;
    }
  }, "Saved generation recovery does not match its request.");
export type RetainedGeneration = z.infer<typeof record>;
const contract = {
  schema: record,
  requestId: (v: RetainedGeneration) => v.request.requestId,
  validateUpdate(previous: RetainedGeneration, next: RetainedGeneration) {
    if (
      JSON.stringify(previous.request) !== JSON.stringify(next.request) ||
      (previous.accepted &&
        (!next.accepted ||
          previous.accepted.jobId !== next.accepted.jobId ||
          previous.accepted.objectiveGeneration.source.objectiveRevisionId !==
            next.accepted.objectiveGeneration.source.objectiveRevisionId))
    )
      throw new Error("The saved generation request identity changed.");
    const old = previous.accepted?.objectiveGeneration.result;
    if (
      old &&
      JSON.stringify(old) !==
        JSON.stringify(next.accepted?.objectiveGeneration.result)
    )
      throw new Error("A completed generation receipt changed.");
  },
};
export interface GenerationRecovery {
  guard(): void;
  authorize(signal: AbortSignal): Promise<void>;
  load(): Promise<RetainedGeneration | null>;
  reserve(request: ObjectiveGenerationRequest): Promise<RetainedGeneration>;
  save(value: RetainedGeneration): Promise<void>;
  retire(
    value: ObjectiveGenerationAccepted,
    request: ObjectiveGenerationRequest,
  ): Promise<void>;
  lock<T>(action: () => Promise<T>): Promise<T>;
}
export function createGenerationRecovery(
  api: ApiClient,
  cache: QueryClient,
  actor: ClientWriter,
  selected: { clientId: string; id: string; version: number },
): GenerationRecovery {
  const scope = JSON.stringify([
    "objective-generation-v1",
    actor.tenantId,
    actor.userId,
    selected.clientId,
    selected.id,
    selected.version,
  ]);
  const guard = () => assertClientWriter(cache, actor);
  return {
    guard,
    async authorize(signal) {
      const assert = () => {
        signal.throwIfAborted();
        guard();
      };
      await verifyCoreWriter(api, actor, signal, assert);
      const values = await api.request(
        "core",
        `clients/${selected.clientId}/objectives`,
        scopedObjectivesSchema(selected.clientId),
        { signal },
      );
      assert();
      const current = values.find(
        (v) => v.id === selected.id && v.version === selected.version,
      );
      if (!current || current.status !== "ready")
        throw new Error(
          "This saved Objective is no longer ready at the selected version. Refresh it before continuing.",
        );
    },
    load: () => readRecovery(scope, contract, guard),
    reserve: (request) =>
      reserveRecovery(scope, request.requestId, { request }, contract, guard),
    save: (value) =>
      updateRecovery(scope, value.request.requestId, value, contract, guard),
    async retire(value, request) {
      requireObjectiveGeneration(value, request);
      const parsed = objectiveGenerationAccepted.parse(value);
      if (parsed.status === "completed")
        return acknowledgeRecovery(scope, request.requestId, guard);
      const code = parsed.objectiveGeneration.failure?.code;
      if (
        parsed.status !== "failed" ||
        !code ||
        code === "OBJECTIVE_GENERATION_OUTCOME_UNCONFIRMED"
      )
        throw new Error(
          "The generation outcome must be confirmed before starting another request.",
        );
      return retireObjectiveFailureRecovery(
        scope,
        request.requestId,
        code,
        guard,
      );
    },
    lock: (action) => withRecoveryCommandLock(scope, guard, action),
  };
}
