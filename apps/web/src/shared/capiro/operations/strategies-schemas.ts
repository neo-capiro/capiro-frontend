import { z } from "zod";
import { STRATEGY_INTAKE_TYPES as strategyTypes } from "@capiro/shared/strategy-intake";
export { strategyTypes };

export const strategyId = z.uuid();
export const strategyDate = z.iso.date();
export const emptyStrategyRequest = z.object({}).strict();
export const strategyParams = z.object({ id: strategyId }).strict();
export const nodeKinds = [
  "action",
  "decision",
  "gate",
  "milestone",
  "risk",
] as const;
export const nodeSubjects = [
  "deliverable",
  "submission",
  "member",
  "committee",
  "ask",
  "agency",
  "outcome",
  "optics",
] as const;
export const nodeStatuses = [
  "draft",
  "in_progress",
  "internal_review",
  "active",
  "suggested",
  "completed",
] as const;
export const nodeTarget = z
  .object({
    memberId: z.string().trim().min(1).max(128),
    clientTargetId: z.string().max(120).optional(),
    memberName: z.string().max(160).optional(),
    party: z.string().max(32).optional(),
    state: z.string().max(64).optional(),
    chamber: z.string().max(24).optional(),
    committee: z.string().max(200).optional(),
    sourceDirectory: z.enum(["congress", "state", "staff"]).optional(),
  })
  .strict();
export const strategyNodeFields = z
  .object({
    kind: z.enum(nodeKinds),
    subject: z.enum(nodeSubjects),
    title: z.string().trim().min(1).max(300),
    note: z.string().max(8000).nullable().optional(),
    ownerUserId: z.string().max(120).nullable().optional(),
    status: z.enum(nodeStatuses).optional(),
    startsOn: strategyDate,
    endsOn: strategyDate.nullable().optional(),
    openEnded: z.boolean().optional(),
    dependsOnIds: z.array(strategyId).max(20).optional(),
    targetRef: nodeTarget.optional(),
  })
  .strict();
export const strategyNode = strategyNodeFields
  .extend({
    id: strategyId,
    strategyId,
    startsOn: z.string(),
    endsOn: z.string().nullable(),
    updatedAt: z.string(),
    meriAuthored: z.boolean().optional(),
    archivedAt: z.string().nullable().optional(),
    targetRef: nodeTarget.nullable().optional(),
  })
  .strip();
export const strategySummary = z.object({
  id: strategyId,
  clientId: strategyId,
  title: z.string(),
  type: z.enum(strategyTypes),
  ownerUserId: z.string().nullable(),
  createdByUserId: z.string(),
  lastEditedByUserId: z.string().nullable(),
  lastEditedAt: z.string(),
  createdAt: z.string(),
  nodeCount: z.number().int(),
  summary: z.object({
    assignedCount: z.number().int(),
    unassignedCount: z.number().int(),
    completedCount: z.number().int(),
    reviewCount: z.number().int(),
  }),
});
export const strategyDetail = z.object({
  id: strategyId,
  clientId: strategyId,
  title: z.string(),
  type: z.enum(strategyTypes),
  ownerUserId: z.string().nullable(),
  goal: z.string().nullable(),
  meriContext: z.string().nullable(),
  targetDate: z.string().nullable(),
  lastEditedAt: z.string(),
  nodes: z.array(strategyNode),
  artifacts: z
    .array(
      z.object({
        id: strategyId,
        nodeId: strategyId,
        artifactType: z.string(),
        artifactRef: z.string(),
      }),
    )
    .optional(),
});
export const firmPhaseFields = z
  .object({
    label: z.string().trim().min(1).max(120),
    startFy: z.number().int().min(2000).max(2100),
    startQ: z.number().int().min(1).max(4),
    endFy: z.number().int().min(2000).max(2100),
    endQ: z.number().int().min(1).max(4),
  })
  .strict();
export const firmPhase = firmPhaseFields
  .extend({
    id: strategyId,
    position: z.number().int(),
    updatedByUserId: z.string().nullable(),
    updatedAt: z.string(),
  })
  .strip();
export const strategyMetadata = z
  .object({
    clientId: strategyId,
    type: z.enum(strategyTypes),
    title: z.string().max(200).optional(),
    goal: z.string().max(4000).optional(),
    ownerUserId: z.string().max(120).optional(),
    targetDate: strategyDate.optional(),
    meriContext: z.string().max(8000).optional(),
  })
  .strict();
export const strategyVersion = z.object({
  id: strategyId,
  authorKind: z.string(),
  authorUserId: z.string().nullable(),
  note: z.string().nullable(),
  restoredFromVersionId: strategyId.nullable(),
  createdAt: z.string(),
});
export type StrategySummary = z.infer<typeof strategySummary>;
export type StrategyDetail = z.infer<typeof strategyDetail>;
export type StrategyNode = z.infer<typeof strategyNode>;
export type FirmPhase = z.infer<typeof firmPhase>;
