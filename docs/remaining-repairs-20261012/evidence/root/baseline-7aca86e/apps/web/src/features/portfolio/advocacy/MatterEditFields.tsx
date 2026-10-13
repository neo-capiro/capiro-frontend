"use client";
import { useId } from "react";
import { SelectField } from "@/shared/portfolio/ui/SelectField";
import { TextareaField } from "@/shared/portfolio/ui/TextareaField";
import type { MatterDetail } from "./contracts";
import {
  matterEditOptions,
  needsOutcomeConfirmation,
  type MatterDraft,
} from "./matter-edit";
import styles from "./matter-edit.module.css";

export function MatterEditFields({
  matter,
  draft,
  onChange,
  disabled,
}: {
  matter: MatterDetail;
  draft: MatterDraft;
  onChange: (draft: MatterDraft) => void;
  disabled: boolean;
}) {
  const titleId = useId();
  const confirmId = useId();
  const options = matterEditOptions(matter.status);
  return (
    <fieldset disabled={disabled} className={styles.fields}>
      <div className={styles.field}>
        <label htmlFor={titleId}>Title</label>
        <input
          id={titleId}
          name="title"
          required
          maxLength={300}
          value={draft.title}
          onChange={(event) =>
            onChange({ ...draft, title: event.target.value })
          }
        />
      </div>
      <SelectField
        label="Status"
        name="status"
        value={draft.status}
        onChange={(event) =>
          onChange({
            ...draft,
            status: event.target.value,
            confirmOutcome: false,
          })
        }
      >
        {!options.some((option) => option.value === draft.status) && (
          <option value={draft.status} disabled>
            {draft.status} (unsupported)
          </option>
        )}
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </SelectField>
      <TextareaField
        label="Summary"
        name="summary"
        maxLength={4000}
        value={draft.summary}
        onChange={(event) =>
          onChange({ ...draft, summary: event.target.value })
        }
      />
      {needsOutcomeConfirmation(matter, draft.status) && (
        <div className={styles.confirmation}>
          <input
            id={confirmId}
            type="checkbox"
            checked={draft.confirmOutcome}
            onChange={(event) =>
              onChange({ ...draft, confirmOutcome: event.target.checked })
            }
          />
          <label htmlFor={confirmId}>
            This Matter has no linked outcome evidence. I confirm this outcome
            status by explicit human judgment, not an automatic conclusion. Save
            stays disabled until this is checked.
          </label>
        </div>
      )}
    </fieldset>
  );
}
