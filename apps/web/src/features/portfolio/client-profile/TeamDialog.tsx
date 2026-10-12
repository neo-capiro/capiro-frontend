"use client";
import { useState } from "react";
import { useIdentity } from "@/shared/portfolio/auth/identity";
import { Dialog } from "@/shared/portfolio/ui/Dialog";
import { QueryState } from "@/shared/portfolio/ui/QueryState";
import { TeamRoster } from "./TeamRoster";
import styles from "./team.module.css";
import {
  profileActorKey,
  useProfileActor,
  type ProfileActor,
} from "./profile-access";
import { useProfileTeamEditor } from "./useProfileTeamEditor";
import { TeamMemberFields } from "./TeamMemberFields";
import { OrderedOwnerFields } from "./OrderedOwnerFields";

export function TeamDialog({
  clientId,
  clientName,
  open,
  onOpenChange,
}: {
  clientId: string;
  clientName?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  useIdentity();
  const actor = useProfileActor();
  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      className={styles.dialog}
      title="Account team"
      description="The firm's members assigned to this client. Ranked account owners remain on the team until their ownership is explicitly changed."
    >
      {open && (
        <ProfileTeamEditor
          key={`${clientId}:${profileActorKey(actor)}`}
          clientId={clientId}
          clientName={clientName}
          actor={actor}
        />
      )}
      <div className={styles.footer}>
        <button className="button" onClick={() => onOpenChange(false)}>
          Done
        </button>
      </div>
    </Dialog>
  );
}
function ProfileTeamEditor({
  clientId,
  clientName,
  actor,
}: {
  clientId: string;
  clientName?: string;
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
      <TeamRoster
        members={editor.team.data ?? []}
        canEdit={editor.canEdit}
        canChange={editor.canChange}
        onRemove={(userId) => void editor.change({ kind: "remove", userId })}
      />
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
        </>
      ) : (
        <small>
          Account team changes require a current administrator session.
        </small>
      )}
      <OrderedOwnerFields
        clientId={clientId}
        clientName={clientName}
        actor={actor}
        blocked={!editor.team.source || editor.pending || editor.unknown}
        roles={Object.fromEntries(
          (editor.team.data ?? []).map((member) => [
            member.userId,
            member.role,
          ]),
        )}
      />
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
