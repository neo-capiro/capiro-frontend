import { QueryClient } from "@tanstack/react-query";
import genWire from "./objective-generation-wire-fixtures.json";
import planWire from "./objective-plan-wire-fixtures.json";
import { objective } from "./browser/fixtures";
import { ApiError, type ApiClient } from "../src/shared/portfolio/api/http";
import { objectiveGenerationJob } from "../src/shared/capiro/operations/objective-generation";
import {
  planRequest,
  type PlanRequest,
  type PlanResponse,
} from "../src/shared/capiro/operations/strategy-materialization";
import { ObjectivePlanSession } from "../src/features/portfolio/objectives/objective-plan-session";
import { createPlanRecovery } from "../src/features/portfolio/objectives/objective-plan-recovery";

export function planSetup() {
  const selected = {
    clientId: genWire.request.body.clientId,
    id: genWire.request.body.objective.objectiveId,
    version: 7,
  };
  const actor = { tenantId: "synthetic-tenant", userId: "synthetic-actor" },
    cache = new QueryClient();
  const identity = {
    user: { id: actor.userId, email: null },
    tenant: { id: actor.tenantId, name: "Synthetic" },
    role: "standard_user",
  };
  cache.setQueryData(["identity"], identity);
  const control = {
    deny: false,
    lostPlan: false,
    failBeforeCommit: false,
    foreign: false,
    partial: false,
    malformedError: false,
    pausePost: undefined as Promise<void> | undefined,
  };
  const plans: PlanRequest[] = [];
  const generationId = genWire.request.body.requestId;
  let savedPlan: PlanResponse | undefined;
  const completed = () =>
    objectiveGenerationJob.parse({
      ...genWire.completedPoll.body,
      objectiveGeneration: {
        ...genWire.completedPoll.body.objectiveGeneration,
        requestId: generationId,
      },
    });
  const api: ApiClient = {
    async request(_service, path, schema, options) {
      options?.signal?.throwIfAborted();
      let value: unknown;
      if (path === "me")
        value = {
          ...identity,
          role: control.deny ? "readonly" : identity.role,
        };
      else if (path.endsWith("/objectives"))
        value = [
          {
            ...objective,
            id: selected.id,
            clientId: selected.clientId,
            version: selected.version,
            status: "ready",
          },
        ];
      else if (path.startsWith("strategies/draft-jobs/")) value = completed();
      else if (path === "planner/strategy-materializations") {
        const request = planRequest.parse(options?.body);
        plans.push(request);
        await control.pausePost;
        options?.signal?.throwIfAborted();
        if (control.failBeforeCommit) {
          control.failBeforeCommit = false;
          throw new TypeError("synthetic uncertain response");
        }
        if (control.malformedError)
          throw new ApiError(422, "raw secret provider stack", {
            message: "raw secret provider stack",
          });
        const job = completed();
        const response = structuredClone(
          control.partial
            ? planWire.responses.partialUnavailableOutput
            : planWire.responses.prepared,
        ) as PlanResponse;
        response.requestId = request.requestId;
        response.source = {
          ...response.source,
          generationJobId: job.jobId,
          generationRequestId: job.objectiveGeneration.requestId,
          ...job.objectiveGeneration.source,
          strategyId: job.strategyId!,
          strategyVersionId: job.objectiveGeneration.result!.strategyVersionId,
        };
        if (control.foreign)
          response.source.strategyVersionId = request.requestId;
        savedPlan = response;
        if (control.lostPlan) {
          control.lostPlan = false;
          throw new TypeError("synthetic lost commit reply");
        }
        value = response;
      } else if (path.startsWith("planner/strategy-materializations/")) {
        if (!savedPlan)
          throw new ApiError(404, "unavailable", {
            ...planWire.errors[1],
            requestId: path.split("/").at(-1),
          });
        value = savedPlan;
      } else throw new Error(`Unexpected synthetic path ${path}`);
      return schema.parse(value);
    },
  };
  const session = () =>
    new ObjectivePlanSession(
      api,
      completed(),
      createPlanRecovery(api, cache, actor, completed()),
    );
  return {
    api,
    cache,
    actor,
    selected,
    control,
    plans,
    session,
    replaceSavedPlan: (value: PlanResponse) => {
      savedPlan = value;
    },
  };
}
