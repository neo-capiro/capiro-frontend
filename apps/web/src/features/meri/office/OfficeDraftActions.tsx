import { Button } from "@capiro/ui/button";
import type {
  OfficeEditorController,
  OfficeEditorState,
} from "../../../shared/meri-office/editor-controller";
import styles from "./office.module.css";
type Props = { editor: OfficeEditorController; state: OfficeEditorState };
export function OfficeDraftActions({ editor, state }: Props) {
  const snapshot = state.snapshot,
    draft = snapshot?.draft;
  const disabled = !state.connected || state.busy !== null;
  const published = draft?.state === "published";
  const recoveringPublish =
    draft?.state === "publish-pending" || draft?.state === "publish-unknown";
  const canPublish =
    !state.frame &&
    snapshot?.editor.editorId === null &&
    !!draft?.sha256 &&
    draft.sequence > 0 &&
    !published &&
    !state.uncertain;
  return (
    <>
      <div className={styles.controls}>
        <EditorActions editor={editor} state={state} />
        <Button
          disabled={disabled || !canPublish}
          onClick={() => void editor.publish()}
        >
          {recoveringPublish
            ? "Recover Publish result"
            : "Publish saved revision"}
        </Button>
        {!state.frame && draft && !published && !recoveringPublish && (
          <Button
            variant="outline"
            disabled={disabled || state.uncertain}
            onClick={() => void editor.discard()}
          >
            Discard private draft
          </Button>
        )}
      </div>
      {!state.frame &&
        snapshot?.editor.editorId &&
        !editor.ownsEditor() &&
        !published &&
        !recoveringPublish && (
          <div className={styles.controls}>
            <span>A saved editor lease is still active.</span>
            <Button
              variant="outline"
              disabled={disabled || state.uncertain}
              onClick={() => void editor.open(true)}
            >
              Take over editor
            </Button>
          </div>
        )}
    </>
  );
}

function EditorActions({ editor, state }: Props) {
  const disabled = !state.connected || state.busy !== null,
    draft = state.snapshot?.draft;
  const published = draft?.state === "published",
    recoveringPublish =
      draft?.state === "publish-pending" || draft?.state === "publish-unknown";
  return (
    <>
      {" "}
      {!state.frame && !published && !recoveringPublish && (
        <Button
          variant="outline"
          disabled={disabled || state.uncertain}
          onClick={() => void editor.open()}
        >
          Open private editor
        </Button>
      )}
      {!state.frame && (
        <Button
          variant="outline"
          disabled={disabled}
          onClick={() => void editor.recover()}
        >
          Recover saved draft
        </Button>
      )}
      {state.frame && (
        <Button
          variant="outline"
          disabled={disabled || !state.ready}
          onClick={() => void editor.save()}
        >
          Save private draft
        </Button>
      )}
      {editor.ownsEditor() && !published && (
        <Button
          variant="outline"
          disabled={disabled || (state.frame && !state.ready) || state.modified}
          onClick={() => void editor.finish()}
        >
          Release editor
        </Button>
      )}
    </>
  );
}
