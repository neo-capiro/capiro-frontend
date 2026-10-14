import { binding, clientId } from "./objective-work-fixtures";
export const targetId = "d0000000-0000-4000-8000-000000000001";
export const boundDirectory = {
  destination: { ...binding, kind: "directory_target", resourceId: targetId },
  target: {
    id: targetId,
    clientId,
    sourceDirectory: "congress",
    memberId: "SYNTHETIC/member",
  },
};
export const savedTarget = {
  ...boundDirectory.target,
  memberName: "Synthetic stale label",
  party: null,
  state: null,
  chamber: null,
  committee: null,
  staffKind: null,
  tier: null,
  source: "manual",
  addedAt: "2026-10-14T12:00:00Z",
};
export const directoryQuery = {
  clientId,
  objectiveId: binding.objectiveId,
  objectiveVersion: binding.objectiveVersion,
};
export const directoryHref = `/modules/directory?${new URLSearchParams({
  ...directoryQuery,
  objectiveVersion: String(directoryQuery.objectiveVersion),
  targetId,
})}`;
