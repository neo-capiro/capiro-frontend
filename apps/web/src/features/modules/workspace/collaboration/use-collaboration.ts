"use client";

import { useState } from "react";
import {
  useCapiroMutation,
  useCapiroQuery,
} from "../../../../shared/capiro/queries";
import { CapiroApiError } from "../../../../shared/capiro/http";
import type { CapiroMe } from "../../../../shared/capiro/operations/settings-schemas";
import type { CollaboratorRole } from "../../../../shared/capiro/operations/workspace-collaborators";

const interrupted = (error: unknown) =>
  error instanceof Error && error.name === "AbortError";
export const accessRefused = (error: unknown) =>
  error instanceof CapiroApiError && [401, 403, 404].includes(error.status);
const message = (error: unknown) =>
  error instanceof Error ? error.message : "The action could not be confirmed.";
type Member = { clerkUserId: string; name: string };

/** Local interaction only. The current Workspace owner decides every permission. */
export function useCollaboration(draftId: string, me: CapiroMe) {
  const people = useCapiroQuery("workspace.collaborators", {
    params: { draftId },
  });
  const owner = people.data?.collaborators.find((person) => person.isOwner);
  const validOwner =
    owner?.id === `owner:${draftId}` &&
    people.data?.collaborators.filter((person) => person.isOwner).length === 1;
  const canManage = Boolean(
    validOwner && owner.subjectId === me.user.clerkUserId,
  );
  const members = useCapiroQuery(
    "settings.tenantMembers",
    {},
    { enabled: canManage },
  );
  const invite = useCapiroMutation("workspace.collaborator.invite");
  const role = useCapiroMutation("workspace.collaborator.role");
  const remove = useCapiroMutation("workspace.collaborator.remove");
  const [notice, setNotice] = useState("");
  const [failure, setFailure] = useState<Error>();
  const [refused, setRefused] = useState<Error>();
  const [uncertainInvite, setUncertainInvite] = useState<Member>();
  const recovered =
    uncertainInvite &&
    people.data?.collaborators.find(
      (person) => person.subjectId === uncertainInvite.clerkUserId,
    );
  const pending = invite.pending || role.pending || remove.pending;
  const error =
    people.error ??
    refused ??
    (people.data && !validOwner
      ? new Error("The current document owner could not be verified.")
      : undefined);

  function refresh() {
    setRefused(undefined);
    setFailure(undefined);
    setNotice("");
    people.reload();
  }
  function fail(error: unknown) {
    if (interrupted(error)) return;
    const failure = new Error(message(error));
    setFailure(failure);
    if (accessRefused(error)) setRefused(failure);
    people.reload();
  }
  async function inviteMember(member: Member, assignedRole: CollaboratorRole) {
    if (!canManage || pending || (uncertainInvite && !recovered)) return false;
    setNotice("");
    setFailure(undefined);
    setUncertainInvite(undefined);
    try {
      const saved = await invite.run({
        params: { draftId },
        body: {
          subjectId: member.clerkUserId,
          name: member.name,
          role: assignedRole,
          inviterName: [me.user.firstName, me.user.lastName]
            .filter(Boolean)
            .join(" "),
        },
      });
      if (
        saved.draftId !== draftId ||
        saved.tenantId !== me.tenant.id ||
        saved.subjectId !== member.clerkUserId
      )
        throw new CapiroApiError(
          502,
          "The saved invitation could not be matched to this document and teammate.",
        );
      setNotice(
        "Invitation saved. Your teammate can accept it in Workspace invitations.",
      );
      people.reload();
      return true;
    } catch (error) {
      if (interrupted(error)) return false;
      if (
        !(
          error instanceof CapiroApiError &&
          error.status >= 400 &&
          error.status < 500
        )
      )
        setUncertainInvite(member);
      fail(error);
      return false;
    }
  }
  async function changeRole(id: string, assignedRole: CollaboratorRole) {
    if (!canManage || pending) return;
    setNotice("");
    setFailure(undefined);
    try {
      const saved = await role.run({
        params: { draftId, id },
        body: { role: assignedRole },
      });
      if (
        saved.id !== id ||
        saved.draftId !== draftId ||
        saved.tenantId !== me.tenant.id ||
        saved.role !== assignedRole
      )
        throw new CapiroApiError(
          502,
          "The role change could not be confirmed. Refresh people to check.",
        );
      setNotice("Role updated.");
      people.reload();
    } catch (error) {
      fail(error);
    }
  }
  async function removePerson(id: string) {
    if (!canManage || pending) return;
    setNotice("");
    setFailure(undefined);
    try {
      await remove.run({ params: { draftId, id } });
      setNotice(
        "Collaborator removed. This does not recall an email already requested.",
      );
      people.reload();
    } catch (error) {
      fail(error);
    }
  }
  return {
    people: people.data?.collaborators ?? [],
    members,
    canManage,
    loading: people.loading,
    error,
    pending,
    notice,
    failure,
    uncertainInvite:
      uncertainInvite && !recovered ? uncertainInvite : undefined,
    recovered: recovered
      ? "A saved invitation for this teammate is present. Its current status is shown below."
      : undefined,
    refresh,
    fail,
    inviteMember,
    changeRole,
    removePerson,
  };
}
