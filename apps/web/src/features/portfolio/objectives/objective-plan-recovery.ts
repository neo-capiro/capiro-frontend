import { z } from "zod";
import type { QueryClient } from "@tanstack/react-query";
import type { ApiClient } from "@/shared/portfolio/api/http";
import type { ClientWriter } from "@/shared/portfolio/auth/client-writer";
import {
  readRecovery,
  reserveRecovery,
  updateRecovery,
  withRecoveryCommandLock,
} from "@/shared/session/recovery/journal";
import {
  planRequest,
  planResponse,
  requirePlan,
  requirePlanRequest,
  type PlanRequest,
  type PlanResponse,
} from "@/shared/capiro/operations/strategy-materialization";
import type { ObjectiveGenerationJob } from "@/shared/capiro/operations/objective-generation";
import { createGenerationRecovery } from "./objective-generation-recovery";
import {
  rememberPlanOutputs,
  planCreationIdentity,
  type KnownPlanOutputs,
} from "@/shared/capiro/operations/strategy-materialization-semantics";

export type RetainedPlan = {
  request: PlanRequest;
  response?: PlanResponse;
  knownOutputs?: KnownPlanOutputs;
};
export interface PlanRecovery {
  guard(): void;
  authorize(signal: AbortSignal): Promise<void>;
  load(): Promise<RetainedPlan | null>;
  reserve(request: PlanRequest): Promise<RetainedPlan>;
  save(value: RetainedPlan): Promise<void>;
  lock<T>(action: () => Promise<T>): Promise<T>;
}
export function createPlanRecovery(
  api: ApiClient,
  cache: QueryClient,
  actor: ClientWriter,
  job: ObjectiveGenerationJob,
): PlanRecovery {
  const source = job.objectiveGeneration.source;
  const authority = createGenerationRecovery(api, cache, actor, {
    clientId: source.clientId,
    id: source.objectiveId,
    version: source.objectiveVersion,
  });
  const scope = JSON.stringify([
    "objective-plan-v1",
    actor.tenantId,
    actor.userId,
    source.clientId,
    source.objectiveId,
    source.objectiveVersion,
    job.jobId,
  ]);
  const known = z
    .object({
      projects: z.record(z.string(), z.uuid()),
      tasks: z.record(z.string(), z.uuid()),
    })
    .strict();
  const schema = z
    .object({
      request: planRequest,
      response: planResponse.optional(),
      knownOutputs: known.optional(),
    })
    .strict()
    .superRefine((v, ctx) => {
      try {
        requirePlanRequest(v.request, job);
        if (v.response) {
          requirePlan(v.response, v.request, job);
          rememberPlanOutputs(v.knownOutputs, v.response);
        }
      } catch {
        ctx.addIssue({
          code: "custom",
          message: "Saved plan recovery does not match its Strategy receipt.",
        });
      }
    });
  const contract = {
    schema,
    requestId: (v: RetainedPlan) => v.request.requestId,
    validateUpdate(a: RetainedPlan, b: RetainedPlan) {
      if (
        JSON.stringify(a.request) !== JSON.stringify(b.request) ||
        (a.response &&
          (!b.response ||
            planCreationIdentity(a.response) !==
              planCreationIdentity(b.response)))
      )
        throw new Error("The immutable plan creation receipt changed.");
      for (const kind of ["projects", "tasks"] as const)
        for (const [key, id] of Object.entries(a.knownOutputs?.[kind] ?? {}))
          if (b.knownOutputs?.[kind][key] !== id)
            throw new Error("A known plan output identity changed.");
    },
  };
  return {
    guard: authority.guard,
    authorize: authority.authorize,
    load: () => readRecovery(scope, contract, authority.guard),
    reserve: (request) =>
      reserveRecovery(
        scope,
        request.requestId,
        { request },
        contract,
        authority.guard,
      ),
    async save(value) {
      const previous = await readRecovery(scope, contract, authority.guard);
      const prior =
        previous?.knownOutputs ??
        (previous?.response
          ? rememberPlanOutputs(undefined, previous.response)
          : undefined);
      const knownOutputs = value.response
        ? rememberPlanOutputs(prior, value.response)
        : prior;
      await updateRecovery(
        scope,
        value.request.requestId,
        { ...value, knownOutputs },
        contract,
        authority.guard,
      );
    },
    lock: (action) => withRecoveryCommandLock(scope, authority.guard, action),
  };
}
