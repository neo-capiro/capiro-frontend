// Client mirror of the authoritative Workspace collaboration role matrix in
// `apps/workspace/src/collaborators/role-policy.ts` (canEdit / canReview /
// canRead). It exists so a control is disabled before a request that the
// service would refuse anyway - the server predicate stays the only authority,
// and this mirror never grants an action the service would reject.
export type WorkspaceActorRole =
  | "owner"
  | "editor"
  | "reviewer"
  | "commenter"
  | "viewer";

/** null is a resolved role of "no access at all". */
export type ResolvedWorkspaceRole = WorkspaceActorRole | null;

/** Owner + editor: brief/outline/context edits, approvals, cancel, quality fix. */
export function workspaceRoleCanEdit(role: ResolvedWorkspaceRole): boolean {
  return role === "owner" || role === "editor";
}

/** Owner + editor + reviewer: proposal accept/reject. */
export function workspaceRoleCanReview(role: ResolvedWorkspaceRole): boolean {
  return role === "owner" || role === "editor" || role === "reviewer";
}

/** Any resolved role: reads. */
export function workspaceRoleCanRead(role: ResolvedWorkspaceRole): boolean {
  return role !== null;
}
