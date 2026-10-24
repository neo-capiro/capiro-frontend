import { z } from "zod";
import { objectiveGenerationReceipt } from "@/shared/capiro/operations/objective-generation";
import { receiveObjectiveGenerationStartResponse } from "@capiro/meri-contracts/objective-generation";
import type { QueryClient } from "@tanstack/react-query";
import type { ApiClient } from "@/shared/portfolio/api/http";
import { verifyCoreWriter } from "@/shared/portfolio/auth/verify-writer";
import {
  assertClientWriter,
  type ClientWriter,
} from "@/shared/portfolio/auth/client-writer";
import { clientSchema } from "@/shared/session/client-contract";
import {
  readRecovery,
  reserveRecovery,
  updateRecovery,
  withRecoveryCommandLock,
} from "@/shared/session/recovery/journal";
import { governedObjectiveGenerationObservation } from "@/shared/capiro/operations/objective-governed-generation";
import {
  governedObjectiveStrategyIntakeRequest,
  governedObjectiveStrategyIntakeResponse,
  requireGovernedObjectiveStrategyIntakeReceipt,
  type GovernedObjectiveStrategyIntakeRequest,
} from "@/shared/capiro/operations/objective-governed-strategy-intake";
import { scopedObjectivesSchema, type Objective } from "./contracts";
import type {
  StrategyIntakeClient,
  StrategyIntakeObjective,
} from "./objective-strategy-intake-source";
import { requireInitialStrategyIntakeSource } from "./objective-strategy-intake-source";

const retainedSchema = z
  .strictObject({
    request: governedObjectiveStrategyIntakeRequest,
    origin: governedObjectiveGenerationObservation,
    accepted: governedObjectiveStrategyIntakeResponse.optional(),
    started: z.unknown().optional(),
    result: objectiveGenerationReceipt.shape.result.unwrap().optional(),
  })
  .refine((value) => {
    try {
      const request = value.request;
      const origin = requireInitialStrategyIntakeSource(
        value.origin,
        {
          clientId: request.params.clientId,
          id: request.params.objectiveId,
          status: "ready",
          version: request.body.command.expectedObjectiveVersion,
        },
        { id: request.params.clientId, status: "active" },
      );
      if (
        origin.requestedSource.canonicalBindingVersion !==
        request.body.command.expectedCanonicalBindingVersion
      )
        return false;
      if (value.accepted)
        requireGovernedObjectiveStrategyIntakeReceipt(
          value.accepted,
          value.request,
          value.origin,
        );
      if (value.started !== undefined) {
        if (!value.accepted) return false;
        const receipt = receiveObjectiveGenerationStartResponse(
          202,
          JSON.stringify(value.started),
          value.accepted.generationJobId,
        );
        if ("error" in receipt) return false;
      }
      if (value.result && !value.accepted) return false;
      return true;
    } catch {
      return false;
    }
  }, "Retained Strategy intake does not match its original request.");
export type RetainedStrategyIntake = z.infer<typeof retainedSchema>;
const contract = {
  schema: retainedSchema,
  requestId: (value: RetainedStrategyIntake) =>
    value.request.body.command.requestId,
  validateUpdate(
    previous: RetainedStrategyIntake,
    next: RetainedStrategyIntake,
  ) {
    if (
      JSON.stringify(previous.request) !== JSON.stringify(next.request) ||
      JSON.stringify(previous.origin) !== JSON.stringify(next.origin) ||
      (previous.accepted &&
        JSON.stringify(previous.accepted) !== JSON.stringify(next.accepted)) ||
      (previous.started !== undefined &&
        JSON.stringify(previous.started) !== JSON.stringify(next.started)) ||
      (previous.result !== undefined &&
        JSON.stringify(previous.result) !== JSON.stringify(next.result))
    )
      throw new Error("The retained Strategy intake changed.");
  },
};

export interface StrategyIntakeRecovery {
  guard(): void;
  authorize(signal: AbortSignal): Promise<Objective>;
  load(): Promise<RetainedStrategyIntake | null>;
  reserve(
    request: GovernedObjectiveStrategyIntakeRequest,
    origin: RetainedStrategyIntake["origin"],
  ): Promise<RetainedStrategyIntake>;
  save(value: RetainedStrategyIntake): Promise<void>;
  lock<T>(action: () => Promise<T>): Promise<T>;
}

/** An actor+Objective fence survives ready-version changes and browser reloads. */
export function createStrategyIntakeRecovery(
  api: ApiClient,
  cache: QueryClient,
  actor: ClientWriter,
  selected: StrategyIntakeObjective,
  currentSelection: () => {
    objective: StrategyIntakeObjective;
    client: StrategyIntakeClient | null;
  },
): StrategyIntakeRecovery {
  const scope = JSON.stringify([
    "objective-strategy-intake-v2",
    actor.tenantId,
    actor.userId,
    selected.clientId,
    selected.id,
  ]);
  function guard() {
    assertClientWriter(cache, actor);
    const live = currentSelection();
    if (
      !live.client ||
      live.client.id !== selected.clientId ||
      live.client.status === "archived" ||
      live.objective.clientId !== selected.clientId ||
      live.objective.id !== selected.id
    )
      throw new Error(
        "The current client or session cannot submit Strategy intake.",
      );
  }
  return {
    guard,
    async authorize(signal) {
      const assert = () => {
        signal.throwIfAborted();
        guard();
      };
      assert();
      await verifyCoreWriter(api, actor, signal, assert);
      const client = await api.request(
        "core",
        `clients/${encodeURIComponent(selected.clientId)}`,
        clientSchema,
        { signal },
      );
      assert();
      if (client.id !== selected.clientId || client.status === "archived")
        throw new Error("The selected client is archived.");
      const objectives = await api.request(
        "core",
        `clients/${encodeURIComponent(selected.clientId)}/objectives`,
        scopedObjectivesSchema(selected.clientId),
        { signal },
      );
      assert();
      const objective = objectives.find((row) => row.id === selected.id);
      if (!objective)
        throw new Error("The saved Objective is no longer available.");
      return objective;
    },
    load: () => readRecovery(scope, contract, guard),
    reserve: (request, origin) =>
      reserveRecovery(
        scope,
        request.body.command.requestId,
        { request, origin },
        contract,
        guard,
      ),
    save: (value) =>
      updateRecovery(
        scope,
        value.request.body.command.requestId,
        value,
        contract,
        guard,
      ),
    lock: (action) => withRecoveryCommandLock(scope, guard, action),
  };
}
