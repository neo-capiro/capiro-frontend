import { z } from "zod";
import { defineOperation } from "../contracts";
import { objectiveSavedReviewOperation } from "./objective-saved-review";
import { objectiveResourceId as id } from "./objective-destination-binding";
import type { ObjectiveDestinationQuery } from "./objective-destination-binding";
import { strategyTypes } from "./strategies-schemas";

const source =
  "capiro-backend@1bc48d8831b5dad8fbf70c6a24a0c22a944dbf0b apps/api-strategy/src/meri/{draft-job.service,objective-generation.types}.ts";
const date = z.iso.datetime({ offset: true });
const digest = z.string().regex(/^[a-f0-9]{64}$/);
const packetId = z.string().min(1).max(200);
export const objectiveGenerationRequest = z
  .object({
    requestId: id,
    clientId: id,
    objective: z
      .object({
        objectiveId: id,
        objectiveVersion: z.number().int().min(1).max(2147483647),
      })
      .strict(),
    type: z.enum(strategyTypes),
  })
  .strict();

export const objectiveGenerationFailures = {
  OBJECTIVE_VERSION_CONFLICT:
    "Objective changed. Refresh it before continuing.",
  OBJECTIVE_CONTEXT_INCOMPLETE:
    "Government relationship context is incomplete. Review its coverage before generating.",
  OBJECTIVE_GENERATION_OUTCOME_UNCONFIRMED:
    "The saved outcome could not be confirmed. Refresh this attempt before starting another.",
  OBJECTIVE_GENERATION_FAILED:
    "This Objective strategy could not be generated.",
} as const;
const failure = z
  .object({
    code: z.enum(
      Object.keys(objectiveGenerationFailures) as [
        keyof typeof objectiveGenerationFailures,
        ...(keyof typeof objectiveGenerationFailures)[],
      ],
    ),
    message: z.string().max(500),
  })
  .strict()
  .refine(
    (v) => v.message === objectiveGenerationFailures[v.code],
    "The generation failure is not a reviewed public message.",
  );
const context = z
  .object({
    state: z.enum(["pending", "complete", "incomplete"]),
    packetId: packetId.nullable(),
    compiledAt: date.nullable(),
    reobservedAt: date.nullable(),
    sourceDigest: digest.nullable(),
    coverageDigest: digest.nullable(),
    inputDigest: digest.nullable(),
    issues: z
      .array(
        z
          .object({
            group: z.string().min(1).max(200),
            code: z.string().min(1).max(200),
            message: z.string().min(1).max(2000),
          })
          .strict(),
      )
      .max(64),
  })
  .strict();
export const objectiveGenerationReceipt = z
  .object({
    schemaVersion: z.literal(1),
    requestId: id,
    source: z
      .object({
        clientId: id,
        objectiveId: id,
        objectiveVersion: z.number().int().min(1).max(2147483647),
        objectiveRevisionId: id,
      })
      .strict(),
    context,
    result: z
      .object({
        strategyId: id,
        strategyVersionId: id,
        savedAt: date,
        sourceDigest: digest,
        contextPacketId: packetId,
        coverageDigest: digest,
        inputDigest: digest,
      })
      .strict()
      .nullable(),
    failure: failure.nullable(),
  })
  .strict();
export type ObjectiveGenerationReceipt = z.infer<
  typeof objectiveGenerationReceipt
>;
export type ObjectiveGenerationRequest = z.infer<
  typeof objectiveGenerationRequest
>;
const status = z.enum(["queued", "running", "completed", "failed"]);

function contextConsistent(c: ObjectiveGenerationReceipt["context"]) {
  const fields = [
    c.packetId,
    c.compiledAt,
    c.sourceDigest,
    c.coverageDigest,
    c.inputDigest,
  ];
  if (c.state === "pending")
    return fields.every((v) => v === null) && c.issues.length === 0;
  if (c.state === "complete")
    return fields.every((v) => v !== null) && c.issues.length === 0;
  return c.issues.length > 0;
}
function outcomeConsistent(value: {
  status: z.infer<typeof status>;
  objectiveGeneration: ObjectiveGenerationReceipt;
}) {
  const { context: c, result: r, failure: f } = value.objectiveGeneration;
  if (!contextConsistent(c)) return false;
  if (value.status !== "completed" && c.reobservedAt !== null) return false;
  if (value.status === "queued" || value.status === "running")
    return r === null && f === null;
  if (value.status === "failed") return r === null && f !== null;
  return (
    c.state === "complete" &&
    c.reobservedAt !== null &&
    r !== null &&
    f === null &&
    r.sourceDigest === c.sourceDigest &&
    r.contextPacketId === c.packetId &&
    r.coverageDigest === c.coverageDigest &&
    r.inputDigest === c.inputDigest
  );
}
const acceptedFields = {
  jobId: id,
  status,
  objectiveGeneration: objectiveGenerationReceipt,
};
export const objectiveGenerationAccepted = z
  .object(acceptedFields)
  .strict()
  .refine(outcomeConsistent, "Contradictory Objective generation outcome.");
export const objectiveGenerationJob = z
  .object({
    ...acceptedFields,
    stage: z.string().max(120).nullable(),
    progressText: z.string().max(4000).nullable(),
    streamPreview: z.null(),
    strategyId: id.nullable(),
    errorMessage: z.string().max(500).nullable(),
    createdAt: date,
    updatedAt: date,
  })
  .strict()
  .refine(outcomeConsistent, "Contradictory Objective generation outcome.")
  .refine(
    (v) =>
      v.strategyId === (v.objectiveGeneration.result?.strategyId ?? null) &&
      v.errorMessage === (v.objectiveGeneration.failure?.message ?? null),
    "The job does not match its durable receipt.",
  );
export type ObjectiveGenerationAccepted = z.infer<
  typeof objectiveGenerationAccepted
>;
export type ObjectiveGenerationJob = z.infer<typeof objectiveGenerationJob>;

export function requireObjectiveGeneration<
  Value extends ObjectiveGenerationAccepted,
>(value: Value, request: ObjectiveGenerationRequest, expectedJobId?: string) {
  const r = value.objectiveGeneration,
    s = r.source;
  if (
    r.requestId !== request.requestId ||
    s.clientId !== request.clientId ||
    s.objectiveId !== request.objective.objectiveId ||
    s.objectiveVersion !== request.objective.objectiveVersion ||
    (expectedJobId !== undefined && value.jobId !== expectedJobId)
  )
    throw new Error(
      "The generation receipt does not match this saved Objective request.",
    );
  return value;
}

export function objectiveGenerationHref(value: ObjectiveGenerationAccepted) {
  const checked = objectiveGenerationAccepted.parse(value);
  const receipt = checked.objectiveGeneration,
    result = receipt.result;
  if (checked.status !== "completed" || !result)
    throw new Error("A saved Strategy receipt is required.");
  const query = new URLSearchParams({
    clientId: receipt.source.clientId,
    objectiveId: receipt.source.objectiveId,
    objectiveVersion: String(receipt.source.objectiveVersion),
    strategyId: result.strategyId,
    strategyVersionId: result.strategyVersionId,
    generatedJobId: checked.jobId,
  });
  return `/modules/strategies?${query}`;
}

export function requireGeneratedStrategy(
  value: ObjectiveGenerationJob,
  selected: {
    query: ObjectiveDestinationQuery;
    ids: {
      strategyId: string;
      strategyVersionId: string;
      generatedJobId: string;
    };
  },
) {
  const checked = objectiveGenerationJob.parse(value),
    s = checked.objectiveGeneration.source;
  const r = checked.objectiveGeneration.result,
    { query, ids } = selected;
  if (
    checked.status !== "completed" ||
    !r ||
    checked.jobId !== ids.generatedJobId ||
    r.strategyId !== ids.strategyId ||
    r.strategyVersionId !== ids.strategyVersionId ||
    s.clientId !== query.clientId ||
    s.objectiveId !== query.objectiveId ||
    s.objectiveVersion !== query.objectiveVersion
  )
    throw new Error(
      "The saved generation does not match this exact Strategy destination.",
    );
  return checked;
}

export const objectiveGenerationOperations = {
  "strategies.objectiveSavedReview": objectiveSavedReviewOperation,
  "strategies.objectiveDraftJob": defineOperation({
    service: "strategy",
    method: "GET",
    path: "/strategies/draft-jobs/:jobId",
    request: z.object({ params: z.object({ jobId: id }).strict() }).strict(),
    response: objectiveGenerationJob,
    source,
  }),
} as const;
