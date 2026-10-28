"use client";

// The current Workspace collaboration role for a draft, taken from the existing
// owner only: the canonical collaborators list for that draft, matched against
// the authenticated identity from `me.read`. Nothing here is inferred from a
// host prop, a query parameter or the draft itself, and no role is ever
// defaulted - an unmatched, pending or inactive row resolves to "no access", so
// a control is disabled rather than granted. The server predicate stays the
// only authority (`collaborators/role-policy.ts`).
import { useCapiroQuery } from "../../../../shared/capiro/queries";
import type { ResolvedWorkspaceRole } from "./access";
import type { IntakeActor } from "./intake-recovery";

export type WorkspaceActionRole = {
  role: ResolvedWorkspaceRole;
  /** The authenticated acting identity, for scoped recovery storage. */
  actor: IntakeActor | undefined;
  loading: boolean;
  error?: Error;
  reload: () => void;
};

export function useWorkspaceActionRole(draftId: string): WorkspaceActionRole {
  const me = useCapiroQuery("me.read", {});
  const people = useCapiroQuery("workspace.collaborators", {
    params: { draftId },
  });
  const viewer = me.data?.user.clerkUserId;
  // A response that does not carry the collaborators list resolves no role
  // instead of throwing: an unmatched viewer is simply not a collaborator.
  const rows = people.data?.collaborators ?? [];
  const row = viewer
    ? rows.find(
        (collaborator) =>
          collaborator.subjectId === viewer && collaborator.status === "active",
      )
    : undefined;
  // The synthetic owner row's subjectId is the draft owner's clerk id, so the
  // owner matches the same way; a pending invitation carries no subjectId and
  // therefore never resolves a role.
  const role: ResolvedWorkspaceRole =
    row?.isOwner === true ? "owner" : row && !row.isOwner ? row.role : null;
  return {
    role,
    actor: me.data
      ? {
          tenantId: me.data.tenant.id,
          userId: me.data.user.id,
          clerkUserId: me.data.user.clerkUserId,
        }
      : undefined,
    loading: me.loading || people.loading,
    error: me.error ?? people.error,
    reload: () => {
      me.reload();
      people.reload();
    },
  };
}
