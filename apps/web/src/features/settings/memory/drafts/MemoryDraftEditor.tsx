"use client";
import type { MemoryDraftFile } from "@capiro/shared/settings-memory-drafts";
import { StatusPanel } from "../../../../shared/module-ui";
import { SettingField, SettingsButton, SettingsNotice } from "../../components";
import { SettingsMutationNotice } from "../../SettingsMutationNotice";
import styles from "../../styles";
import { MemoryDraftForm } from "./MemoryDraftForm";
import { MemoryDraftOutcome } from "./MemoryDraftOutcome";
import { useMemoryDraftEditor } from "./useMemoryDraftEditor";
import type { DraftSelection } from "./model";
type Props = {
  type: string;
  slug: string;
  readOnly: boolean;
  reviewEnabled: boolean;
  onSubmitted?: () => void;
};
type View = ReturnType<typeof useMemoryDraftEditor>;
export function MemoryDraftEditor({
  type,
  slug,
  readOnly,
  reviewEnabled,
  onSubmitted,
}: Props) {
  const view = useMemoryDraftEditor(type, slug, onSubmitted),
    { file, writer, target } = view;
  return (
    <div className={styles.stack}>
      <SettingsMutationNotice
        pending={writer.pending}
        busy={writer.action.busy}
        reconcile={() => void view.recover()}
      />
      {writer.action.error && (
        <SettingsNotice
          error
          title={
            writer.pending ? "Draft outcome unknown" : "Draft change refused"
          }
        >
          {writer.action.error}
        </SettingsNotice>
      )}
      {writer.action.message && (
        <SettingsNotice title={writer.action.message} />
      )}
      <StatusPanel
        loading={file.loading}
        error={file.error}
        onRetry={file.reload}
      >
        {file.data && !target && (
          <SettingsNotice error title="Memory file unavailable">
            The service returned a different file.
          </SettingsNotice>
        )}
        {target && (
          <DraftWorkspace
            view={view}
            file={target}
            readOnly={readOnly}
            reviewEnabled={reviewEnabled}
          />
        )}
      </StatusPanel>
    </div>
  );
}
function DraftWorkspace({
  view,
  file,
  readOnly,
  reviewEnabled,
}: {
  view: View;
  file: MemoryDraftFile;
  readOnly: boolean;
  reviewEnabled: boolean;
}) {
  const { read, account, selection, writer, draft, submitted, recovered } =
    view;
  return (
    <>
      <PublishedFile file={file} />
      <DraftPicker
        file={file}
        selection={selection}
        locked={readOnly || writer.locked}
        select={view.setSelection}
      />
      <StatusPanel
        loading={
          (!!selection && !selection.fresh && read.loading) || account.loading
        }
        error={read.error ?? account.error}
        onRetry={() => {
          read.reload();
          account.reload();
        }}
      >
        {read.data && selection && !selection.fresh && !view.matching && (
          <SettingsNotice error title="Draft unavailable">
            The draft does not match this file and owner.
          </SettingsNotice>
        )}
        {draft && (
          <MemoryDraftForm
            key={`${draft.id}:${draft.revision}`}
            file={file}
            draft={draft}
            writer={writer}
            readOnly={readOnly}
            reviewEnabled={file.scope !== "user" || reviewEnabled}
            onSaved={view.onSaved}
            onClosed={view.close}
            onReload={view.reload}
            onSubmitted={view.onSubmitted}
          />
        )}
      </StatusPanel>
      {readOnly && (
        <SettingsNotice title="Read-only preview">
          Draft editing and submission are unavailable in this preview.
        </SettingsNotice>
      )}
      {(submitted ?? recovered.data) && (
        <MemoryDraftOutcome
          receipt={(submitted ?? recovered.data)!}
          personal={file.scope === "user"}
        />
      )}
      {recovered.error && (
        <SettingsNotice
          error
          title="Submission recovery unavailable"
          retry={recovered.reload}
        >
          The original submission was confirmed. Its current review link could
          not be loaded.
        </SettingsNotice>
      )}
    </>
  );
}
function DraftPicker({
  file,
  selection,
  locked,
  select,
}: {
  file: MemoryDraftFile;
  selection: DraftSelection | null;
  locked: boolean;
  select: (selection: DraftSelection | null) => void;
}) {
  return (
    <div className={styles.stack}>
      <SettingField label="Your saved drafts">
        <select
          className={styles.input}
          disabled={locked || !!selection}
          value={selection && !selection.fresh ? selection.id : ""}
          onChange={(event) =>
            select(
              event.target.value
                ? { id: event.target.value, fresh: false }
                : null,
            )
          }
        >
          <option value="">Choose a saved draft</option>
          {file.drafts.map((draft) => (
            <option key={draft.id} value={draft.id}>
              Revision {draft.revision} ·{" "}
              {new Date(draft.updatedAt).toISOString()}
            </option>
          ))}
        </select>
      </SettingField>
      {file.hasMoreDrafts && (
        <p>Showing the 100 most recently updated drafts.</p>
      )}
      <SettingsButton
        disabled={locked || !!selection}
        onClick={() => select({ id: crypto.randomUUID(), fresh: true })}
      >
        Create private draft
      </SettingsButton>
      <p className={styles.description}>
        Drafts are private to their author and expire {file.retention.draftDays}{" "}
        days after creation. Saving a draft does not change published memory.
      </p>
    </div>
  );
}
function PublishedFile({ file }: { file: MemoryDraftFile }) {
  return (
    <section aria-label="Published memory">
      <p>
        {file.scope === "user" ? "Private personal file" : "Shared memory file"}{" "}
        · {file.type}.
      </p>
      {file.baseItemId ? (
        <details>
          <summary>Source and version</summary>
          <dl>
            <dt>Source record</dt>
            <dd>{file.baseItemId}</dd>
            <dt>Version</dt>
            <dd>{file.baseVersion}</dd>
          </dl>
        </details>
      ) : (
        <p>This file has not been published.</p>
      )}
      {file.sections.map((section) => (
        <section key={section.key}>
          <h3>
            {file.type === "firm-soul" && section.key === "mission"
              ? `Who we are · ${section.heading}`
              : section.heading}
          </h3>
          {section.owner === "engine" && (
            <p className={styles.description}>Managed automatically</p>
          )}
          <p style={{ whiteSpace: "pre-wrap" }}>
            {section.body || "No content recorded for this section."}
          </p>
        </section>
      ))}
    </section>
  );
}
