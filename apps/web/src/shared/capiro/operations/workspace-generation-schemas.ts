import { z } from "zod";
import { workspaceId } from "./workspace-schemas";

// Closed receiving schema leaves for the Workspace Document Agent. `apps/workspace`
// is the only producer; every object is strict so a drifted server shape is
// refused rather than silently coerced. Kept apart from the operation map so
// neither file crosses the repository size-review threshold.
export const revision = z.number().int().min(0).max(2147483647);
export const draftParams = z.strictObject({ draftId: workspaceId });
export const draftRequest = z.strictObject({ params: draftParams });
export const revisionBody = z.strictObject({ expectedRevision: revision });
export const draftMutation = z.strictObject({
  params: draftParams,
  body: revisionBody,
});
export const runParams = z.strictObject({ runId: workspaceId });

export const documentAgentPhase = z.enum([
  "type",
  "blueprint",
  "design",
  "goal",
  "brief",
  "context",
  "outline",
  "generate",
  "draft",
  "quality",
  "complete",
]);
export const agentStatus = z.enum([
  "active",
  "needs_input",
  "ready",
  "generating",
  "partial",
  "failed",
  "complete",
]);
export const generationMode = z.enum(["quick", "standard", "max"]);
export const agentDocumentType = z.strictObject({
  id: z.string().min(1),
  label: z.string(),
  product: z.string(),
});
export const blueprintPin = z.strictObject({
  blueprintId: z.string().min(1),
  versionId: z.string().min(1),
  version: z.number().int().min(1).max(Number.MAX_SAFE_INTEGER),
  definitionHash: z.string().regex(/^[a-f0-9]{64}$/),
});
export const agentTheme = z.strictObject({
  id: z.string().min(1),
  name: z.string(),
  version: z.number().int().optional(),
  settings: z.record(z.string(), z.unknown()),
});
export const agentGoal = z.strictObject({
  text: z.string(),
  client: z.string().nullable().optional(),
  createdAt: z.string(),
});
export const assumption = z.strictObject({
  id: z.string(),
  text: z.string(),
  status: z.enum(["open", "confirmed", "rejected"]),
});

export const brief = z.strictObject({
  objective: z.string().optional(),
  audience: z.string().optional(),
  desiredAction: z.string().optional(),
  subject: z.string().optional(),
  centralArgument: z.string().optional(),
  evidenceInstructions: z.string().optional(),
  tone: z.string().optional(),
  targetPages: z.number().int().optional(),
  deadline: z.string().optional(),
  assumptions: z.array(assumption),
  provenance: z.record(
    z.string(),
    z.enum(["user", "retrieved", "suggested", "assumed"]),
  ),
  approvedAt: z.string().optional(),
  approvedBy: z.string().optional(),
});
export const contextConflict = z.strictObject({
  id: z.string(),
  itemIds: z.array(z.string()),
  type: z.enum([
    "numeric",
    "date",
    "status",
    "authority",
    "freshness",
    "semantic",
  ]),
  description: z.string(),
  recommendedResolution: z.string(),
  resolved: z.boolean(),
  resolution: z.string().nullable().optional(),
});
export const contextCoverage = z.strictObject({
  plannedClaims: z.number(),
  supportedClaims: z.number(),
  missingClaims: z.array(
    z.strictObject({
      claimId: z.string(),
      description: z.string(),
      recommendedSourceTypes: z.array(z.string()),
    }),
  ),
});
export const contextPlan = z.strictObject({
  includedItemIds: z.array(z.string()),
  excludedItems: z.array(
    z.strictObject({ itemId: z.string(), reason: z.string() }),
  ),
  conflicts: z.array(contextConflict),
  coverage: contextCoverage,
  snapshotHash: z.string().optional(),
  approvedAt: z.string().optional(),
  approvedBy: z.string().optional(),
});
export const outlineSection = z.strictObject({
  id: z.string().min(1),
  title: z.string(),
  purpose: z.string(),
  instructions: z.string(),
  required: z.boolean(),
  locked: z.boolean(),
  targetWords: z.strictObject({ min: z.number(), max: z.number() }),
  evidenceItemIds: z.array(z.string()),
});
export const outline = z.strictObject({
  version: z.number(),
  sections: z.array(outlineSection),
  approvedAt: z.string().optional(),
  approvedBy: z.string().optional(),
});
export const generationStage = z.strictObject({
  name: z.enum([
    "preflight",
    "evidence_plan",
    "narrative_plan",
    "drafting",
    "editorial_pass",
    "assurance",
    "snapshot",
    "complete",
  ]),
  status: z.enum(["pending", "active", "done", "failed", "skipped"]),
  startedAt: z.string().optional(),
  completedAt: z.string().optional(),
  detail: z.string().optional(),
});
export const agentRunSummary = z.strictObject({
  runId: z.string().min(1),
  mode: generationMode,
  startedAt: z.string(),
  completedAt: z.string().optional(),
  status: z.enum([
    "active",
    "complete",
    "complete_with_warnings",
    "partial",
    "failed",
  ]),
  stages: z.array(generationStage),
  sectionResults: z
    .record(
      z.string(),
      z.strictObject({
        status: z.enum(["succeeded", "failed", "stale"]),
        error: z.string().optional(),
      }),
    )
    .optional(),
});
export const generation = z.strictObject({
  mode: generationMode,
  activeRunId: z.string().optional(),
  lastRun: agentRunSummary.optional(),
});
export const agentQualitySummary = z.strictObject({
  score: z.number(),
  evaluatedAt: z.string(),
  blockers: z.array(z.string()),
  recommendations: z.array(z.string()),
});
export const documentAgentState = z.strictObject({
  schemaVersion: z.literal(1),
  revision,
  phase: documentAgentPhase,
  status: agentStatus,
  documentType: agentDocumentType.nullable(),
  blueprintPin: blueprintPin.nullable(),
  theme: agentTheme.nullable(),
  goal: agentGoal.nullable(),
  brief,
  contextPlan,
  outline,
  generation,
  quality: agentQualitySummary.optional(),
  pendingProposalId: z.string().optional(),
});
export const stateResponse = z.strictObject({ state: documentAgentState });

export const agentMessage = z.strictObject({
  id: z.string().min(1),
  tenantId: z.string().min(1),
  draftId: z.string().min(1),
  actorId: z.string().nullable(),
  role: z.enum(["user", "assistant", "system"]),
  phase: z.string(),
  text: z.string(),
  data: z.unknown(),
  createdAt: z.string(),
});
export const agentProposal = z.strictObject({
  id: z.string().min(1),
  tenantId: z.string().min(1),
  draftId: z.string().min(1),
  createdById: z.string(),
  type: z.string(),
  status: z.enum(["pending", "accepted", "rejected", "stale"]),
  baseRevision: revision,
  baseHash: z.string(),
  payload: z.unknown(),
  createdAt: z.string(),
  decidedAt: z.string().nullable(),
  decidedById: z.string().nullable(),
});
export const agentContextItem = z.strictObject({
  id: z.string().min(1),
  tenantId: z.string().min(1),
  draftId: z.string().min(1),
  kind: z.string(),
  payload: z.unknown(),
  createdAt: z.string(),
});
export const agentQualityCheck = z.strictObject({
  id: z.string().min(1),
  label: z.string(),
  status: z.enum(["success", "notable", "critical"]),
  detail: z.string(),
  fixable: z.boolean(),
  severity: z.enum(["critical", "high", "medium", "low"]),
  section: z.string().nullable().optional(),
});
export const agentQualityEvaluation = z.strictObject({
  score: z.number(),
  readiness: z.enum(["ready", "ready_with_recommendations", "not_ready"]),
  blockers: z.array(z.string()),
  recommendations: z.array(z.string()),
  checks: z.array(agentQualityCheck),
});
export const runSectionState = z.strictObject({
  status: z.string(),
  error: z.string().optional(),
  contentHash: z.string().optional(),
  citations: z
    .array(
      z.strictObject({
        n: z.number(),
        token: z.string(),
        kind: z.string(),
        refId: z.string(),
        label: z.string(),
      }),
    )
    .optional(),
});
export const generationRunStage = z.strictObject({
  name: z.string(),
  status: z.string(),
  startedAt: z.string().optional(),
  completedAt: z.string().optional(),
  detail: z.string().optional(),
});
export const generationRunStatus = z.strictObject({
  runId: z.string().min(1),
  status: z.string(),
  stage: z.string(),
  stages: z.array(generationRunStage),
  sectionStates: z.record(z.string(), runSectionState),
  provider: z.string().optional(),
  model: z.string().optional(),
  reasoningLevel: z.string().optional(),
  errorMessage: z.string().optional(),
  startedAt: z.string().optional(),
  completedAt: z.string().optional(),
});

export const intakeBody = z
  .strictObject({
    goal: z.string().min(3).max(10_000),
    clientId: z.string().min(1).optional(),
    blueprintVersionId: z.string().min(1),
    factualAttachmentIds: z.array(z.string()).max(50),
    sampleAttachmentIds: z.array(z.string()).max(20),
    priorWorkspaceDraftIds: z.array(z.string()).max(50),
    selectedContextItemIds: z.array(z.string()).max(50).optional(),
    selectedContextDomains: z.array(z.string()).max(20).optional(),
    pastedContext: z.string().max(50_000).optional(),
    pastedSample: z.string().max(50_000).optional(),
    title: z.string().max(500).optional(),
    audience: z.string().max(200).optional(),
    tone: z.string().max(100).optional(),
    deadline: z.string().max(100).optional(),
    lengthInstruction: z.string().max(200).optional(),
  })
  .refine(
    (value) =>
      new TextEncoder().encode(JSON.stringify(value)).byteLength <= 1_000_000,
    "The intake exceeds the supported byte limit.",
  );
export const intakeResponse = z.strictObject({
  draftId: workspaceId,
  runId: workspaceId,
  status: z.enum(["queued", "active"]),
  agentRevision: revision,
});
export const briefEditBody = z.strictObject({
  expectedRevision: revision,
  objective: z.string().optional(),
  audience: z.string().optional(),
  desiredAction: z.string().optional(),
  subject: z.string().optional(),
  centralArgument: z.string().optional(),
  evidenceInstructions: z.string().optional(),
  tone: z.string().optional(),
  targetPages: z.number().int().min(0).optional(),
  deadline: z.string().optional(),
  assumptions: z.array(assumption).optional(),
});
export const conflictResolutionBody = z.strictObject({
  conflictId: z.string().min(1),
  expectedRevision: revision,
  resolution: z.string().min(1),
  keptItemId: z.string().min(1).optional(),
  excludedItemIds: z.array(z.string()).optional(),
});
export const outlineEditBody = z.strictObject({
  expectedRevision: revision,
  sections: z.array(outlineSection),
});

// ── Native generation phases (approved greenfield Meri owner) ──────────────
//
// One shape for every supported generated phase (`apps/workspace`
// `document-agent.controller.ts` -> `native-generation.bridge.ts`): the canonical
// state after the phase, the retained native request identity, the admission
// status, and the pending proposal when the phase was admitted as one. The
// request carries `expectedRevision` plus the truthful explicit paid-generation
// intent as a closed body field — the route's DTO requires it to be exactly
// `true`, so no header is borrowed and no ordinary retry can start a paid run.
export const nativeGenerationStatus = z.enum([
  "result",
  "proposed",
  "approval-required",
  "unknown",
]);
export const nativeGenerationProposalRef = z.strictObject({
  proposalId: z.string().min(1),
});
export const nativeGenerationResponse = z.strictObject({
  state: documentAgentState,
  requestId: z.string().min(1),
  status: nativeGenerationStatus,
  proposal: nativeGenerationProposalRef.nullable(),
});
/** The document run admission: same envelope, plus the run it started. */
export const nativeGenerationRunResponse = z.strictObject({
  state: documentAgentState,
  run: agentRunSummary.nullable(),
  requestId: z.string().min(1),
  status: z.enum(["approval-required", "unknown"]),
  proposal: nativeGenerationProposalRef.nullable(),
});
/** The explicit paid-generation intent the server's closed DTO requires. */
export const paidGenerationIntent = z.literal(true);
/** Brief/context/outline phases take the current revision and the paid intent. */
export const nativeGenerationRequest = z.strictObject({
  params: draftParams,
  body: z.strictObject({
    expectedRevision: revision,
    paidGeneration: paidGenerationIntent,
  }),
});
export const nativeGenerationRunRequest = z.strictObject({
  params: draftParams,
  body: z.strictObject({
    expectedRevision: revision,
    mode: generationMode.optional(),
    paidGeneration: paidGenerationIntent,
  }),
});

export type DocumentAgentState = z.infer<typeof documentAgentState>;
export type AgentDocumentType = z.infer<typeof agentDocumentType>;
export type AgentProposal = z.infer<typeof agentProposal>;
export type AgentContextItem = z.infer<typeof agentContextItem>;
export type AgentMessage = z.infer<typeof agentMessage>;
export type AgentQualityEvaluation = z.infer<typeof agentQualityEvaluation>;
export type AgentQualityCheck = z.infer<typeof agentQualityCheck>;
export type GenerationRunStatus = z.infer<typeof generationRunStatus>;
export type AgentRunSummary = z.infer<typeof agentRunSummary>;
export type OutlineSection = z.infer<typeof outlineSection>;
export type ContextConflict = z.infer<typeof contextConflict>;
export type IntakeBody = z.infer<typeof intakeBody>;
export type IntakeResponse = z.infer<typeof intakeResponse>;
export type AgentPhase = z.infer<typeof documentAgentPhase>;
export type AgentStatusValue = z.infer<typeof agentStatus>;
export type GenerationMode = z.infer<typeof generationMode>;
export type GenerationStage = z.infer<typeof generationStage>;
