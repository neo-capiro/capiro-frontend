import { z } from "zod";
import { defineOperation } from "../contracts";
import {
  prospectManualInput,
  prospectSaveResponse,
} from "./workspace-prospect-save";
const id = z.uuid(),
  hash = z.string().regex(/^[a-f0-9]{64}$/);
export const prospectGenerationBody = z.strictObject({
  requestId: id,
  expectedProspectId: id,
  expectedStateHash: hash,
  sourceVersionId: id,
  sourceSnapshotHash: hash,
  selectedSections: z
    .array(z.string().min(1).max(300))
    .min(1)
    .max(100)
    .refine((names) => new Set(names).size === names.length),
  writingBrief: z
    .string()
    .refine(
      (text) =>
        !!text.trim() && new TextEncoder().encode(text).byteLength <= 4000,
    ),
  paidGeneration: z.literal(true),
});
export const prospectGenerationDecision = z.strictObject({
  requestId: id,
  decision: z.enum(["accept", "reject"]),
  expectedStateHash: hash,
  outputHash: hash,
});
export const prospectGenerationProposal = z.strictObject({
  schemaVersion: z.literal(1),
  tenantId: id,
  draftId: id,
  prospectId: id,
  proposalId: id,
  conversationId: id,
  createdById: z.string().min(1),
  createdAt: z.iso.datetime(),
  status: z.enum(["pending", "accepted", "rejected"]),
  phase: z.enum([
    "prepared",
    "unknown",
    "ready",
    "failed",
    "approval-required",
  ]),
  stale: z.boolean(),
  baseStateHash: hash,
  source: z.strictObject({
    schemaVersion: z.literal(1),
    requestId: z.string().regex(/^wsgen:[a-f0-9]{64}$/),
    draftId: id,
    prospectId: id,
    sourceVersionId: id,
    sourceSnapshotHash: hash,
  }),
  selectedSections: prospectGenerationBody.shape.selectedSections,
  writingBrief: prospectGenerationBody.shape.writingBrief,
  outputHash: hash.nullable(),
  output: prospectManualInput.nullable(),
  failureReason: z.literal("output-invalid").nullable(),
  decision: z
    .strictObject({
      requestId: id,
      actorId: z.string().min(1),
      decision: z.enum(["accept", "reject"]),
      requestHash: hash,
    })
    .nullable(),
  decidedAt: z.iso.datetime().nullable(),
});
export const prospectGenerationList = z.strictObject({
  schemaVersion: z.literal(1),
  tenantId: id,
  draftId: id,
  prospectId: id,
  stateHash: hash,
  available: z.boolean(),
  proposals: z.array(prospectGenerationProposal).max(20),
});
export const prospectGenerationDecisionResponse = z.strictObject({
  schemaVersion: z.literal(1),
  proposal: prospectGenerationProposal,
  save: prospectSaveResponse.nullable(),
});
export type ProspectGenerationBody = z.infer<typeof prospectGenerationBody>;
export type ProspectGenerationDecision = z.infer<
  typeof prospectGenerationDecision
>;
export type ProspectGenerationProposal = z.infer<
  typeof prospectGenerationProposal
>;
export type ProspectGenerationList = z.infer<typeof prospectGenerationList>;
const source =
  "capiro-backend apps/workspace/src/document-agent/prospect-generation";
const params = z.strictObject({ draftId: id, proposalId: id }),
  query = z.strictObject({ prospectId: id });
export const workspaceProspectGenerationOperations = {
  "workspace.prospect.generation.list": defineOperation({
    service: "workspace",
    method: "GET",
    path: "/drafts/:draftId/prospect-generation",
    request: z.strictObject({ params: z.strictObject({ draftId: id }), query }),
    response: prospectGenerationList,
    source,
  }),
  "workspace.prospect.generation.create": defineOperation({
    service: "workspace",
    method: "POST",
    path: "/drafts/:draftId/prospect-generation",
    request: z.strictObject({
      params: z.strictObject({ draftId: id }),
      body: prospectGenerationBody,
    }),
    response: prospectGenerationProposal,
    source,
  }),
  "workspace.prospect.generation.read": defineOperation({
    service: "workspace",
    method: "GET",
    path: "/drafts/:draftId/prospect-generation/:proposalId",
    request: z.strictObject({ params, query }),
    response: prospectGenerationProposal,
    source,
  }),
  "workspace.prospect.generation.reconcile": defineOperation({
    service: "workspace",
    method: "POST",
    path: "/drafts/:draftId/prospect-generation/:proposalId/reconcile",
    request: z.strictObject({ params, query }),
    response: prospectGenerationProposal,
    source,
  }),
  "workspace.prospect.generation.retry": defineOperation({
    service: "workspace",
    method: "POST",
    path: "/drafts/:draftId/prospect-generation/:proposalId/retry",
    request: z.strictObject({ params, query }),
    response: prospectGenerationProposal,
    source,
  }),
  "workspace.prospect.generation.decide": defineOperation({
    service: "workspace",
    method: "POST",
    path: "/drafts/:draftId/prospect-generation/:proposalId/decision",
    request: z.strictObject({
      params,
      query,
      body: prospectGenerationDecision,
    }),
    response: prospectGenerationDecisionResponse,
    source,
  }),
};
