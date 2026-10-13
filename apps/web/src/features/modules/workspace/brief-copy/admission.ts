import type {
  BriefCopySource,
  BriefCopyState,
  BriefCopyDetail,
  BriefCopyResult,
} from "@/shared/capiro/operations/workspace-brief-copy";
import type { ProspectWriter } from "../prospects/recovery-authority";

export type CopyScope = {
  actor: ProspectWriter;
  draftId: string;
  prospectId: string;
  clientId: string | null;
};
export function sameSource(left: BriefCopySource, right: BriefCopySource) {
  return (
    left.kind === right.kind &&
    left.prospectId === right.prospectId &&
    left.briefId === right.briefId &&
    left.versionId === right.versionId &&
    left.versionNumber === right.versionNumber &&
    left.sectionsHash === right.sectionsHash &&
    left.snapshotHash === right.snapshotHash
  );
}
export function assertCopyScope(
  value: BriefCopyState | BriefCopyDetail,
  scope: CopyScope,
) {
  if (
    value.tenantId !== scope.actor.tenantId ||
    value.draftId !== scope.draftId ||
    value.prospectId !== scope.prospectId ||
    value.clientId !== scope.clientId
  )
    throw new Error(
      "Current Workspace state does not match this tenant, prospect, client and destination.",
    );
}
export function assertCopyDetail(
  detail: BriefCopyDetail,
  state: BriefCopyState,
  scope: CopyScope,
  documentId: string,
  source: BriefCopySource,
) {
  assertCopyScope(detail, scope);
  assertCopyScope(state, scope);
  const selected = state.documents.find(
    (document) => document.id === documentId,
  );
  if (
    detail.document.id !== documentId ||
    !sameSource(detail.document.sourceBriefVersion, source) ||
    !selected?.sourceBriefVersion ||
    !sameSource(selected.sourceBriefVersion, source) ||
    detail.stateHash !== state.stateHash
  )
    throw new Error(
      "The exact copied tab changed during the current read. Read it again before editing.",
    );
}
export function assertCopyReceipt(
  result: BriefCopyResult,
  scope: CopyScope,
  expected: {
    requestId: string;
    operation: "copy_core_brief" | "save_brief_copy";
    source: BriefCopySource;
    documentId?: string;
  },
  previous?: BriefCopyResult,
) {
  const receipt = result.receipt;
  if (
    receipt.tenantId !== scope.actor.tenantId ||
    receipt.actorId !== scope.actor.ownerId ||
    receipt.draftId !== scope.draftId ||
    receipt.prospectId !== scope.prospectId ||
    receipt.clientId !== scope.clientId ||
    receipt.requestId !== expected.requestId ||
    receipt.versionId !== expected.requestId ||
    receipt.operation !== expected.operation ||
    !sameSource(receipt.source, expected.source) ||
    (expected.documentId !== undefined &&
      receipt.documentId !== expected.documentId) ||
    (previous && JSON.stringify(receipt) !== JSON.stringify(previous.receipt))
  )
    throw new Error(
      "The atomic save receipt does not match the exact retained Workspace intent.",
    );
}
