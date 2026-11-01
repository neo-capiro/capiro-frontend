import { z } from "zod";
import { defineOperation } from "../contracts";
import {
  objectiveDestinationBinding,
  objectiveDestinationQuery,
  objectiveResourceId as id,
  requireObjectiveBinding,
  type ObjectiveDestinationQuery,
} from "./objective-destination-binding";

const source = objectiveDestinationQuery
  .extend({
    generationJobId: id,
    generationRequestId: id,
    objectiveRevisionId: id,
    strategyId: id,
    strategyVersionId: id,
    snapshotDigest: z.string().regex(/^[a-f0-9]{64}$/),
  })
  .strict();
const savedNode = z
  .object({
    id,
    kind: z.string(),
    subject: z.string(),
    title: z.string(),
    note: z.string().nullable(),
    ownerUserId: z.string().nullable(),
    status: z.string(),
    startsOn: z.iso.date(),
    endsOn: z.iso.date().nullable(),
    openEnded: z.boolean(),
    dependsOnIds: z.array(id),
  })
  .strict();
export const objectiveSavedReview = z
  .object({
    destination: objectiveDestinationBinding
      .extend({ kind: z.literal("strategy_saved_review") })
      .strict(),
    source,
    savedAt: z.iso.datetime(),
    context: z
      .object({
        state: z.literal("complete"),
        compiledAt: z.iso.datetime(),
        reobservedAt: z.iso.datetime(),
      })
      .strict(),
    snapshot: z
      .object({
        meta: z
          .object({
            id,
            clientId: id,
            title: z.string(),
            type: z.string(),
            goal: z.string().nullable(),
            targetDate: z.iso.date().nullable(),
            ownerUserId: z.string(),
          })
          .strict(),
        nodes: z.array(savedNode),
      })
      .strict(),
    currentNodes: z.array(
      z
        .object({
          sourceNodeId: id,
          availability: z.enum(["available", "archived", "unavailable"]),
        })
        .strict(),
    ),
  })
  .strict()
  .superRefine((v, ctx) => {
    const s = v.source,
      d = v.destination;
    const nodes = v.snapshot.nodes.map((n) => n.id);
    if (
      d.resourceId !== s.strategyId ||
      d.clientId !== s.clientId ||
      d.objectiveId !== s.objectiveId ||
      d.objectiveVersion !== s.objectiveVersion ||
      d.objectiveRevisionId !== s.objectiveRevisionId ||
      v.snapshot.meta.id !== s.strategyId ||
      v.snapshot.meta.clientId !== s.clientId ||
      new Set(nodes).size !== nodes.length ||
      v.currentNodes.length !== nodes.length ||
      new Set(v.currentNodes.map((n) => n.sourceNodeId)).size !==
        nodes.length ||
      v.currentNodes.some((n) => !nodes.includes(n.sourceNodeId))
    )
      ctx.addIssue({
        code: "custom",
        message: "Saved Strategy binding is inconsistent.",
      });
  });

export type SavedStrategySelection = {
  query: ObjectiveDestinationQuery;
  ids: {
    strategyId: string;
    strategyVersionId: string;
    generatedJobId: string;
  };
};
export function requireSavedStrategyReview(
  value: unknown,
  selected: SavedStrategySelection,
) {
  const checked = objectiveSavedReview.parse(value);
  requireObjectiveBinding(checked, selected.ids.strategyId, selected.query);
  if (
    checked.source.generationJobId !==
      selected.ids.generatedJobId.toLowerCase() ||
    checked.source.strategyVersionId !==
      selected.ids.strategyVersionId.toLowerCase()
  )
    throw new Error(
      "The saved Strategy does not match the selected generation and version.",
    );
  return checked;
}

export const objectiveSavedReviewOperation = defineOperation({
  service: "strategy",
  method: "GET",
  path: "/strategies/:id/objective-saved-review",
  request: z
    .object({
      params: z.object({ id }).strict(),
      query: objectiveDestinationQuery
        .extend({ generationJobId: id, strategyVersionId: id })
        .strict(),
    })
    .strict(),
  response: objectiveSavedReview,
  source:
    "Core StrategyService.objectiveSavedReview; receipt-bound immutable sp_version projection",
});

const citation = z.discriminatedUnion("state", [
  z
    .object({ index: z.number().int().min(0), state: z.literal("unavailable") })
    .strict(),
  z
    .object({
      index: z.number().int().min(0),
      state: z.literal("changed"),
      version: z.string().regex(/^[a-f0-9]{64}$/),
    })
    .strict(),
  z
    .object({
      index: z.number().int().min(0),
      state: z.literal("available"),
      kind: z.enum(["context_fact", "governed_memory", "reference_calendar"]),
      title: z.string().max(24000),
      text: z.string().max(24000),
      textComplete: z.boolean(),
      locator: z.string().max(24000),
      version: z.string().regex(/^[a-f0-9]{64}$/),
      asOfMs: z.number().int().nonnegative(),
    })
    .strict(),
]);
export const objectiveSavedCitations = z
  .object({
    source,
    nodes: z.array(
      z
        .object({ sourceNodeId: id, citations: z.array(citation).max(64) })
        .strict(),
    ),
  })
  .strict();
export function requireSavedObjectiveCitations(
  raw: unknown,
  saved: z.infer<typeof objectiveSavedReview>,
) {
  const result = objectiveSavedCitations.parse(raw);
  if (
    Object.keys(saved.source).some(
      (key) =>
        result.source[key as keyof typeof result.source] !==
        saved.source[key as keyof typeof saved.source],
    ) ||
    result.nodes.length !== saved.snapshot.nodes.length ||
    new Set(result.nodes.map((n) => n.sourceNodeId)).size !==
      result.nodes.length ||
    result.nodes.some(
      (n) =>
        !saved.snapshot.nodes.some((s) => s.id === n.sourceNodeId) ||
        n.citations.some((c, index) => c.index !== index),
    )
  )
    throw new Error("Saved source selection changed.");
  return result;
}
export const objectiveSavedCitationsOperation = defineOperation({
  service: "strategy",
  method: "GET",
  path: "/strategies/:id/objective-saved-citations",
  request: objectiveSavedReviewOperation.request,
  response: objectiveSavedCitations,
  source:
    "Core original Strategy publication plus current authorized Objective source evidence",
});
