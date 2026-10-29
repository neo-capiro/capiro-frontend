import type {
  OfficeEditorController,
  OfficeEditorState,
} from "../../../shared/meri-office/editor-controller";
import { OfficeDraftActions } from "./OfficeDraftActions";

export function OfficeEditorControls({
  editor,
  state,
}: {
  editor: OfficeEditorController;
  state: OfficeEditorState;
}) {
  const draft = state.snapshot?.draft,
    published = draft?.state === "published";
  return (
    <>
      <OfficeDraftActions editor={editor} state={state} />
      {state.busy && <p role="status">{state.busy}</p>}
      {state.notice && <p role="status">{state.notice}</p>}
      {state.frame && !state.ready && (
        <p role="status">Loading private editor…</p>
      )}
      {state.modified && (
        <p>
          Changes are waiting to be saved. Save before releasing the editor.
        </p>
      )}
      {draft && (
        <p>
          {draft.sequence > 0
            ? `Saved draft revision ${draft.sequence}`
            : "No private Save yet"}{" "}
          · expires {new Date(draft.expiresAt).toLocaleString()}
        </p>
      )}
      {published && (
        <p role="status">
          A new immutable version has been published. Reload version history to
          open it.
        </p>
      )}
      {state.publication?.inspection.format === "xlsx" && (
        <p>
          Formula values: {state.publication.inspection.details.formulaCache}
        </p>
      )}
    </>
  );
}
