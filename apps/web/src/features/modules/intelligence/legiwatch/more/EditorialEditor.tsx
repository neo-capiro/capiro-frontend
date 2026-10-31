"use client";
import { useCapiroMutation } from "../../../../../shared/capiro/queries";
import {
  ActionButton,
  Field,
  Modal,
  TextInput,
} from "../../../../../shared/module-ui";
import { SelectField } from "../components";
import {
  EvidenceScopePicker,
  useEvidenceScope,
} from "../sources/EvidenceScope";
import styles from "../legiwatch.module.css";
import { RecipientPicker } from "../delivery/RecipientPicker";
import { EditorialActivation } from "./EditorialActivation";
import { EditorialScheduleFields } from "./EditorialScheduleFields";
import { EditorialSourceFields } from "./EditorialSourceFields";
import { useEditorialDraft, type EditorialRow } from "./use-editorial-draft";
export function EditorialEditor({
  row,
  onClose,
  onSaved,
}: {
  row: EditorialRow;
  onClose: () => void;
  onSaved: () => void;
}) {
  const state = useEditorialDraft(row),
    { config, patch } = state,
    scope = useEvidenceScope(config.folderId);
  const save = useCapiroMutation("legiwatch.editorial.configure");
  const submit = async () => {
    try {
      await save.run({
        params: { id: row.id },
        body: { expectedVersion: row.version, config },
      });
      onSaved();
    } catch {
      /* Preserve version-bound edits. */
    }
  };
  return (
    <Modal
      open
      title={row.source.family.displayName}
      onOpenChange={(open) => {
        if (!open && !save.pending) onClose();
      }}
    >
      <div className={styles.form}>
        <fieldset disabled={save.pending} className={styles.form}>
          <EvidenceScopePicker
            value={config.folderId}
            state={scope}
            onChange={(folderId) => {
              const folder = scope.visible.find((item) => item.id === folderId);
              patch({
                folderId,
                clientId: folder?.clientId ?? undefined,
                sessionKey: folder?.defaultSession,
                dictionaryScopeAccepted: false,
              });
            }}
          />
          <SelectField
            id="editorial-template"
            label="Briefing template"
            value={config.template}
            onChange={(value) =>
              patch({
                template:
                  value === "research_update"
                    ? value
                    : "daily_legislative_brief",
              })
            }
          >
            <option value="daily_legislative_brief">
              Daily Legislative Brief
            </option>
            <option value="research_update">Research Update</option>
          </SelectField>
          <Field label="Subject" htmlFor="editorial-subject">
            <TextInput
              id="editorial-subject"
              maxLength={200}
              value={config.subject}
              onChange={(event) => patch({ subject: event.target.value })}
            />
          </Field>
          <EditorialScheduleFields config={config} patch={patch} />
          <EditorialSourceFields config={config} patch={patch} />
          <label className={styles.check}>
            <input
              type="checkbox"
              checked={config.prepareEnabled}
              onChange={(event) =>
                patch({ prepareEnabled: event.target.checked })
              }
            />
            Prepare editions on this schedule after activation
          </label>
          <label className={styles.check}>
            <input
              type="checkbox"
              checked={config.sendEnabled}
              onChange={(event) =>
                patch({
                  sendEnabled: event.target.checked,
                  schedule: {
                    ...config.schedule,
                    mode: event.target.checked ? "send" : "prepare",
                  },
                })
              }
            />
            Enable automatic delivery after a separate standing approval
          </label>
          {config.sendEnabled && (
            <RecipientPicker
              value={config.recipientSelection}
              onChange={(recipientSelection) => patch({ recipientSelection })}
            />
          )}
          <ActionButton
            primary
            disabled={!scope.selected?.canEdit || !config.subject.trim()}
            onClick={() => void submit()}
          >
            Save paused briefing configuration
          </ActionButton>
        </fieldset>
        {save.error && <p role="alert">{save.error.message}</p>}
        {!state.changed && <EditorialActivation row={row} onSaved={onSaved} />}
      </div>
    </Modal>
  );
}
