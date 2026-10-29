"use client";
import { useEffect, useState } from "react";
import type {
  MemoryDraftFile,
  MemoryDraftSubmissionReceipt,
  MemoryDraftEdit,
} from "@capiro/shared/settings-memory-drafts";
import { SettingField, SettingsButton, SettingsNotice } from "../../components";
import type { useSettingsMutation } from "../../useSettingsMutation";
import styles from "../../styles";
import { draftSaveRequest, type EditableDraft } from "./model";
type Props = {
  file: MemoryDraftFile;
  draft: EditableDraft;
  writer: ReturnType<typeof useSettingsMutation>;
  readOnly: boolean;
  reviewEnabled: boolean;
  onSaved: (id: string) => void;
  onClosed: () => void;
  onReload: () => void;
  onSubmitted: (receipt: MemoryDraftSubmissionReceipt) => void;
};
function useDraftExpired(expiresAt: string | null) {
  const [expired, setExpired] = useState(
    () => !!expiresAt && Date.parse(expiresAt) <= Date.now(),
  );
  useEffect(() => {
    if (!expiresAt) return;
    let timer: ReturnType<typeof setTimeout>;
    const check = () => {
      const remaining = Date.parse(expiresAt) - Date.now();
      if (remaining <= 0) setExpired(true);
      else timer = setTimeout(check, Math.min(remaining, 86400000));
    };
    check();
    return () => clearTimeout(timer);
  }, [expiresAt]);
  return expired;
}
function draftActions(props: Props, sections: MemoryDraftEdit[]) {
  const { file, draft, writer, onSaved, onClosed, onSubmitted } = props;
  const params = { type: file.type, slug: file.slug, id: draft.id };
  return {
    save: (action: "save" | "discard") =>
      writer.action.run(
        (signal) =>
          writer.api.request(
            "settings.memory.drafts.save",
            { params, body: draftSaveRequest(draft, sections, action) },
            { signal },
          ),
        action === "save"
          ? "Private draft saved. Active memory is unchanged."
          : "Private draft discarded. Active memory is unchanged.",
        () => (action === "save" ? onSaved(draft.id) : onClosed()),
      ),
    submit: () =>
      writer.action.run(
        (signal) =>
          writer.api.request(
            "settings.memory.drafts.submit",
            {
              params,
              body: {
                requestId: crypto.randomUUID(),
                expectedRevision: draft.revision,
              },
            },
            { signal },
          ),
        "Submitted for review. This does not publish memory.",
        onSubmitted,
      ),
  };
}
/** Local edits stay separate from a saved private draft and a submitted review candidate. */
export function MemoryDraftForm(props: Props) {
  const { file, draft, writer, readOnly, reviewEnabled } = props;
  const [sections, setSections] = useState(draft.sections),
    expired = useDraftExpired(draft.expiresAt);
  const dirty =
    JSON.stringify(sections) !== JSON.stringify(draft.sections) ||
    draft.revision === 0;
  const locked =
    readOnly ||
    writer.locked ||
    draft.legalHold ||
    draft.state !== "draft" ||
    expired;
  const actions = draftActions(props, sections);
  return (
    <section className={styles.stack} aria-label="Private draft editor">
      <h3>Private draft</h3>
      <DraftStatus
        draft={draft}
        dirty={dirty}
        expired={expired}
        reviewEnabled={reviewEnabled}
      />
      <DraftFields
        file={file}
        sections={sections}
        locked={locked}
        onChange={setSections}
      />
      <div className={styles.row}>
        <SettingsButton
          primary
          disabled={locked || !dirty}
          onClick={() => void actions.save("save")}
        >
          {writer.action.busy ? "Working…" : "Save draft"}
        </SettingsButton>
        <SettingsButton
          disabled={
            locked ||
            dirty ||
            !draft.revision ||
            draft.baseChanged ||
            !reviewEnabled
          }
          onClick={() => void actions.submit()}
        >
          Submit saved draft for review
        </SettingsButton>
        <SettingsButton disabled={writer.locked} onClick={props.onReload}>
          Discard unsaved changes
        </SettingsButton>
        {draft.revision > 0 && (
          <SettingsButton
            danger
            disabled={locked}
            onClick={() => void actions.save("discard")}
          >
            Discard saved draft
          </SettingsButton>
        )}
        <SettingsButton disabled={writer.locked} onClick={props.onClosed}>
          Close editor
        </SettingsButton>
      </div>
      {dirty && (
        <p className={styles.description}>
          Save the draft before submitting it for review. Closing the editor
          loses unsaved changes.
        </p>
      )}
    </section>
  );
}
function DraftStatus({
  draft,
  dirty,
  expired,
  reviewEnabled,
}: {
  draft: EditableDraft;
  dirty: boolean;
  expired: boolean;
  reviewEnabled: boolean;
}) {
  return (
    <>
      <p>
        {draft.revision ? `Saved revision ${draft.revision}` : "Not saved"}
        {dirty ? " · Unsaved changes" : ""}.
        {draft.expiresAt
          ? ` Expires ${new Date(draft.expiresAt).toISOString()}.`
          : " A saved draft expires 30 days after creation."}
      </p>
      {draft.baseChanged && (
        <SettingsNotice error title="Published memory changed">
          Save your draft if needed. Start a new draft from the current
          published version before submitting; edits are not rebased
          automatically.
        </SettingsNotice>
      )}
      {draft.legalHold && (
        <SettingsNotice title="Draft retained under a legal hold">
          Editing, submission and discard are unavailable.
        </SettingsNotice>
      )}
      {(draft.state !== "draft" || expired) && (
        <SettingsNotice
          title={expired ? "Draft expired" : `Draft ${draft.state}`}
        >
          This draft is no longer editable.
        </SettingsNotice>
      )}
      {!reviewEnabled && (
        <SettingsNotice title="Personal review unavailable">
          You can save a private draft. Submission requires the owner review
          connection.
        </SettingsNotice>
      )}
    </>
  );
}
function DraftFields({
  file,
  sections,
  locked,
  onChange,
}: {
  file: MemoryDraftFile;
  sections: MemoryDraftEdit[];
  locked: boolean;
  onChange: (update: (current: MemoryDraftEdit[]) => MemoryDraftEdit[]) => void;
}) {
  return (
    <>
      {" "}
      {sections.map((section) => (
        <SettingField
          key={section.key}
          label={
            file.sections.find((s) => s.key === section.key)?.heading ??
            section.key
          }
        >
          <textarea
            className={styles.input}
            rows={6}
            value={section.body}
            disabled={locked}
            onChange={(event) =>
              onChange((current) =>
                current.map((s) =>
                  s.key === section.key
                    ? { ...s, body: event.target.value }
                    : s,
                ),
              )
            }
          />
        </SettingField>
      ))}
    </>
  );
}
