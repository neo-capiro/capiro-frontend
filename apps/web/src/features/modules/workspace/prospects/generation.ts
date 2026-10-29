import { z } from "zod";
import {
  prospectGenerationBody,
  prospectGenerationDecision,
  prospectGenerationList,
  prospectGenerationProposal,
  prospectGenerationDecisionResponse,
  type ProspectGenerationBody,
} from "@/shared/capiro/operations/workspace-prospect-generation";
import {
  canonicalWorkspaceSnapshot,
  workspaceSnapshotHash,
} from "@/shared/capiro/workspace-snapshot";
import { savedSnapshotExport } from "@/shared/capiro/operations/workspace-exports";
import type { ProspectDraftScope } from "./manual-draft";

const generationIntent = z.discriminatedUnion("kind", [
  z.strictObject({ kind: z.literal("generate"), body: prospectGenerationBody }),
  z.strictObject({
    kind: z.literal("decision"),
    proposalId: z.uuid(),
    body: prospectGenerationDecision,
  }),
]);
export type GenerationIntent = z.infer<typeof generationIntent>;
export const generationRecoveryContract = {
  schema: generationIntent,
  requestId: (intent: GenerationIntent) => intent.body.requestId,
  validateUpdate(previous: GenerationIntent, next: GenerationIntent) {
    if (
      canonicalWorkspaceSnapshot(previous) !== canonicalWorkspaceSnapshot(next)
    )
      throw new Error(
        "Recover the exact original generation request or decision.",
      );
  },
};
function bound(
  value: { tenantId: string; draftId: string; prospectId: string },
  scope: ProspectDraftScope,
) {
  if (
    value.tenantId !== scope.tenantId ||
    value.draftId !== scope.id ||
    value.prospectId !== scope.prospectId
  )
    throw new Error("Generation belongs to a different prospect or document.");
}
export function bindGenerationList(raw: unknown, scope: ProspectDraftScope) {
  const result = prospectGenerationList.parse(raw);
  bound(result, scope);
  for (const proposal of result.proposals) bound(proposal, scope);
  return result;
}
export async function bindGenerationProposal(
  raw: unknown,
  scope: ProspectDraftScope,
  proposalId: string,
  input?: ProspectGenerationBody,
  actorId?: string,
) {
  const result = prospectGenerationProposal.parse(raw);
  bound(result, scope);
  if (
    result.proposalId !== proposalId ||
    result.source.draftId !== scope.id ||
    result.source.prospectId !== scope.prospectId
  )
    throw new Error(
      "The returned proposal does not match the selected source.",
    );
  if (
    input &&
    (result.createdById !== actorId ||
      result.baseStateHash !== input.expectedStateHash ||
      result.source.sourceVersionId !== input.sourceVersionId ||
      result.source.sourceSnapshotHash !== input.sourceSnapshotHash ||
      result.writingBrief !== input.writingBrief ||
      canonicalWorkspaceSnapshot(result.selectedSections) !==
        canonicalWorkspaceSnapshot(input.selectedSections))
  )
    throw new Error(
      "Generation is not confirmed for the exact retained request.",
    );
  if (
    result.output &&
    (await workspaceSnapshotHash(result.output)) !== result.outputHash
  )
    throw new Error("The generated content does not match its saved hash.");
  if (result.phase === "ready" && (!result.output || !result.outputHash))
    throw new Error("The generated proposal is incomplete.");
  return result;
}
export async function bindGenerationDecision(
  raw: unknown,
  scope: ProspectDraftScope,
  actorId: string,
  intent: Extract<GenerationIntent, { kind: "decision" }>,
  savedRaw?: unknown,
) {
  const result = prospectGenerationDecisionResponse.parse(raw);
  const proposal = await bindGenerationProposal(
    result.proposal,
    scope,
    intent.proposalId,
  );
  const requestHash = await workspaceSnapshotHash({
    tenantId: scope.tenantId,
    draftId: scope.id,
    prospectId: scope.prospectId,
    actorId,
    proposalId: intent.proposalId,
    input: intent.body,
  });
  if (
    proposal.decision?.requestHash !== requestHash ||
    proposal.decision.actorId !== actorId ||
    proposal.decision.requestId !== intent.body.requestId ||
    proposal.decision.decision !== intent.body.decision ||
    proposal.status !==
      (intent.body.decision === "accept" ? "accepted" : "rejected") ||
    proposal.outputHash !== intent.body.outputHash ||
    proposal.baseStateHash !== intent.body.expectedStateHash
  )
    throw new Error("The original proposal decision is not confirmed.");
  if (intent.body.decision === "reject") {
    if (result.save !== null)
      throw new Error("A rejection cannot save document content.");
  } else {
    const receipt = result.save?.receipt,
      saved = savedSnapshotExport.parse(savedRaw);
    if (
      !receipt ||
      receipt.tenantId !== scope.tenantId ||
      receipt.draftId !== scope.id ||
      receipt.prospectId !== scope.prospectId ||
      receipt.actorId !== actorId ||
      receipt.requestId !== intent.body.requestId ||
      receipt.versionId !== intent.body.requestId ||
      saved.tenantId !== scope.tenantId ||
      saved.draftId !== scope.id ||
      saved.id !== receipt.versionId ||
      saved.authorId !== actorId ||
      (await workspaceSnapshotHash(saved.snapshot)) !== receipt.snapshotHash
    )
      throw new Error("The accepted saved version is not confirmed.");
    const snapshot = saved.snapshot!,
      { atomicSave: atomic, ...content } = snapshot;
    const {
      versionId: _version,
      savedAt: _time,
      snapshotHash: _hash,
      hashFormat: _format,
      ...expected
    } = receipt;
    if (
      canonicalWorkspaceSnapshot(atomic) !==
        canonicalWorkspaceSnapshot(expected) ||
      (await workspaceSnapshotHash(content)) !== receipt.stateHash ||
      canonicalWorkspaceSnapshot(snapshot.config?.prospectGeneration) !==
        canonicalWorkspaceSnapshot({
          proposalId: proposal.proposalId,
          nativeRequestId: proposal.source.requestId,
          sourceVersionId: proposal.source.sourceVersionId,
          sourceSnapshotHash: proposal.source.sourceSnapshotHash,
          outputHash: proposal.outputHash,
          acceptedById: actorId,
          decisionRequestId: intent.body.requestId,
        }) ||
      canonicalWorkspaceSnapshot({
        title: snapshot.docTitle,
        names: snapshot.config?.sections,
        sections: snapshot.config?.sectionContent,
      }) !== canonicalWorkspaceSnapshot(proposal.output)
    )
      throw new Error(
        "The saved version does not contain the accepted proposal.",
      );
  }
  return result;
}
