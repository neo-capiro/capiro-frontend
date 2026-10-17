import { z } from "zod";
import { defineOperation } from "../contracts";
import {
  governedObjectiveGenerationObservation,
  governedObjectiveGenerationReadRequest,
  governedObjectiveWorkAction,
  requireGovernedObjectiveGenerationObservation,
  type GovernedObjectiveGenerationReadRequest,
} from "./objective-governed-generation";

/** Core PR #56 public Planner receipt read. Registered only as an authenticated GET. */
export const governedObjectiveOutputsSource =
  "capiro-backend@bdcb546804f35d0973603fca5e99dbd4d640953f apps/api/src/clients/objectives/work/{objective-work-output,objective-work-command,objective-work.controller}.ts";

const id = governedObjectiveGenerationReadRequest.shape.params.shape.clientId;
const utc = governedObjectiveGenerationObservation.shape.observedAt;
const objective = governedObjectiveGenerationObservation.shape.objective;
const source = governedObjectiveGenerationObservation.shape.requestedSource;
const version = source.shape.canonicalBindingVersion;
const positiveDecimal = z
  .string()
  .regex(/^[1-9][0-9]{0,9}$/)
  .refine(
    (value) => Number(value) <= 2147483647,
    "Source version is out of range.",
  );

export const governedObjectiveOutputsReadRequest = z.strictObject({
  params: governedObjectiveGenerationReadRequest.shape.params,
  query: z.strictObject({
    workAction: governedObjectiveWorkAction,
    sourceRevisionId: id,
    sourceObjectiveVersion: positiveDecimal,
    canonicalBindingVersion: positiveDecimal,
  }),
});

const project = z
  .strictObject({
    availability: z.enum(["available", "unavailable"]),
    creation: z
      .strictObject({
        receiptVersion: z.union([z.literal(2), z.literal(3)]),
        recordedAt: utc,
        version,
      })
      .nullable(),
    application: z
      .strictObject({
        receiptVersion: z.union([z.literal(2), z.literal(3)]),
        recordedAt: utc,
      })
      .nullable(),
    current: z
      .strictObject({
        selection: z.strictObject({ kind: z.literal("planner_project"), id }),
        title: z.string().nullable(),
        ownerVersion: z.strictObject({
          kind: z.literal("counter"),
          value: version,
        }),
        observedAt: utc,
      })
      .nullable(),
  })
  .refine(
    (value) =>
      value.availability === "available"
        ? value.creation !== null &&
          value.application !== null &&
          value.current !== null
        : value.creation === null &&
          value.application === null &&
          value.current === null,
    "Project provenance and current selection must agree with availability.",
  );

export const governedObjectiveOutputsObservation = z
  .strictObject({
    schemaVersion: z.literal(1),
    scope: z.literal("planner_project_receipts"),
    clientId: id,
    objective,
    workAction: governedObjectiveWorkAction,
    requestedSource: source,
    selectedSource: source,
    observation: z.strictObject({
      state: z.enum([
        "not_started",
        "queued",
        "running",
        "applied",
        "failed",
        "cancelled",
        "outcome_unconfirmed",
        "unavailable",
      ]),
      strategy: z.strictObject({ availability: z.literal("unavailable") }),
      planner: z.strictObject({
        availability: z.enum([
          "available",
          "partial",
          "unavailable",
          "not_applied",
        ]),
        projects: z.array(project).max(1),
      }),
    }),
    taskDiscovery: z.literal("unsupported"),
    observedAt: utc,
  })
  .refine((value) => {
    const { state, planner } = value.observation;
    if (value.workAction === "objective.strategy.draft")
      return (
        state === "unavailable" &&
        planner.availability === "unavailable" &&
        planner.projects.length === 0
      );
    if (planner.availability === "available") {
      const current = planner.projects[0]?.current;
      const creation = planner.projects[0]?.creation;
      const application = planner.projects[0]?.application;
      if (!current || !creation || !application) return false;
      return (
        state === "applied" &&
        planner.projects.length === 1 &&
        current.observedAt === value.observedAt &&
        Date.parse(creation.recordedAt) <= Date.parse(application.recordedAt) &&
        Date.parse(application.recordedAt) <= Date.parse(value.observedAt) &&
        current.ownerVersion.value >= creation.version
      );
    }
    if (planner.availability === "not_applied")
      return state !== "applied" && planner.projects.length === 0;
    if (planner.availability === "unavailable")
      return planner.projects.every(
        (row) => row.availability === "unavailable",
      );
    return true; // Partial is reserved by Core; the receiver below will withhold it.
  }, "Planner state and current project observation are inconsistent.");

export const governedObjectiveOutputsReadOperation = defineOperation({
  service: "core",
  method: "GET",
  path: "/clients/:clientId/objectives/:objectiveId/generation/outputs",
  request: governedObjectiveOutputsReadRequest,
  response: governedObjectiveOutputsObservation,
  source: governedObjectiveOutputsSource,
});

export type GovernedObjectiveOutputsReadRequest = z.infer<
  typeof governedObjectiveOutputsReadRequest
>;
export type GovernedObjectiveOutputsObservation = z.infer<
  typeof governedObjectiveOutputsObservation
>;

function currentSelection(
  generationValue: unknown,
  generationRequest: GovernedObjectiveGenerationReadRequest,
) {
  const generation = requireGovernedObjectiveGenerationObservation(
    generationValue,
    generationRequest,
  );
  if (generationRequest.query.requestId !== undefined)
    throw new Error("Select outputs from a current generation read.");
  const request = governedObjectiveOutputsReadRequest.parse({
    params: generationRequest.params,
    query: {
      workAction: generation.workAction,
      sourceRevisionId: generation.requestedSource.revision.id,
      sourceObjectiveVersion: String(
        generation.requestedSource.revision.version,
      ),
      canonicalBindingVersion: String(
        generation.requestedSource.canonicalBindingVersion,
      ),
    },
  });
  return { generation, request };
}

/** A historical receipt cannot supply the exact binding version for an output selection. */
export function selectCurrentGovernedObjectiveOutputs(
  generationValue: unknown,
  generationRequest: GovernedObjectiveGenerationReadRequest,
): GovernedObjectiveOutputsReadRequest {
  return currentSelection(generationValue, generationRequest).request;
}

/** Returns a current navigation candidate, never access or command authority. Recheck Planner before opening. */
export function receiveCurrentGovernedObjectiveOutputs(
  outputValue: unknown,
  generationValue: unknown,
  generationRequest: GovernedObjectiveGenerationReadRequest,
) {
  const { generation, request } = currentSelection(
    generationValue,
    generationRequest,
  );
  const output = governedObjectiveOutputsObservation.parse(outputValue);
  const requested = generation.requestedSource;
  const selected = output.selectedSource;
  const matches = (candidate: typeof requested) =>
    candidate.revision.id === requested.revision.id &&
    candidate.revision.version === requested.revision.version &&
    candidate.canonicalBindingVersion === requested.canonicalBindingVersion;
  if (
    output.clientId !== request.params.clientId ||
    output.objective.id !== request.params.objectiveId ||
    output.workAction !== request.query.workAction ||
    output.objective.revision.id !== generation.objective.revision.id ||
    output.objective.revision.version !==
      generation.objective.revision.version ||
    output.objective.status !== generation.objective.status ||
    !matches(output.requestedSource) ||
    !matches(selected) ||
    Date.parse(output.observedAt) < Date.parse(generation.observedAt)
  )
    throw new Error(
      "The governed Objective outputs do not match the current read.",
    );
  if (output.observation.planner.availability === "partial")
    throw new Error("Partial Planner output receiving is not supported.");
  const currentProject =
    output.observation.state === "applied" &&
    output.observation.planner.availability === "available"
      ? (output.observation.planner.projects[0]?.current ?? null)
      : null;
  return { request, output, currentProject };
}
