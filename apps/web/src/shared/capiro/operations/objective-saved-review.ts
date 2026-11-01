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
