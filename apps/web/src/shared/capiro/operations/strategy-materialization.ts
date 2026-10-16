import { z } from "zod";
import contract from "./strategy-materialization.contract.json" with { type: "json" };
import { defineOperation } from "../contracts";
import {
  objectiveResourceId,
  readObjectiveLocation,
} from "./objective-destination-binding";
import type { ObjectiveGenerationJob } from "./objective-generation";
import type {
  PlanRequest,
  PlanResponse,
  PlanFailure,
} from "./strategy-materialization-types";
import { validatePlanMappings } from "./strategy-materialization-semantics";
export type {
  PlanRequest,
  PlanResponse,
  PlanFailure,
} from "./strategy-materialization-types";
const source =
  "capiro-backend@42d8142092aa49740526667fd1a58c86ec6c1e61 docs/objective-planner-materialization-proposal/CONTRACT.json";
const compiledContract: Record<string, unknown> = structuredClone(contract);
// Locked Zod cannot compile if/then/else. This one allocated conditional has
// exactly two possible discriminants, so preserve it as an equivalent union.
const definitions = compiledContract.$defs as Record<string, unknown>;
const errorVariants = definitions.error as { oneOf: Record<string, unknown>[] };
const stale = errorVariants.oneOf[3]!;
if (
  (stale.properties as { code: { const: string } }).code.const !==
  "MATERIALIZATION_SOURCE_STALE"
)
  throw new Error("Unreviewed materialization error contract.");
stale.allOf = [
  {
    anyOf: [
      {
        type: "object",
        properties: {
          recordedAttempt: { const: true },
          outcome: { const: "recorded" },
        },
      },
      {
        type: "object",
        properties: {
          recordedAttempt: { type: "null" },
          outcome: { const: "unconfirmed" },
        },
      },
    ],
  },
];
function schema<T>(name: string): z.ZodType<T> {
  // Validation comes from the exact pinned contract, not a second DTO definition.
  return z.fromJSONSchema({
    ...compiledContract,
    $ref: `#/$defs/${name}`,
  } as Parameters<typeof z.fromJSONSchema>[0]) as z.ZodType<T>;
}
export const planRequest = schema<PlanRequest>("request").refine(
  (v) =>
    !v.groups || new Set(v.groups.map((g) => g.key)).size === v.groups.length,
  "Plan group keys must be unique.",
);
export function requireRequestedGroups(
  value: PlanResponse,
  request: PlanRequest,
) {
  if (!request.groups) return;
  const groups = request.groups;
  if (
    groups.length !== value.projects.length ||
    groups.some((group) => {
      const project = value.projects.find((p) => p.groupKey === group.key);
      return (
        !project ||
        project.name !== group.name ||
        project.originalNodeIds.length !== group.nodeIds.length ||
        !group.nodeIds.every((id) => project.originalNodeIds.includes(id))
      );
    })
  )
    throw new Error("The saved plan does not match the requested groups.");
}
export const planFailure = schema<PlanFailure>("error");
export const planResponse = schema<PlanResponse>("response").transform(
  (v, ctx) => {
    try {
      return validatePlanMappings(v);
    } catch {
      ctx.addIssue({
        code: "custom",
        message: "The plan receipt is inconsistent.",
      });
      return z.NEVER;
    }
  },
);
export function requirePlan(
  value: PlanResponse,
  request: PlanRequest,
  job: ObjectiveGenerationJob,
) {
  const v = planResponse.parse(value),
    s = v.source,
    g = job.objectiveGeneration;
  const result = g.result;
  if (
    job.status !== "completed" ||
    !result ||
    v.requestId !== request.requestId ||
    s.generationJobId !== job.jobId ||
    request.generationJobId !== job.jobId ||
    s.generationRequestId !== g.requestId ||
    s.clientId !== g.source.clientId ||
    s.objectiveId !== g.source.objectiveId ||
    s.objectiveVersion !== g.source.objectiveVersion ||
    s.objectiveRevisionId !== g.source.objectiveRevisionId ||
    s.objectiveRevisionId !== request.expected.objectiveRevisionId ||
    s.strategyId !== result.strategyId ||
    s.strategyId !== request.expected.strategyId ||
    s.strategyVersionId !== result.strategyVersionId ||
    s.strategyVersionId !== request.expected.strategyVersionId
  )
    throw new Error(
      "The plan receipt does not match this exact saved Strategy and Objective.",
    );
  requireRequestedGroups(v, request);
  return v;
}
export function planRequestFor(job: ObjectiveGenerationJob, requestId: string) {
  const result = job.objectiveGeneration.result;
  if (job.status !== "completed" || !result)
    throw new Error("A completed saved Strategy receipt is required.");
  return planRequest.parse({
    requestId,
    generationJobId: job.jobId,
    expected: {
      strategyId: result.strategyId,
      strategyVersionId: result.strategyVersionId,
      objectiveRevisionId: job.objectiveGeneration.source.objectiveRevisionId,
    },
  });
}
export function requirePlanRequest(
  value: PlanRequest,
  job: ObjectiveGenerationJob,
) {
  const v = planRequest.parse(value),
    expected = planRequestFor(job, v.requestId);
  if (
    v.generationJobId !== expected.generationJobId ||
    v.expected.strategyId !== expected.expected.strategyId ||
    v.expected.strategyVersionId !== expected.expected.strategyVersionId ||
    v.expected.objectiveRevisionId !== expected.expected.objectiveRevisionId
  )
    throw new Error(
      "The retained plan request belongs to another saved source.",
    );
  return v;
}
export function planHref(v: PlanResponse) {
  const value = planResponse.parse(v);
  if (value.status === "partial")
    throw new Error("Current available plan outputs are required.");
  return `/modules/planner?${new URLSearchParams({ clientId: value.source.clientId, objectiveId: value.source.objectiveId, objectiveVersion: String(value.source.objectiveVersion), generationJobId: value.source.generationJobId, strategyId: value.source.strategyId, strategyVersionId: value.source.strategyVersionId, objectiveRevisionId: value.source.objectiveRevisionId, materializationRequestId: value.requestId })}`;
}
export const planLocationKeys = [
  "generationJobId",
  "strategyId",
  "strategyVersionId",
  "objectiveRevisionId",
  "materializationRequestId",
] as const;
export function readPlanLocation(
  params: Parameters<typeof readObjectiveLocation>[0],
) {
  return readObjectiveLocation(params, planLocationKeys);
}
export type PlanSelection = NonNullable<ReturnType<typeof readPlanLocation>>;
export function requireSelectedPlan(
  value: PlanResponse,
  job: ObjectiveGenerationJob,
  selected: PlanSelection,
) {
  const { ids, query } = selected,
    s = job.objectiveGeneration.source;
  if (
    s.clientId !== query.clientId ||
    s.objectiveId !== query.objectiveId ||
    s.objectiveVersion !== query.objectiveVersion
  )
    throw new Error("This plan belongs to another saved Objective.");
  return requirePlan(
    value,
    {
      requestId: ids.materializationRequestId,
      generationJobId: ids.generationJobId,
      expected: {
        strategyId: ids.strategyId,
        strategyVersionId: ids.strategyVersionId,
        objectiveRevisionId: ids.objectiveRevisionId,
      },
    },
    job,
  );
}
export const strategyMaterializationOperations = {
  "planner.strategyMaterialize": defineOperation({
    service: "strategy",
    method: "POST",
    path: "/planner/strategy-materializations",
    request: z.object({ body: planRequest }).strict(),
    response: planResponse,
    source,
  }),
  "planner.strategyMaterialization": defineOperation({
    service: "strategy",
    method: "GET",
    path: "/planner/strategy-materializations/:requestId",
    request: z
      .object({ params: z.object({ requestId: objectiveResourceId }).strict() })
      .strict(),
    response: planResponse,
    source,
  }),
} as const;
