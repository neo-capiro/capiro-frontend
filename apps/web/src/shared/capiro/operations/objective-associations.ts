import { z } from "zod";
import { defineOperation } from "../contracts";
import { objectiveResourceId as id } from "./objective-destination-binding";
import contract from "./objective-associations.contract.json" with { type: "json" };
import type {
  OperationalCycle,
  OperationalResource,
  OperationalRevision,
  OperationalScope,
  OperationalCurrentObjective,
} from "./objective-operational-types";

export type ObjectiveAssociationItem = {
  associationId: string;
  linkedRevision: OperationalRevision;
  linkedAt: string;
  resource: OperationalResource;
  cycles: OperationalCycle[];
};
export type ObjectiveAssociationPage = {
  schemaVersion: 1;
  scope: OperationalScope;
  associationSetVersion: number;
  observedAt: string;
  asOf: string;
  pageCoverage: "complete" | "partial";
  nextCursor: string | null;
  items: ObjectiveAssociationItem[];
};
const native = z.fromJSONSchema(
  contract as Parameters<typeof z.fromJSONSchema>[0],
) as z.ZodType<ObjectiveAssociationPage>;
export const objectiveAssociationPage = native.refine(
  (page) =>
    new Set(page.items.map((row) => row.associationId)).size ===
      page.items.length &&
    page.items.every(
      (row) =>
        [
          "strategy",
          "planner_project",
          "planner_task",
          "outreach_session",
          "meeting",
        ].includes(row.resource.selection.kind) &&
        row.linkedRevision.version <= page.scope.objectiveVersion &&
        (row.linkedRevision.version !== page.scope.objectiveVersion ||
          row.linkedRevision.id === page.scope.currentRevisionId) &&
        (row.resource.selection.kind === "strategy" || row.cycles.length === 0),
    ),
  "The manual association inventory is inconsistent.",
);

export function requireObjectiveAssociationPage(
  value: unknown,
  objective: OperationalCurrentObjective,
  request: { limit: number; cursor?: string },
  prior?: ObjectiveAssociationPage,
) {
  const page = objectiveAssociationPage.parse(value);
  if (
    page.scope.clientId !== objective.clientId ||
    page.scope.objectiveId !== objective.id ||
    page.scope.objectiveVersion !== objective.version ||
    page.scope.objectiveStatus !== objective.status ||
    page.items.length > request.limit ||
    (page.nextCursor !== null && page.nextCursor === request.cursor) ||
    (request.cursor &&
      (!prior ||
        prior.nextCursor !== request.cursor ||
        page.asOf !== prior.asOf ||
        page.associationSetVersion !== prior.associationSetVersion ||
        page.scope.currentRevisionId !== prior.scope.currentRevisionId ||
        page.items.some((row) =>
          prior.items.some((item) => item.associationId === row.associationId),
        )))
  )
    throw new Error(
      "The association inventory changed. Refresh it before continuing.",
    );
  return page;
}
export const objectiveAssociationOperations = {
  "objectives.operational.associations": defineOperation({
    service: "core",
    method: "GET",
    path: "/clients/:clientId/objectives/operational-associations",
    request: z
      .object({
        params: z.object({ clientId: id }).strict(),
        query: z
          .object({
            schemaVersion: z.literal(1),
            objectiveId: id,
            limit: z.number().int().min(1).max(100),
            cursor: z.string().min(1).max(2048).optional(),
          })
          .strict(),
      })
      .strict(),
    response: objectiveAssociationPage,
    source:
      "capiro-backend@0d03315917024a5f7a8d52592b477c6dd0255ae3 docs/a2-source-20261023/OBJECTIVE-ASSOCIATIONS.schema.json sha256:894b14dfa29fdbc887818621aad94cf7e96108a5c6af41daf3acedd45e648799",
  }),
} as const;
