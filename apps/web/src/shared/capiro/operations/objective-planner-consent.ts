import { z } from "zod";
import { defineOperation } from "../contracts";
import {
  governedObjectiveCommandReceipt,
  governedObjectiveGenerationObservation,
  governedObjectiveId as id,
  governedObjectiveVersion as version,
} from "./objective-governed-generation";
import {
  requireSavedStrategyReview,
  type SavedStrategySelection,
} from "./objective-saved-review";

export const plannerConsentRequest = z.strictObject({
  params: z.strictObject({ clientId: id, objectiveId: id }),
  body: z.strictObject({
    schemaVersion: z.literal(1),
    requestId: id,
    command: z.literal("retry"),
    workAction: z.literal("objective.plan.prepare"),
    expectedObjectiveVersion: version,
    expectedControlVersion: z.number().int().min(0).max(2147483647),
    expectedCanonicalBindingVersion: version,
    targetAuthorizationRequestId: id.nullable(),
  }),
});
export type PlannerConsentRequest = z.infer<typeof plannerConsentRequest>;
export type PlannerConsentReceipt = z.infer<
  typeof governedObjectiveCommandReceipt
>;
export const plannerConsentRetained = z
  .strictObject({
    request: plannerConsentRequest,
    origin: governedObjectiveGenerationObservation,
    receipt: governedObjectiveCommandReceipt.optional(),
  })
  .superRefine((value, ctx) => {
    try {
      requirePlannerConsentOrigin(value.origin, value.request);
      if (value.receipt)
        requirePlannerConsentReceipt(
          value.receipt,
          value.request,
          value.origin,
        );
    } catch {
      ctx.addIssue({
        code: "custom",
        message: "Planner consent recovery is inconsistent.",
      });
    }
  });
export type RetainedPlannerConsent = z.infer<typeof plannerConsentRetained>;

export function requirePlannerConsentOrigin(
  raw: unknown,
  request: PlannerConsentRequest,
) {
  const origin = governedObjectiveGenerationObservation.parse(raw),
    c = request.body;
  if (
    origin.clientId !== request.params.clientId ||
    origin.objective.id !== request.params.objectiveId ||
    origin.workAction !== c.workAction ||
    origin.objective.status !== "ready" ||
    origin.objective.revision.version !== c.expectedObjectiveVersion ||
    origin.requestedSource.revision.id !== origin.objective.revision.id ||
    origin.requestedSource.revision.version !== c.expectedObjectiveVersion ||
    origin.requestedSource.canonicalBindingVersion !==
      c.expectedCanonicalBindingVersion ||
    origin.control.version !== c.expectedControlVersion ||
    origin.control.currentAuthorizationRequestId !==
      c.targetAuthorizationRequestId ||
    origin.commandReceipt !== null
  )
    throw new Error("Planner consent does not match the current Objective.");
  return origin;
}
export function requirePlannerConsentSelection(
  raw: unknown,
  savedRaw: unknown,
  selection: SavedStrategySelection,
) {
  const saved = requireSavedStrategyReview(savedRaw, selection);
  const origin = governedObjectiveGenerationObservation.parse(raw);
  if (
    origin.objective.revision.id !== saved.source.objectiveRevisionId ||
    origin.reconciliation === "outcome_unconfirmed" ||
    (origin.accounting?.outcome === "applied" &&
      origin.accounting.sourceRevision.id ===
        saved.source.objectiveRevisionId) ||
    (origin.consent &&
      !origin.consent.expired &&
      origin.control.cancelledAt === null)
  )
    throw new Error(
      "Refresh the existing Planner operation before requesting new consent.",
    );
  if (
    origin.clientId !== selection.query.clientId ||
    origin.objective.id !== selection.query.objectiveId ||
    origin.objective.revision.version !== selection.query.objectiveVersion ||
    origin.workAction !== "objective.plan.prepare" ||
    origin.objective.status !== "ready" ||
    origin.commandReceipt !== null
  )
    throw new Error("The Planner source is no longer current.");
  return origin;
}
export function plannerConsentFor(
  raw: unknown,
  savedRaw: unknown,
  selection: SavedStrategySelection,
  requestId: string,
) {
  const origin = requirePlannerConsentSelection(raw, savedRaw, selection);
  const request = plannerConsentRequest.parse({
    params: {
      clientId: selection.query.clientId,
      objectiveId: selection.query.objectiveId,
    },
    body: {
      schemaVersion: 1,
      requestId,
      command: "retry",
      workAction: "objective.plan.prepare",
      expectedObjectiveVersion: selection.query.objectiveVersion,
      expectedControlVersion: origin.control.version,
      expectedCanonicalBindingVersion:
        origin.requestedSource.canonicalBindingVersion,
      targetAuthorizationRequestId:
        origin.control.currentAuthorizationRequestId,
    },
  });
  requirePlannerConsentOrigin(origin, request);
  return { request, origin };
}
export function requirePlannerConsentReceipt(
  raw: unknown,
  request: PlannerConsentRequest,
  originRaw: unknown,
) {
  const origin = requirePlannerConsentOrigin(originRaw, request),
    r = governedObjectiveCommandReceipt.parse(raw),
    c = request.body;
  if (
    r.requestId !== c.requestId ||
    r.clientId !== request.params.clientId ||
    r.objectiveId !== request.params.objectiveId ||
    r.command !== "retry" ||
    r.workAction !== c.workAction ||
    r.outcome !== "reconsent_recorded" ||
    r.commandRevision.id !== origin.objective.revision.id ||
    r.commandRevision.version !== c.expectedObjectiveVersion ||
    r.sourceRevision.id !== origin.requestedSource.revision.id ||
    r.sourceRevision.version !== c.expectedObjectiveVersion ||
    r.controlVersionBefore !== c.expectedControlVersion ||
    r.targetAuthorizationRequestId !== c.targetAuthorizationRequestId
  )
    throw new Error(
      "The Planner consent receipt does not match the original command.",
    );
  return r;
}
export const objectivePlannerConsentOperation = defineOperation({
  service: "core",
  method: "POST",
  path: "/clients/:clientId/objectives/:objectiveId/generation/commands",
  request: plannerConsentRequest,
  response: governedObjectiveCommandReceipt,
  source:
    "Core ObjectiveWorkController.command / ObjectivePlannerWorkOwner; canonical continuation worker",
  requestLimitBytes: 2048,
});
