import type { WorkspaceDraftDocument } from "@/shared/capiro/operations/workspace-documents";
import { ActionButton } from "@/shared/module-ui";
import { SectionPreview } from "../rich-document/SectionPreview";
import { ProspectDraftExport } from "./ProspectDraftExport";
import type { useProspectDraftSave } from "./useProspectDraftSave";

export function ProspectSaveRecovery({
  draft,
  save,
}: {
  draft: WorkspaceDraftDocument;
  save: ReturnType<typeof useProspectDraftSave>;
}) {
  return (
    <>
      <p>Immutable prospect origin: {draft.prospectId}. Manual edits only.</p>
      {draft.documents.some((document) => document.sourceBriefVersion) && (
        <p>
          Use the copied-document editor to save this draft and preserve its
          source version.
        </p>
      )}
      {save.error && <p role="alert">{save.error}</p>}
      {save.readback && (
        <details>
          <summary>Current saved content</summary>
          <h2>{save.readback.docTitle}</h2>
          {Object.entries(save.readback.config.sectionContent ?? {}).map(
            ([name, content]) => (
              <section key={name}>
                <h3>{name}</h3>
                <SectionPreview value={content} />
              </section>
            ),
          )}
        </details>
      )}
      {save.message && <p role="status">{save.message}</p>}
      {save.retained?.uncertain && (
        <p role="status">
          The previous save is not confirmed. No automatic retry will run.
          Recover the original save, or read current content after a conflict.
        </p>
      )}
      {save.canRecover && (
        <ActionButton onClick={() => void save.recover()}>
          Recover original save
        </ActionButton>
      )}
      <ActionButton
        disabled={save.pending}
        onClick={() => void save.readCurrent()}
      >
        Read current document
      </ActionButton>
      <ProspectDraftExport
        scope={{
          id: draft.id,
          tenantId: draft.tenantId!,
          prospectId: draft.prospectId!,
        }}
        disabled={save.pending || Boolean(save.retained?.uncertain)}
      />
    </>
  );
}
