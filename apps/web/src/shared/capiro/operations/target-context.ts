import { z } from "zod";
import { defineOperation } from "../contracts";
import { objectiveFieldsSchema, objectiveStatus } from "./objective-fields";
import {
  nodeKinds,
  nodeSubjects,
  nodeStatuses,
  strategyDate,
} from "./strategies-schemas";

const id = z.uuid().transform((value) => value.toLowerCase());
export const targetObjective = objectiveFieldsSchema
  .pick({ outcome: true, askType: true, minimumWin: true })
  .extend({ id, status: objectiveStatus, version: z.number().int().positive() })
  .strict();
export const targetStep = z
  .object({
    id,
    strategyId: id,
    strategyTitle: z.string(),
    title: z.string(),
    kind: z.enum(nodeKinds),
    subject: z.enum(nodeSubjects),
    status: z.enum(nodeStatuses),
    startsOn: strategyDate,
    endsOn: strategyDate.nullable(),
    openEnded: z.boolean(),
  })
  .strict();
const envelope = z.object({
  schemaVersion: z.literal(1),
  clientId: id,
  targetId: id,
  nextCursor: id.nullable(),
});
export const targetContextPage = z
  .discriminatedUnion("section", [
    envelope
      .extend({
        section: z.literal("objectives"),
        items: z.array(targetObjective).max(25),
      })
      .strict(),
    envelope
      .extend({
        section: z.literal("steps"),
        items: z.array(targetStep).max(25),
      })
      .strict(),
  ])
  .refine(
    (page) =>
      page.items.every((row, i) => !i || page.items[i - 1]!.id < row.id) &&
      (page.nextCursor === null ||
        (page.items.length === 25 &&
          page.nextCursor === page.items.at(-1)!.id)),
    "Target context pagination is inconsistent.",
  );
export const targetContextRequest = z
  .object({
    params: z.object({ clientId: id, targetId: id }).strict(),
    query: z
      .object({
        section: z.enum(["objectives", "steps"]),
        after: id.optional(),
      })
      .strict(),
  })
  .strict();
export type TargetContextPage = z.infer<typeof targetContextPage>;
export type TargetContextRequest = z.infer<typeof targetContextRequest>;

export function matchesTargetContext(
  page: TargetContextPage,
  input: TargetContextRequest,
) {
  return (
    page.clientId === input.params.clientId &&
    page.targetId === input.params.targetId &&
    page.section === input.query.section &&
    page.items.every((row) => !input.query.after || row.id > input.query.after)
  );
}
export const targetContextOperations = {
  "directory.targetContext": defineOperation({
    service: "core",
    method: "GET",
    path: "/clients/:clientId/targets/:targetId/context",
    request: targetContextRequest,
    response: targetContextPage,
    source:
      "neo-capiro/capiro-backend@46d1d36734e6e30592db42ac2228044156d1a44f apps/api/src/clients/client-target-context.ts readTargetContext",
  }),
} as const;
