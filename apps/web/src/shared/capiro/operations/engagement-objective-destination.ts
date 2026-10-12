import { z } from "zod";
import { defineOperation } from "../contracts";
import { engagementSessionOperations } from "./engagement-sessions";
const id = z.uuid().transform((value) => value.toLowerCase());
export const objectiveDestinationQuery = z
  .object({
    clientId: id,
    objectiveId: id,
    objectiveVersion: z.number().int().min(1).max(2147483647),
  })
  .strict();
export type ObjectiveDestinationQuery = z.infer<
  typeof objectiveDestinationQuery
>;
export const objectiveOutreachDestination = engagementSessionOperations[
  "engagement.session"
].response
  .extend({
    destination: objectiveDestinationQuery
      .extend({
        kind: z.literal("outreach_session"),
        resourceId: id,
        objectiveRevisionId: id,
        destinationStateVersion: z.number().int().positive(),
      })
      .strict(),
  })
  .refine(
    ({ destination, session, currentStateVersion, spec }) =>
      destination.resourceId === session.id.toLowerCase() &&
      destination.destinationStateVersion === currentStateVersion &&
      session.currentStateVersion === currentStateVersion &&
      session.status === "active" &&
      session.archivedAt === null &&
      spec.sponsor.kind === "client" &&
      spec.sponsor.clientRefs.length === 1 &&
      spec.sponsor.clientRefs[0]!.clientId.toLowerCase() ===
        destination.clientId,
    "The Objective destination does not match the current active session and exact client sponsor.",
  );
export function requireObjectiveDestination(
  value: z.infer<typeof objectiveOutreachDestination>,
  sessionId: string,
  query: ObjectiveDestinationQuery,
) {
  const selected = objectiveDestinationQuery.parse(query),
    d = value.destination;
  if (
    d.resourceId !== sessionId.toLowerCase() ||
    d.clientId !== selected.clientId ||
    d.objectiveId !== selected.objectiveId ||
    d.objectiveVersion !== selected.objectiveVersion
  )
    throw new Error(
      "The destination does not match the selected current Objective version.",
    );
  return value;
}
export const objectiveDestinationOperations = {
  "engagement.objectiveDestination": defineOperation({
    service: "core",
    method: "GET",
    path: "/engagement/outreach-v3/sessions/:sessionId/objective-destination",
    request: z
      .object({
        params: z.object({ sessionId: id }).strict(),
        query: objectiveDestinationQuery,
      })
      .strict(),
    response: objectiveOutreachDestination,
    source:
      "capirov2@4a784b58a0d41251ae6d7dea75a9b4858abc8665 docs/objective-destinations-20261012/CONTRACT.md; OutreachSessionService",
  }),
} as const;
