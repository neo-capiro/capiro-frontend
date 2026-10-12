"use client";
import { useState } from "react";
import { useIdentity } from "@/shared/portfolio/auth/identity";
import { Dialog } from "@/shared/portfolio/ui/Dialog";
import { QueryState } from "@/shared/portfolio/ui/QueryState";
import { memberName } from "@/features/portfolio/index/public";
import {
  profileActorKey,
  useProfileActor,
  type ProfileActor,
} from "./profile-access";
import { useProfileTeamEditor } from "./useProfileTeamEditor";
import { TeamMemberFields, TeamOwnerField } from "./TeamMemberFields";

export function TeamDialog({
  clientId,
  open,
  onOpenChange,
}: {
  clientId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  useIdentity();
  const actor = useProfileActor();
  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title="Account team"
      description="The firm's members assigned to this client. The account owner is always on the team."
    >
      {open && (
        <ProfileTeamEditor
          key={`${clientId}:${profileActorKey(actor)}`}
          clientId={clientId}
          actor={actor}
        />
      )}
      <div className="formActions">
        <button className="button" onClick={() => onOpenChange(false)}>
          Done
        </button>
      </div>
    </Dialog>
  );
}
function ProfileTeamEditor({
  clientId,
  actor,
}: {
  clientId: string;
  actor: ProfileActor | undefined;
}) {
  const editor = useProfileTeamEditor(clientId, actor);
  const [selectedId, setSelectedId] = useState("");
  const [role, setRole] = useState("");
  return (
    <>
      <QueryState
        pending={Boolean(actor) && editor.team.isPending}
        error={editor.team.error}
        retry={() => void editor.team.refetch()}
      />
      <ul className="stack">
        {editor.team.data?.map((member) => (
          <li className="row between" key={member.userId}>
            <span>
              <strong>{memberName({ ...member, id: member.userId })}</strong>
              <small>
                {" "}
                ·{" "}
                {member.isOwner
                  ? `Account owner${member.role ? ` · ${member.role}` : ""}`
                  : (member.role ?? "Team member")}
              </small>
            </span>
            {editor.canEdit && !member.isOwner && (
              <button
                className="button ghost"
                disabled={!editor.canChange}
                onClick={() =>
                  void editor.change({ kind: "remove", userId: member.userId })
                }
              >
                Remove
              </button>
            )}
          </li>
        ))}
      </ul>
      {editor.canEdit ? (
        <>
          <QueryState
            pending={editor.options.isPending}
            error={editor.options.error}
            retry={() => void editor.options.refetch()}
          />
          <TeamMemberFields
            members={editor.options.data ?? []}
            selectedId={selectedId}
            role={role}
            disabled={!editor.canChange || !editor.options.source}
            onMemberChange={setSelectedId}
            onRoleChange={setRole}
            onAdd={() =>
              void editor
                .change({ kind: "add", userId: selectedId, role })
                .then((saved) => {
                  if (saved) {
                    setSelectedId("");
                    setRole("");
                  }
                })
            }
          />
          <TeamOwnerField
            members={editor.options.data ?? []}
            ownerId={
              editor.team.data?.find((member) => member.isOwner)?.userId ?? ""
            }
            ownerAvailable={Boolean(editor.team.data)}
            disabled={!editor.canChange || !editor.options.source}
            onChange={(userId) => void editor.change({ kind: "owner", userId })}
          />
        </>
      ) : (
        <small>
          Account team changes require a current administrator session.
        </small>
      )}
      <QueryState error={editor.error} />
      {editor.unknown && (
        <div className="stack">
          <p role="status">
            Change result is unknown. Reload the current team and review it
            before making another change.
          </p>
          <button
            className="button"
            disabled={editor.team.isFetching || editor.options.isFetching}
            onClick={() => void editor.review()}
          >
            Reload account team
          </button>
        </div>
      )}
      {editor.message && <p role="status">{editor.message}</p>}
    </>
  );
}
