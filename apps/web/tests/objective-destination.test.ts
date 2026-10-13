import { expect, it } from "vitest";
import {
  objectiveDestinationOperations,
  objectiveDestinationQuery,
  objectiveOutreachDestination,
  requireObjectiveDestination,
} from "../src/shared/capiro/operations/engagement-objective-destination";
import { session, sessionId } from "./newsletter-staging-fixtures";
const clientId = "30000000-0000-4000-8000-000000000001",
  objectiveId = "40000000-0000-4000-8000-000000000001";
const query = { clientId, objectiveId, objectiveVersion: 7 };
const bound = {
  ...session,
  spec: {
    ...session.spec,
    sponsor: {
      kind: "client",
      label: "Synthetic client",
      clientRefs: [{ clientId }],
    },
  },
  destination: {
    ...query,
    kind: "outreach_session",
    resourceId: sessionId,
    objectiveRevisionId: "50000000-0000-4000-8000-000000000001",
    destinationStateVersion: 3,
  },
};
it("only exposes a read-only exact owner resolver without caller revision or actor claims", () => {
  const operation =
    objectiveDestinationOperations["engagement.objectiveDestination"];
  expect(operation).toMatchObject({
    method: "GET",
    service: "core",
    path: "/engagement/outreach-v3/sessions/:sessionId/objective-destination",
  });
  for (const key of [
    "kind",
    "url",
    "actorId",
    "tenantId",
    "objectiveRevisionId",
  ])
    expect(
      operation.request.safeParse({
        params: { sessionId },
        query: { ...query, [key]: "unsupported" },
      }).success,
    ).toBe(false);
  expect(
    objectiveDestinationQuery.safeParse({
      ...query,
      objectiveVersion: 2147483648,
    }).success,
  ).toBe(false);
});
it("requires current active exact client sponsor and matching canonical resource/state", () => {
  expect(objectiveOutreachDestination.safeParse(bound).success).toBe(true);
  for (const kind of ["firm", "multi_client", "coalition", "undecided"])
    expect(
      objectiveOutreachDestination.safeParse({
        ...bound,
        spec: {
          ...bound.spec,
          sponsor: { kind, label: null, clientRefs: [{ clientId }] },
        },
      }).success,
    ).toBe(false);
  expect(
    objectiveOutreachDestination.safeParse({
      ...bound,
      destination: { ...bound.destination, destinationStateVersion: 4 },
    }).success,
  ).toBe(false);
  expect(
    objectiveOutreachDestination.safeParse({
      ...bound,
      session: { ...bound.session, archivedAt: "2026-10-12T12:00:00Z" },
    }).success,
  ).toBe(false);
});
it("binds normalized client/objective/version to the selected session on every open", () => {
  const response = objectiveOutreachDestination.parse(bound);
  expect(() =>
    requireObjectiveDestination(response, sessionId, query),
  ).not.toThrow();
  for (const changes of [
    { clientId: sessionId },
    { objectiveId: sessionId },
    { objectiveVersion: 6 },
  ])
    expect(() =>
      requireObjectiveDestination(response, sessionId, {
        ...query,
        ...changes,
      }),
    ).toThrow();
});
