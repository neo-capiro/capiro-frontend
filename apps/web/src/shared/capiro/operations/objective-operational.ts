import { z } from "zod";
import contract from "./objective-operational.contract.json" with { type: "json" };
import { defineOperation } from "../contracts";
import { objectiveResourceId as id } from "./objective-destination-binding";
import type {
  OperationalAssociationCommand,
  OperationalAssociationLookup,
  OperationalAssociationReceipt,
  OperationalCurrentObjective,
  OperationalFailure,
  OperationalPageContext,
  OperationalRead,
  OperationalReadRequest,
  OperationalRevision,
} from "./objective-operational-types";
import {
  canonicalOperationalJSON,
  requireOperationalPage,
  validateOperationalObservation,
} from "./objective-operational-semantics";
export type * from "./objective-operational-types";
export {
  implementedOperationalActions,
  operationalRowResource,
  operationalSelectionKey,
} from "./objective-operational-semantics";

export const objectiveOperationalContractSource =
  "capiro-backend@6ce5cacd261e4e4541fea482beea160a3f6c3702 docs/objective-operational-read-contract-20261015/CONTRACT.schema.json";
export const objectiveOperationalContractSHA256 =
  "6314da43305d37140c8dfeedb9b042c7e41f1354fd60f06da371e918d209ab93";
const compiled = structuredClone(contract);
// The first producer has no applied-composite reader. Refuse the external
// proposal branch rather than accepting an unvalidated projection as authority.
const unavailableAutomation = compiled.definitions.Automation.oneOf[0]!;
compiled.definitions.Automation.oneOf = [unavailableAutomation];
// Zod's JSON Schema compiler does not support if/then. Preserve these exact
// allocated command/receipt conditions as explicit receiving refinements below.
delete (compiled.definitions.AssociationCommand.oneOf[0] as { allOf?: unknown })
  .allOf;
delete (compiled.definitions.AssociationReceipt as { allOf?: unknown }).allOf;
function schema<Value>(
  name: keyof typeof contract.definitions,
): z.ZodType<Value> {
  return z.fromJSONSchema({
    $schema: compiled.$schema,
    definitions: compiled.definitions,
    $ref: `#/definitions/${name}`,
  } as Parameters<typeof z.fromJSONSchema>[0]) as z.ZodType<Value>;
}
export const operationalReadRequestSchema =
  schema<OperationalReadRequest>("ReadRequest");
export const operationalAssociationLookupSchema =
  schema<OperationalAssociationLookup>("AssociationLookupRequest");
export const operationalFailureSchema = schema<OperationalFailure>("Error");
export const operationalAssociationCommandSchema =
  schema<OperationalAssociationCommand>("AssociationCommand").refine(
    (value) =>
      value.action === "unlink" ||
      ([
        "strategy",
        "planner_project",
        "planner_task",
        "outreach_session",
        "meeting",
      ].includes(value.resource.kind) &&
        (value.resource.kind === "strategy" || value.cycles.length === 0)),
    "This resource or cycle annotation is not an allocated association command.",
  );
export const operationalAssociationReceiptSchema =
  schema<OperationalAssociationReceipt>("AssociationReceipt").refine(
    (value) =>
      value.outcome === "unchanged" ||
      value.outcome === (value.action === "link" ? "linked" : "unlinked"),
    "The association receipt contradicts its command.",
  );
export const operationalReadSchema = schema<OperationalRead>(
  "ReadResponse",
).transform((value, ctx) => {
  try {
    return validateOperationalObservation(value);
  } catch {
    ctx.addIssue({
      code: "custom",
      message: "The Objective operational observation is inconsistent.",
    });
    return z.NEVER;
  }
});
export function operationalReadRequest(
  clientId: string,
  objectiveId: string,
  cursors: Partial<OperationalReadRequest["cursors"]> = {},
  limit = 25,
) {
  return operationalReadRequestSchema.parse({
    schemaVersion: 1,
    clientId,
    objectiveId,
    limit,
    cursors: {
      strategies: null,
      projects: null,
      decisions: null,
      engagements: null,
      ...cursors,
    },
  });
}
export function operationalReadInput(request: OperationalReadRequest) {
  const value = operationalReadRequestSchema.parse(request);
  return {
    params: { clientId: value.clientId },
    query: {
      schemaVersion: value.schemaVersion,
      objectiveId: value.objectiveId,
      limit: value.limit,
      strategiesCursor: value.cursors.strategies ?? undefined,
      projectsCursor: value.cursors.projects ?? undefined,
      decisionsCursor: value.cursors.decisions ?? undefined,
      engagementsCursor: value.cursors.engagements ?? undefined,
    },
  };
}
export function requireOperationalRead(
  value: unknown,
  request: OperationalReadRequest,
  objective: OperationalCurrentObjective,
  prior: OperationalPageContext = {},
) {
  return requireOperationalPage(
    operationalReadSchema.parse(value),
    operationalReadRequestSchema.parse(request),
    objective,
    prior,
  );
}

/** Hashes the retained original command, including cycle-array order. No write occurs. */
export async function operationalAssociationPayloadDigest(
  command: OperationalAssociationCommand,
) {
  const checked = operationalAssociationCommandSchema.parse(command);
  const bytes = new TextEncoder().encode(canonicalOperationalJSON(checked));
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest), (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("");
}

/** Binds an observation to an exact retained command; it does not grant write authority. */
export async function requireOperationalAssociationReceipt(
  value: unknown,
  retained: { command: OperationalAssociationCommand; payloadDigest: string },
  knownLinkingRevision?: OperationalRevision,
) {
  const command = operationalAssociationCommandSchema.parse(retained.command);
  const receipt = operationalAssociationReceiptSchema.parse(value);
  const payloadDigest = retained.payloadDigest;
  const known =
    knownLinkingRevision &&
    schema<OperationalRevision>("Revision").parse(knownLinkingRevision);
  const digest = await operationalAssociationPayloadDigest(command);
  const original = receipt.associationLinkedRevision,
    admitted = receipt.commandRevision;
  if (
    digest !== payloadDigest ||
    receipt.payloadDigest !== digest ||
    receipt.requestId !== command.requestId ||
    receipt.clientId !== command.clientId ||
    receipt.objectiveId !== command.objectiveId ||
    receipt.action !== command.action ||
    admitted.version !== command.expectedObjectiveVersion ||
    original.version > admitted.version ||
    (original.version === admitted.version && original.id !== admitted.id) ||
    (receipt.outcome === "linked" &&
      canonicalOperationalJSON(admitted) !==
        canonicalOperationalJSON(original)) ||
    (command.action === "unlink" &&
      receipt.associationId !== command.associationId) ||
    receipt.resultSetVersion !==
      command.expectedAssociationSetVersion +
        (receipt.outcome === "unchanged" ? 0 : 1) ||
    (known &&
      canonicalOperationalJSON(original) !== canonicalOperationalJSON(known))
  )
    throw new Error(
      "The association receipt does not match the retained original command.",
    );
  return receipt;
}

const version = z.literal(1);
const cursor = z.string().min(1).max(2048).optional();
const readInput = z
  .object({
    params: z.object({ clientId: id }).strict(),
    query: z
      .object({
        schemaVersion: version,
        objectiveId: id,
        limit: z.number().int().min(1).max(100),
        strategiesCursor: cursor,
        projectsCursor: cursor,
        decisionsCursor: cursor,
        engagementsCursor: cursor,
      })
      .strict(),
  })
  .strict();
export const objectiveOperationalOperations = {
  "objectives.operational.read": defineOperation({
    service: "core",
    method: "GET",
    path: "/clients/:clientId/objectives/operational",
    request: readInput,
    response: operationalReadSchema,
    source: objectiveOperationalContractSource,
  }),
  "objectives.operational.link": defineOperation({
    service: "core",
    method: "POST",
    path: "/clients/:clientId/objectives/operational-associations",
    request: z
      .object({
        params: z.object({ clientId: id }).strict(),
        body: operationalAssociationCommandSchema,
      })
      .strict()
      .refine(
        (value) => value.params.clientId === value.body.clientId,
        "The association client path and body differ.",
      ),
    response: operationalAssociationReceiptSchema,
    source: objectiveOperationalContractSource,
  }),
  "objectives.operational.receipt": defineOperation({
    service: "core",
    method: "GET",
    path: "/clients/:clientId/objectives/operational-associations/:requestId",
    request: z
      .object({
        params: z.object({ clientId: id, requestId: id }).strict(),
        query: z.object({ schemaVersion: version, objectiveId: id }).strict(),
      })
      .strict(),
    response: operationalAssociationReceiptSchema,
    source: objectiveOperationalContractSource,
  }),
} as const;
