import { z } from "zod";
import { defineOperation } from "../contracts";

/** Core PR #53 read projection. This operation is deliberately absent from the gateway registry. */
export const governedObjectiveGenerationSource =
  "capiro-backend@57f8c8047a73df6d4a73351a98a5239f38240a24 apps/api/src/clients/objectives/work/{objective-work.controller,objective-work-command}.ts";

const id = z
  .uuid()
  .refine((value) => value === value.toLowerCase(), "Use a canonical UUID.");
const version = z.number().int().min(1).max(2147483647);
const controlVersion = z.number().int().min(0).max(2147483647);
const utc = z.string().refine((value) => {
  const time = Date.parse(value);
  return Number.isFinite(time) && new Date(time).toISOString() === value;
}, "Use a canonical UTC instant.");
const revision = z.strictObject({ id, version });
export const governedObjectiveWorkAction = z.enum([
  "objective.strategy.draft",
  "objective.plan.prepare",
]);

const consentTimes = z
  .strictObject({ id, confirmedAt: utc, expiresAt: utc })
  .refine(
    (value) => Date.parse(value.expiresAt) > Date.parse(value.confirmedAt),
    "Consent must expire after confirmation.",
  );

/** The command receipt is historical; its source can differ from the current requested source. */
export const governedObjectiveCommandReceipt = z
  .strictObject({
    schemaVersion: z.literal(1),
    receiptId: id,
    requestId: id,
    payloadDigest: z.string().regex(/^[a-f0-9]{64}$/),
    clientId: id,
    objectiveId: id,
    command: z.enum(["retry", "cancel"]),
    workAction: governedObjectiveWorkAction,
    commandRevision: revision,
    sourceRevision: revision,
    rootIntentId: id,
    controlVersionBefore: controlVersion,
    controlVersionAfter: controlVersion,
    targetAuthorizationRequestId: id.nullable(),
    authorizationRequestId: id.nullable(),
    consent: consentTimes.nullable(),
    outcome: z.enum([
      "reconsent_recorded",
      "cancellation_recorded",
      "unchanged",
    ]),
    committedAt: utc,
  })
  .refine((receipt) => {
    if (receipt.command === "retry") {
      return (
        receipt.consent !== null &&
        receipt.outcome === "reconsent_recorded" &&
        receipt.authorizationRequestId === receipt.consent.id &&
        receipt.controlVersionAfter === receipt.controlVersionBefore + 1 &&
        Date.parse(receipt.committedAt) >=
          Date.parse(receipt.consent.confirmedAt) &&
        Date.parse(receipt.committedAt) < Date.parse(receipt.consent.expiresAt)
      );
    }
    return (
      receipt.consent === null &&
      receipt.authorizationRequestId === receipt.targetAuthorizationRequestId &&
      receipt.outcome !== "reconsent_recorded" &&
      receipt.controlVersionAfter ===
        receipt.controlVersionBefore +
          (receipt.outcome === "cancellation_recorded" ? 1 : 0)
    );
  }, "The command receipt contradicts its recorded outcome.");

export const governedObjectiveGenerationObservation = z
  .strictObject({
    schemaVersion: z.literal(1),
    clientId: id,
    objective: z.strictObject({
      id,
      revision,
      status: z.enum(["draft", "in_review", "ready"]),
    }),
    workAction: governedObjectiveWorkAction,
    requestedSource: z.strictObject({
      revision,
      canonicalBindingVersion: version,
    }),
    control: z.strictObject({
      version: controlVersion,
      currentAuthorizationRequestId: id.nullable(),
      cancelledAt: utc.nullable(),
    }),
    consent: consentTimes.safeExtend({ expired: z.boolean() }).nullable(),
    reconciliation: z.enum(["not_started", "accounted", "outcome_unconfirmed"]),
    accounting: z
      .strictObject({
        outcome: z.enum(["failed", "cancelled", "applied"]),
        sourceRevision: revision,
      })
      .nullable(),
    commandReceipt: governedObjectiveCommandReceipt.nullable(),
    observedAt: utc,
  })
  .refine(
    (value) =>
      (value.reconciliation === "accounted") === (value.accounting !== null) &&
      value.control.currentAuthorizationRequestId ===
        (value.consent?.id ?? null) &&
      (value.consent === null ||
        value.consent.expired ===
          Date.parse(value.consent.expiresAt) <=
            Date.parse(value.observedAt)) &&
      (value.commandReceipt === null ||
        (value.commandReceipt.clientId === value.clientId &&
          value.commandReceipt.objectiveId === value.objective.id &&
          value.commandReceipt.workAction === value.workAction)),
    "The Objective generation observation is inconsistent.",
  );

export const governedObjectiveGenerationReadRequest = z.strictObject({
  params: z.strictObject({ clientId: id, objectiveId: id }),
  query: z.strictObject({
    workAction: governedObjectiveWorkAction,
    requestId: id.optional(),
  }),
});

export type GovernedObjectiveGenerationObservation = z.infer<
  typeof governedObjectiveGenerationObservation
>;
export type GovernedObjectiveGenerationReadRequest = z.infer<
  typeof governedObjectiveGenerationReadRequest
>;

/** A requestId lookup must return that exact verified action receipt. Neither GET nor this helper grants command authority. */
export function requireGovernedObjectiveGenerationObservation(
  value: unknown,
  request: GovernedObjectiveGenerationReadRequest,
): GovernedObjectiveGenerationObservation {
  const selection = governedObjectiveGenerationReadRequest.parse(request);
  const observation = governedObjectiveGenerationObservation.parse(value);
  if (
    observation.clientId !== selection.params.clientId ||
    observation.objective.id !== selection.params.objectiveId ||
    observation.workAction !== selection.query.workAction ||
    (selection.query.requestId === undefined
      ? observation.commandReceipt !== null
      : observation.commandReceipt?.requestId !== selection.query.requestId)
  )
    throw new Error(
      "The governed Objective observation does not match this read request.",
    );
  return observation;
}

export const governedObjectiveGenerationReadOperation = defineOperation({
  service: "core",
  method: "GET",
  path: "/clients/:clientId/objectives/:objectiveId/generation",
  request: governedObjectiveGenerationReadRequest,
  response: governedObjectiveGenerationObservation,
  source: governedObjectiveGenerationSource,
});
