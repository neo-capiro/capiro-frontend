import type { OperationResponse } from "@/shared/capiro/contracts";
import type { capiroOperations } from "@/shared/capiro/registry";

export type WorkMembers = OperationResponse<
  (typeof capiroOperations)["settings.tenantMembers"]
>;

/** Strategy and Workspace owner fields contain Clerk subjects, not Core UUIDs. */
export function workOwnerLabel(
  ownerId: string | null,
  members: WorkMembers | undefined,
) {
  if (ownerId === null) return "Unassigned";
  const matches = members?.filter((member) => member.clerkUserId === ownerId);
  if (!ownerId || matches?.length !== 1) return "Owner unavailable";
  const member = matches[0]!;
  return member.name.trim() || member.email.trim() || "Owner unavailable";
}
