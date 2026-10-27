"use client";
import { TextareaField } from "@/shared/portfolio/ui/TextareaField";
import { useIdentity } from "@/shared/portfolio/auth/identity";
import { Dialog } from "@/shared/portfolio/ui/Dialog";
import { QueryState } from "@/shared/portfolio/ui/QueryState";
import {
  profileActorKey,
  useProfileActor,
  type ProfileActor,
} from "./profile-access";
import { useProfileNotesEditor } from "./useProfileNotesEditor";

export function NotesDialog({
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
      title="Profile notes"
      description="Profile notes are separate from internal intake notes."
    >
      {open && (
        <ProfileNotesEditor
          key={`${clientId}:${profileActorKey(actor)}`}
          clientId={clientId}
          actor={actor}
          onSaved={() => onOpenChange(false)}
        />
      )}
    </Dialog>
  );
}
function ProfileNotesEditor({
  clientId,
  actor,
  onSaved,
}: {
  clientId: string;
  actor: ProfileActor | undefined;
  onSaved: () => void;
}) {
  const editor = useProfileNotesEditor(clientId, actor, onSaved);
  return (
    <form
      className="stack"
      onSubmit={(event) => {
        event.preventDefault();
        void editor.save();
      }}
    >
      <QueryState
        pending={Boolean(actor) && editor.client.isPending}
        error={editor.client.error}
        retry={() => void editor.client.refetch()}
      />
      <TextareaField
        label="Notes"
        name="notes"
        hint="Maximum 20,000 characters"
        value={editor.client.data ? editor.draft : ""}
        onChange={(event) => editor.setDraft(event.target.value)}
        readOnly={!editor.editable || !editor.client.source || editor.pending}
        rows={12}
        maxLength={20000}
      />
      {!editor.editable && (
        <small>
          Editing profile notes requires a current administrator session. Use
          Quick log to record new activity.
        </small>
      )}
      {editor.changed && (
        <p role="status">
          Saved notes changed while this draft was open. Review the saved notes
          before replacing them.
        </p>
      )}
      {editor.unknown && (
        <p role="status">
          Save result is unknown. Refresh saved notes and review the current
          value before deciding whether to save again.
        </p>
      )}
      {(editor.changed || editor.unknown) && (
        <>
          <button
            type="button"
            className="button"
            disabled={editor.client.isFetching}
            onClick={() => void editor.review()}
          >
            Review saved notes
          </button>
          {editor.client.data && (
            <details>
              <summary>Current saved notes</summary>
              <p style={{ whiteSpace: "pre-wrap" }}>
                {editor.client.data.intakeData?.profileNotes ||
                  "No saved notes."}
              </p>
            </details>
          )}
        </>
      )}
      <QueryState error={editor.error} />
      <button className="button primary" disabled={!editor.canSave}>
        {editor.pending ? "Saving…" : "Save notes"}
      </button>
    </form>
  );
}
