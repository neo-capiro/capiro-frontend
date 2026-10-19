"use client";
import { useState } from "react";
import type { z } from "zod";
import type {
  statuteConfig,
  statuteRule,
} from "../../../../../shared/capiro/operations/legiwatch-monitor-schemas";
import { useCapiroMutation } from "../../../../../shared/capiro/queries";
import {
  ActionButton,
  Field,
  Modal,
  TextArea,
  TextInput,
} from "../../../../../shared/module-ui";
import { SelectField } from "../components";
import styles from "../legiwatch.module.css";
import { FolderTargets, StaffRecipients } from "./ScopeControls";
import { StatuteMonitorReview } from "./StatuteMonitorReview";
type Config = z.infer<typeof statuteConfig>;
export function StatuteMonitorEditor({
  row,
  onClose,
  onSaved,
}: {
  row: z.infer<typeof statuteRule>;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [config, setConfig] = useState<Config>({
    folderIds: row.config.folderIds,
    billIds: row.config.billIds ?? [],
    jurisdiction: "FL",
    sessionKey: row.config.sessionKey ?? "",
    descendants: row.config.descendants ?? false,
    cadence: row.config.cadence ?? "manual",
    recipients: row.config.recipients,
  });
  const [bills, setBills] = useState((row.config.billIds ?? []).join("\n")),
    [changed, setChanged] = useState(false);
  const mutation = useCapiroMutation("legiwatch.statute.configure");
  const patch = (value: Partial<Config>) => {
    setChanged(true);
    setConfig((current) => ({ ...current, ...value }));
  };
  const save = async () => {
    try {
      await mutation.run({
        params: { id: row.id },
        body: {
          expectedVersion: row.version,
          config: {
            ...config,
            billIds: bills
              .split(/[\n,]/)
              .map((value) => value.trim())
              .filter(Boolean),
          },
        },
      });
      onSaved();
    } catch {
      /* Keep version-bound edits on conflict. */
    }
  };
  return (
    <Modal
      open
      title={row.name ?? "Statute monitor"}
      onOpenChange={(open) => {
        if (!open && !mutation.pending) onClose();
      }}
    >
      <div className={styles.form}>
        <fieldset disabled={mutation.pending} className={styles.form}>
          <FolderTargets
            values={config.folderIds}
            onChange={(folderIds) => patch({ folderIds })}
          />
          <Field label="Florida session" htmlFor="statute-session">
            <TextInput
              id="statute-session"
              maxLength={60}
              value={config.sessionKey}
              onChange={(event) => patch({ sessionKey: event.target.value })}
            />
          </Field>
          <Field
            label="Exact retained bill IDs (up to 30, one per line)"
            htmlFor="statute-bills"
          >
            <TextArea
              id="statute-bills"
              value={bills}
              onChange={(event) => {
                setBills(event.target.value);
                setChanged(true);
              }}
            />
          </Field>
          <SelectField
            id="statute-cadence"
            label="Scan cadence"
            value={config.cadence}
            onChange={(value) =>
              patch({
                cadence:
                  value === "hourly" || value === "daily" ? value : "manual",
              })
            }
          >
            <option value="manual">Manual review</option>
            <option value="hourly">Hourly</option>
            <option value="daily">Daily</option>
          </SelectField>
          <label className={styles.check}>
            <input
              type="checkbox"
              checked={config.descendants}
              onChange={(event) => patch({ descendants: event.target.checked })}
            />
            Include descendant sections of selected chapters
          </label>
          <StaffRecipients
            values={config.recipients}
            onChange={(recipients) => patch({ recipients })}
          />
          <ActionButton
            primary
            disabled={
              !changed ||
              !config.sessionKey ||
              !config.folderIds.length ||
              !bills.trim()
            }
            onClick={() => void save()}
          >
            Save scope for review
          </ActionButton>
        </fieldset>
        {mutation.error && <p role="alert">{mutation.error.message}</p>}
        {!changed && <StatuteMonitorReview row={row} onSaved={onSaved} />}
      </div>
    </Modal>
  );
}
