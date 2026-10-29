import {
  publicationDraft as draft,
  publicationScope as scope,
  publicationVersion as version,
} from "./prospect-publication-fixture";
import { requestId } from "./prospect-resources-fixtures";
import { workspaceSnapshotHash } from "../src/shared/capiro/workspace-snapshot";
import type {
  ProspectGenerationBody,
  ProspectGenerationProposal,
  ProspectGenerationDecision,
} from "../src/shared/capiro/operations/workspace-prospect-generation";
export { draft, scope, version };
export async function generationBody(): Promise<ProspectGenerationBody> {
  return {
    requestId,
    expectedProspectId: scope.prospectId,
    expectedStateHash: "a".repeat(64),
    sourceVersionId: version.id,
    sourceSnapshotHash: await workspaceSnapshotHash(version.snapshot),
    selectedSections: ["Body"],
    writingBrief: "Write an evidence-based proposal.",
    paidGeneration: true,
  };
}
export async function generationProposal(
  input?: ProspectGenerationBody,
): Promise<ProspectGenerationProposal> {
  const body = input ?? (await generationBody());
  const output = {
    title: draft.docTitle,
    names: ["Body"],
    sections: { Body: "Generated proposal content." },
  };
  return {
    schemaVersion: 1,
    tenantId: scope.tenantId,
    draftId: scope.id,
    prospectId: scope.prospectId,
    proposalId: body.requestId,
    conversationId: "10000000-0000-4000-8000-000000000099",
    createdById: draft.ownerId,
    createdAt: "2026-10-29T12:00:00.000Z",
    status: "pending",
    phase: "ready",
    stale: false,
    baseStateHash: body.expectedStateHash,
    source: {
      schemaVersion: 1,
      requestId: "wsgen:" + "b".repeat(64),
      draftId: scope.id,
      prospectId: scope.prospectId,
      sourceVersionId: body.sourceVersionId,
      sourceSnapshotHash: body.sourceSnapshotHash,
    },
    selectedSections: body.selectedSections,
    writingBrief: body.writingBrief,
    outputHash: await workspaceSnapshotHash(output),
    output,
    failureReason: null,
    decision: null,
    decidedAt: null,
  };
}
export function generationList(proposals: ProspectGenerationProposal[] = []) {
  return {
    schemaVersion: 1,
    tenantId: scope.tenantId,
    draftId: scope.id,
    prospectId: scope.prospectId,
    stateHash: "a".repeat(64),
    available: true,
    proposals: proposals.map((p) => ({ ...p, output: null })),
  };
}
export async function generationDecisionFixture(
  proposal: ProspectGenerationProposal,
  body: ProspectGenerationDecision,
) {
  const decision = {
    requestId: body.requestId,
    actorId: draft.ownerId,
    decision: body.decision,
    requestHash: await workspaceSnapshotHash({
      tenantId: scope.tenantId,
      draftId: scope.id,
      prospectId: scope.prospectId,
      actorId: draft.ownerId,
      proposalId: proposal.proposalId,
      input: body,
    }),
  };
  const decided: ProspectGenerationProposal = {
    ...proposal,
    status: body.decision === "accept" ? "accepted" : "rejected",
    decision,
    decidedAt: "2026-10-29T12:02:00.000Z",
  };
  const atomicSave = {
    operation: "save_prospect_draft" as const,
    tenantId: scope.tenantId,
    draftId: scope.id,
    actorId: draft.ownerId,
    prospectId: scope.prospectId,
    requestId: body.requestId,
    requestHash: "c".repeat(64),
    clientId: null,
    stateHash: "d".repeat(64),
  };
  const { atomicSave: _prior, ...sourceContent } = version.snapshot;
  const content = {
    ...sourceContent,
    docTitle: proposal.output!.title,
    config: {
      ...draft.config,
      sections: proposal.output!.names,
      sectionContent: proposal.output!.sections,
      prospectGeneration: {
        proposalId: proposal.proposalId,
        nativeRequestId: proposal.source.requestId,
        sourceVersionId: proposal.source.sourceVersionId,
        sourceSnapshotHash: proposal.source.sourceSnapshotHash,
        outputHash: proposal.outputHash,
        acceptedById: draft.ownerId,
        decisionRequestId: body.requestId,
      },
    },
  };
  atomicSave.stateHash = await workspaceSnapshotHash(content);
  const snapshot = { ...content, atomicSave };
  const saved = {
    ...version,
    id: body.requestId,
    schemaVersion: 1,
    tenantId: scope.tenantId,
    snapshot,
  };
  return {
    saved,
    result: {
      schemaVersion: 1,
      proposal: decided,
      save:
        body.decision === "reject"
          ? null
          : {
              schemaVersion: 1,
              replayed: false,
              receipt: {
                ...atomicSave,
                versionId: body.requestId,
                savedAt: saved.createdAt,
                snapshotHash: await workspaceSnapshotHash(snapshot),
                hashFormat: "workspace-snapshot-canonical-json-v1" as const,
              },
            },
    },
  };
}
