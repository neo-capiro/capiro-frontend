"use client";

import { useLayoutEffect, useRef, useState, type ComponentType } from "react";
import type { WorkspaceDraftDocument } from "@/shared/capiro/operations/workspace-documents";
import { ActionButton } from "@/shared/module-ui";
import type { ManualDraftInput } from "../prospects/manual-draft";
import { SectionPreview } from "../rich-document/SectionPreview";
import type { OrdinarySaveScope } from "./ordinary-save";
import { useOrdinaryDraftSave } from "./useOrdinaryDraftSave";

export type OrdinarySave = ReturnType<typeof useOrdinaryDraftSave>;
type Props = {
  draft: WorkspaceDraftDocument;
  actor: Pick<OrdinarySaveScope, "tenantId" | "userId" | "actorId">;
  onClose: () => void;
  editor: ComponentType<{
    draft: WorkspaceDraftDocument;
    onClose: () => void;
    ordinarySave: OrdinarySave;
    onOrdinaryBound: (draft: WorkspaceDraftDocument) => void;
  }>;
};
export function OrdinaryDraftSave({ draft, actor, onClose, editor }: Props) {
  const [association, setAssociation] = useState<{
    draft: WorkspaceDraftDocument;
    input: ManualDraftInput;
  }>();
  const current = association?.draft ?? draft;
  return (
    <OrdinarySaveSession
      key={`${current.id}:${current.clientId ?? "firm"}`}
      draft={current}
      actor={actor}
      onClose={onClose}
      carriedInput={association?.input}
      onBound={(bound, input) => setAssociation({ draft: bound, input })}
      editor={editor}
    />
  );
}
function OrdinarySaveSession({
  draft,
  actor,
  onClose,
  carriedInput,
  onBound,
  editor: Editor,
}: Props & {
  carriedInput?: ManualDraftInput;
  onBound: (draft: WorkspaceDraftDocument, input: ManualDraftInput) => void;
}) {
  const save = useOrdinaryDraftSave(
    { ...actor, draftId: draft.id, clientId: draft.clientId ?? null },
    carriedInput,
  );
  const latestInput = useRef(save.input);
  useLayoutEffect(() => {
    latestInput.current = save.input;
  }, [save.input]);
  if (!save.ready)
    return (
      <section role={save.recoveryError ? "alert" : "status"}>
        <p>
          {save.recoveryError ?? "Checking current document and retained save…"}
        </p>
        {save.recoveryError && (
          <ActionButton onClick={save.retryRecovery}>
            Retry document recovery
          </ActionButton>
        )}
        <ActionButton onClick={onClose}>← Workspace</ActionButton>
      </section>
    );
  // An association request can outlive an editor render. Carry the most recent
  // edits when it completes, including typing during the association request.
  return (
    <Editor
      draft={draft}
      onClose={onClose}
      ordinarySave={save}
      onOrdinaryBound={(bound) => {
        if (latestInput.current) onBound(bound, latestInput.current);
      }}
    />
  );
}
export function OrdinarySaveRecovery({ save }: { save: OrdinarySave }) {
  const unknown = save.retained && !save.retained.outcome;
  return (
    <section aria-label="Document save recovery">
      {save.error && <p role="alert">{save.error}</p>}
      {save.message && <p role="status">{save.message}</p>}
      {unknown && !save.otherRequest && (
        <p role="status">
          Save unconfirmed. Your submitted edits are retained. No automatic
          retry will run. Reading current content cannot confirm this request.
        </p>
      )}
      {save.otherRequest && (
        <p role="status">
          Another tab has a retained save. Your unsent edits are preserved
          separately. Resolve that save in its original tab, then read current
          saved content before adopting or rebasing your edits.
        </p>
      )}
      {save.retained?.outcome?.kind === "saved" && (
        <p role="status">
          A bound immutable save receipt was received. Your edits remain
          retained until current content is reconciled.
        </p>
      )}
      <ActionButton
        disabled={save.pending}
        onClick={() => void save.readCurrent()}
      >
        Read current saved content
      </ActionButton>
      {unknown && !save.otherRequest && (
        <ActionButton
          disabled={save.pending}
          onClick={() => void save.replay()}
        >
          Retry exact original save
        </ActionButton>
      )}
      {save.readback && (
        <details open>
          <summary>Current saved content — separate from your edits</summary>
          <h2>{save.readback.draft.docTitle}</h2>
          {Object.entries(save.readback.draft.config.sectionContent ?? {}).map(
            ([name, content]) => (
              <section key={name}>
                <h3>{name}</h3>
                <SectionPreview value={content} />
              </section>
            ),
          )}
          <p>
            This view shows supported sections only. Other saved fields remain
            untouched.
          </p>
        </details>
      )}
      {save.canResolve && (
        <div>
          <ActionButton
            disabled={save.pending}
            onClick={() => void save.resolve("adopt")}
          >
            Adopt current saved content
          </ActionButton>
          <ActionButton
            disabled={save.pending}
            onClick={() => void save.resolve("rebase")}
          >
            Rebase retained edits
          </ActionButton>
        </div>
      )}
    </section>
  );
}
