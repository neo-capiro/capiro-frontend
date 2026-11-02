import { ActionButton } from "../../../../shared/module-ui";
import type {
  OfficeEditorController,
  OfficeEditorState,
} from "../../../../shared/meri-office/editor-controller";

type Props = { editor: OfficeEditorController; state: OfficeEditorState };

/** The host's few explicit actions beside CODE's own toolbar: publishing an immutable revision, and the draft-level
 * actions (open, recover, discard, take over) CODE has no control for. Saving and closing are CODE's controls, which
 * post to the host; the same sequences are reachable here for a closed frame. */
export function OfficeDraftControls({ editor, state }: Props) {
  const snapshot = state.snapshot,
    draft = snapshot?.draft;
  const disabled = !state.connected || state.busy !== null;
  const published = draft?.state === "published";
  const recoveringPublish =
    draft?.state === "publish-pending" || draft?.state === "publish-unknown";
  const canPublishClosed =
    !state.frame &&
    snapshot?.editor.editorId === null &&
    !!draft?.sha256 &&
    draft.sequence > 0 &&
    !published &&
    !state.uncertain;
  const editing = state.frame && state.ready;
  return (
    <>
      {editing && (
        <>
          <ActionButton
            primary
            disabled={disabled || state.uncertain}
            onClick={() => void editor.publishRevision()}
          >
            Publish revision
          </ActionButton>
          <ActionButton disabled={disabled} onClick={() => void editor.close()}>
            Close editor
          </ActionButton>
        </>
      )}
      {!state.frame && !published && !recoveringPublish && (
        <ActionButton
          disabled={disabled || state.uncertain}
          onClick={() => void editor.open()}
        >
          Open editor
        </ActionButton>
      )}
      {!state.frame && (
        <ActionButton
          primary={canPublishClosed || recoveringPublish}
          disabled={disabled || !canPublishClosed}
          onClick={() => void editor.publish()}
        >
          {recoveringPublish ? "Recover publish result" : "Publish revision"}
        </ActionButton>
      )}
      {!state.frame && (
        <ActionButton disabled={disabled} onClick={() => void editor.recover()}>
          Recover saved draft
        </ActionButton>
      )}
      {!state.frame && draft && !published && !recoveringPublish && (
        <ActionButton
          disabled={disabled || state.uncertain}
          onClick={() => void editor.discard()}
        >
          Discard private draft
        </ActionButton>
      )}
      {!state.frame &&
        snapshot?.editor.editorId &&
        !editor.ownsEditor() &&
        !published &&
        !recoveringPublish && (
          <ActionButton
            disabled={disabled || state.uncertain}
            onClick={() => void editor.open(true)}
          >
            Take over editor
          </ActionButton>
        )}
    </>
  );
}
