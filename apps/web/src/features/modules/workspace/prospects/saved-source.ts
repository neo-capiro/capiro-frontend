import type { SavedVersion } from "@/shared/capiro/operations/workspace-documents";
export function prospectSavedSourceEligible(
  version: SavedVersion,
  stateHash?: string,
) {
  const snapshot = version.snapshot;
  const atomic = snapshot?.atomicSave as
    | { operation?: string; stateHash?: string }
    | undefined;
  return Boolean(
    snapshot &&
    !snapshot.prospectPublication &&
    atomic?.operation === "save_prospect_draft" &&
    stateHash &&
    atomic.stateHash === stateHash,
  );
}
