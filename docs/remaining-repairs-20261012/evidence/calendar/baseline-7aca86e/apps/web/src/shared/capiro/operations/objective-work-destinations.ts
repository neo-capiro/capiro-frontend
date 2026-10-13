import { z } from "zod";
import { defineOperation } from "../contracts";
import { strategyDetail } from "./strategies-schemas";
import { plannerTask } from "./planner-schemas";
import { savedNewsletterRevision } from "./workspace-newsletter-staging";
import {
  objectiveDestinationBinding,
  objectiveDestinationQuery,
  objectiveResourceId as id,
  requireObjectiveBinding,
  type ObjectiveDestinationQuery,
} from "./objective-destination-binding";

const strategySource =
  "capirov2@0716767e8b6ff323b2516d166b22edb4d2413e57 docs/objective-strategy-planner-destinations-20261012/CONTRACT.md; StrategyService/PlannerService.objectiveDestination";
export const objectiveStrategyDestination = z
  .object({
    destination: objectiveDestinationBinding
      .extend({ kind: z.literal("strategy") })
      .strict(),
    strategy: strategyDetail,
  })
  .refine(
    ({ destination, strategy }) =>
      destination.resourceId === strategy.id.toLowerCase() &&
      destination.clientId === strategy.clientId.toLowerCase() &&
      strategy.nodes.every(
        (node) =>
          node.strategyId.toLowerCase() === destination.resourceId &&
          !node.archivedAt,
      ),
    "The Objective destination does not match the current client strategy.",
  );
export const objectivePlannerDestination = z
  .object({
    destination: objectiveDestinationBinding
      .extend({
        kind: z.literal("planner_task"),
        destinationVersion: z.number().int().positive(),
      })
      .strict(),
    task: plannerTask,
  })
  .refine(
    ({ destination, task }) =>
      !task.archived &&
      destination.resourceId === task.id.toLowerCase() &&
      destination.clientId === task.clientId?.toLowerCase() &&
      destination.destinationVersion === task.version,
    "The Objective destination does not match the current explicit client task and version.",
  );
export const objectiveWorkspaceDestination = savedNewsletterRevision
  .safeExtend({
    destination: objectiveDestinationBinding
      .extend({ kind: z.literal("workspace_saved_revision"), draftId: id })
      .strict(),
  })
  .refine(
    (value) =>
      value.destination.resourceId === value.versionId.toLowerCase() &&
      value.destination.draftId === value.draftId.toLowerCase() &&
      value.destination.clientId === value.clientId?.toLowerCase(),
    "The Objective destination does not match the selected saved client revision.",
  );
export function requireObjectiveWorkspace(
  value: z.infer<typeof objectiveWorkspaceDestination>,
  draftId: string,
  versionId: string,
  query: ObjectiveDestinationQuery,
) {
  requireObjectiveBinding(value, versionId, query);
  if (value.destination.draftId !== draftId.toLowerCase())
    throw new Error(
      "The destination does not match the selected saved document.",
    );
  return value;
}
const read = z
  .object({
    params: z.object({ id }).strict(),
    query: objectiveDestinationQuery,
  })
  .strict();
export const strategyObjectiveOperations = {
  "strategies.objectiveDestination": defineOperation({
    service: "strategy",
    method: "GET",
    path: "/strategies/:id/objective-destination",
    request: read,
    response: objectiveStrategyDestination,
    source: strategySource,
  }),
} as const;
export const plannerObjectiveOperations = {
  "planner.objectiveDestination": defineOperation({
    service: "strategy",
    method: "GET",
    path: "/planner/tasks/:id/objective-destination",
    request: read,
    response: objectivePlannerDestination,
    source: strategySource,
  }),
} as const;
export const workspaceObjectiveOperations = {
  "workspace.objectiveDestination": defineOperation({
    service: "workspace",
    method: "GET",
    path: "/drafts/:draftId/versions/:versionId/objective-destination",
    request: z
      .object({
        params: z.object({ draftId: id, versionId: id }).strict(),
        query: objectiveDestinationQuery,
      })
      .strict(),
    response: objectiveWorkspaceDestination,
    source:
      "capirov2@c05b85a29a75cbaaa8538fd7f9a97e298a23913e docs/workspace-objective-revisions-20261012/CONTRACT.md; VersionsService.objectiveDestination",
  }),
} as const;
