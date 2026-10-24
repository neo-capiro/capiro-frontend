import wire from "../objective-operational-contract-fixtures.json" with { type: "json" };
import { operationalReadSchema } from "../../src/shared/capiro/operations/objective-operational";
import {
  objectiveSchema,
  objectiveReadiness,
} from "../../src/features/portfolio/objectives/contracts";

export const read = operationalReadSchema.parse(
  wire.examples.find(
    (row) => row.name === "explicit-manual-and-current-owned-resources",
  )!.value,
);
const fields = {
  outcome: "Synthetic Objective",
  governmentProblem: "Synthetic problem",
  askType: "funding" as const,
  minimumWin: "Synthetic win",
  limits: "",
};
export const objective = objectiveSchema.parse({
  ...fields,
  ...read.scope,
  id: read.scope.objectiveId,
  requestId: "00000060-1111-4111-8111-111111111111",
  status: read.scope.objectiveStatus,
  version: read.scope.objectiveVersion,
  readyAt: read.observedAt,
  reviewRequestedAt: null,
  createdAt: read.observedAt,
  updatedAt: read.observedAt,
  readiness: objectiveReadiness(fields),
});
export const strategy = {
  id: "00000061-1111-4111-8111-111111111111",
  clientId: objective.clientId,
  title: "New synthetic Strategy",
  type: "appropriations",
  ownerUserId: null,
  goal: null,
  meriContext: null,
  targetDate: null,
  lastEditedAt: read.observedAt,
  createdAt: read.observedAt,
  createdByUserId: "synthetic",
  lastEditedByUserId: null,
  nodeCount: 0,
  summary: {
    assignedCount: 0,
    unassignedCount: 0,
    completedCount: 0,
    reviewCount: 0,
  },
  nodes: [],
};
const linked = read.sections.strategies.items[0]!;
const provenance = linked.provenance.find((item) => item.kind === "manual")!;
export const inventory = {
  schemaVersion: 1,
  scope: read.scope,
  associationSetVersion: read.associationSetVersion,
  observedAt: read.observedAt,
  asOf: read.observedAt,
  pageCoverage: "complete",
  nextCursor: null,
  items: [
    {
      associationId: provenance.associationId,
      linkedRevision: provenance.linkedRevision,
      linkedAt: provenance.linkedAt,
      resource: linked.resource,
      cycles: linked.cycles,
    },
  ],
};
