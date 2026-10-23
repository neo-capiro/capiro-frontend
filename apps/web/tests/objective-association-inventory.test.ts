import { describe, expect, it } from "vitest";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import wire from "./objective-operational-contract-fixtures.json";
import { operationalReadSchema } from "../src/shared/capiro/operations/objective-operational";
import {
  objectiveAssociationOperations,
  objectiveAssociationPage,
  requireObjectiveAssociationPage,
} from "../src/shared/capiro/operations/objective-associations";

function fixture() {
  const read = operationalReadSchema.parse(
    wire.examples.find(
      (entry) => entry.name === "explicit-manual-and-current-owned-resources",
    )!.value,
  );
  const row = read.sections.strategies.items[0]!;
  const provenance = row.provenance.find((item) => item.kind === "manual")!;
  const page = objectiveAssociationPage.parse({
    schemaVersion: 1,
    scope: read.scope,
    associationSetVersion: 4,
    observedAt: read.observedAt,
    asOf: read.observedAt,
    pageCoverage: "complete",
    nextCursor: "synthetic:next",
    items: [
      {
        associationId: provenance.associationId,
        linkedRevision: provenance.linkedRevision,
        linkedAt: provenance.linkedAt,
        resource: row.resource,
        cycles: row.cycles,
      },
    ],
  });
  const objective = {
    clientId: read.scope.clientId,
    id: read.scope.objectiveId,
    version: read.scope.objectiveVersion,
    status: read.scope.objectiveStatus,
  };
  return { page, objective };
}

describe("canonical manual-association inventory receiver", () => {
  it("pins exact Core schema bytes and strict GET selectors", () => {
    const bytes = readFileSync(
      new URL(
        "../src/shared/capiro/operations/objective-associations.contract.json",
        import.meta.url,
      ),
    );
    expect(createHash("sha256").update(bytes).digest("hex")).toBe(
      "894b14dfa29fdbc887818621aad94cf7e96108a5c6af41daf3acedd45e648799",
    );
    const op =
        objectiveAssociationOperations["objectives.operational.associations"],
      { objective } = fixture();
    const input = {
      params: { clientId: objective.clientId },
      query: { schemaVersion: 1, objectiveId: objective.id, limit: 25 },
    };
    expect(op).toMatchObject({
      method: "GET",
      path: "/clients/:clientId/objectives/operational-associations",
    });
    expect(op.request.parse(input)).toEqual(input);
    for (const query of [
      { ...input.query, limit: 0 },
      { ...input.query, limit: 101 },
      { ...input.query, cursor: "" },
      { ...input.query, tenantId: objective.clientId },
    ])
      expect(op.request.safeParse({ ...input, query }).success).toBe(false);
  });
  it("rejects foreign scope, stale Objective, malformed provenance and duplicate rows", () => {
    const { page, objective } = fixture();
    expect(
      requireObjectiveAssociationPage(page, objective, { limit: 25 }),
    ).toEqual(page);
    for (const scope of [
      { ...objective, clientId: objective.id },
      { ...objective, id: objective.clientId },
      { ...objective, version: objective.version + 1 },
      { ...objective, status: "draft" as const },
    ])
      expect(() =>
        requireObjectiveAssociationPage(page, scope, { limit: 25 }),
      ).toThrow();
    expect(
      objectiveAssociationPage.safeParse({
        ...page,
        items: [page.items[0], page.items[0]],
      }).success,
    ).toBe(false);
    const wrongRevision = {
      ...page.items[0]!,
      linkedRevision: {
        id: page.items[0]!.linkedRevision.id,
        version: page.scope.objectiveVersion,
      },
    };
    expect(
      objectiveAssociationPage.safeParse({ ...page, items: [wrongRevision] })
        .success,
    ).toBe(false);
    expect(() =>
      requireObjectiveAssociationPage(page, objective, { limit: 0 }),
    ).toThrow();
  });
  it("accepts empty partial pages without manufacturing completeness or hidden metadata", () => {
    const { page, objective } = fixture();
    const hidden = { ...page, items: [], pageCoverage: "partial" as const };
    expect(
      requireObjectiveAssociationPage(hidden, objective, { limit: 25 }),
    ).toEqual(hidden);
    for (const extra of [
      { total: 5 },
      { hiddenIds: [objective.id] },
      { deniedCount: 1 },
    ])
      expect(
        objectiveAssociationPage.safeParse({ ...hidden, ...extra }).success,
      ).toBe(false);
  });
  it("requires exact prior cursor, cutoff, set and revision and refuses repeated rows", () => {
    const { page, objective } = fixture();
    const next = { ...page, items: [], nextCursor: null };
    const request = { limit: 25, cursor: page.nextCursor! };
    expect(
      requireObjectiveAssociationPage(next, objective, request, page),
    ).toEqual(next);
    for (const changed of [
      page,
      { ...next, asOf: "2026-10-16T12:00:00.000Z" },
      { ...next, associationSetVersion: 5 },
      { ...next, scope: { ...next.scope, currentRevisionId: objective.id } },
    ])
      expect(() =>
        requireObjectiveAssociationPage(changed, objective, request, page),
      ).toThrow();
    expect(() =>
      requireObjectiveAssociationPage(next, objective, request),
    ).toThrow();
    expect(() =>
      requireObjectiveAssociationPage(
        next,
        objective,
        { ...request, cursor: "synthetic:other" },
        page,
      ),
    ).toThrow();
  });
  it("keeps ordinary tasks, Outreach and meetings independently from projection filters", () => {
    const { page, objective } = fixture();
    for (const kind of [
      "planner_project",
      "planner_task",
      "outreach_session",
      "meeting",
    ] as const) {
      const row = {
        ...page.items[0]!,
        cycles: [],
        resource: {
          ...page.items[0]!.resource,
          selection: { ...page.items[0]!.resource.selection, kind },
        },
      };
      expect(
        requireObjectiveAssociationPage({ ...page, items: [row] }, objective, {
          limit: 25,
        }).items[0]?.resource.selection.kind,
      ).toBe(kind);
      expect(
        objectiveAssociationPage.safeParse({
          ...page,
          items: [{ ...row, cycles: page.items[0]!.cycles }],
        }).success,
      ).toBe(false);
    }
  });
});
