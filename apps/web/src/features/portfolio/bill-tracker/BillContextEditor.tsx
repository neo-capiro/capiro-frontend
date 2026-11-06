"use client";
import { useState } from "react";
import { ActionButton, Field, SelectInput, TextArea } from "@/shared/module-ui";
import {
  impactContextSchema,
  type ImpactContext,
  type ImpactRow,
} from "@/shared/capiro/operations/legiwatch-impact-schemas";
import styles from "./impact-tracker.module.css";

export function BillContextEditor({
  row,
  pending,
  onSave,
}: {
  row: ImpactRow;
  pending: boolean;
  onSave: (context: ImpactContext) => void;
}) {
  const [position, setPosition] = useState(row.position ?? "");
  const [priority, setPriority] = useState(row.priority ?? "");
  const [note, setNote] = useState(row.note ?? "");
  const parsed = impactContextSchema.safeParse({
    position: position || null,
    priority: priority || null,
    analystNote: note.trim() || null,
  });
  const changed =
    position !== (row.position ?? "") ||
    priority !== (row.priority ?? "") ||
    note !== (row.note ?? "");
  return (
    <form
      className={styles.section}
      onSubmit={(event) => {
        event.preventDefault();
        if (parsed.success && changed && !pending) onSave(parsed.data);
      }}
    >
      <h3>Client position and priority</h3>
      <p className={styles.muted}>
        Saved for {row.clientName}. These decisions do not change the impact
        analysis.
      </p>
      <div className={styles.filters}>
        <Field label="Position" htmlFor="bill-position">
          <SelectInput
            id="bill-position"
            value={position}
            disabled={pending}
            onValueChange={setPosition}
            options={[
              { value: "", label: "Not set" },
              { value: "support", label: "Support" },
              { value: "oppose", label: "Oppose" },
              { value: "monitor", label: "Monitor" },
            ]}
          />
        </Field>
        <Field label="Priority" htmlFor="bill-priority">
          <SelectInput
            id="bill-priority"
            value={priority}
            disabled={pending}
            onValueChange={setPriority}
            options={[
              { value: "", label: "Not set" },
              { value: "low", label: "Low" },
              { value: "med", label: "Medium" },
              { value: "high", label: "High" },
            ]}
          />
        </Field>
      </div>
      <Field label="Analyst note" htmlFor="bill-note">
        <TextArea
          id="bill-note"
          value={note}
          maxLength={8000}
          disabled={pending}
          onChange={(event) => setNote(event.target.value)}
        />
      </Field>
      {!parsed.success && (
        <p role="alert">
          Choose a supported position and priority before saving.
        </p>
      )}
      <div>
        <ActionButton
          type="submit"
          primary
          disabled={pending || !changed || !parsed.success}
        >
          {pending ? "Saving…" : "Save client context"}
        </ActionButton>
      </div>
    </form>
  );
}
