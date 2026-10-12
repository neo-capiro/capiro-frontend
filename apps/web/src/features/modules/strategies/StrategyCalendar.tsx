"use client";

import { useState } from "react";
import type { StrategyReferenceRow } from "../../../shared/capiro/operations/strategies-reference";
import { useCapiroMutation } from "../../../shared/capiro/queries";
import {
  ActionButton,
  Field,
  Modal,
  Panel,
  TextInput,
} from "../../../shared/module-ui";
import styles from "./strategies.module.css";

export function StrategyCalendar({
  rows: initial,
  onClose,
  onSaved,
}: {
  rows: StrategyReferenceRow[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [rows, setRows] = useState(
    initial.map((row) => ({
      label: row.label,
      startsOn: row.startsOn?.slice(0, 10) ?? "",
      endsOn: row.endsOn?.slice(0, 10) ?? "",
      tone: row.tone ?? "info",
    })),
  );
  const [discard, setDiscard] = useState(false);
  const save = useCapiroMutation("strategies.calendar.replace");
  function update(
    index: number,
    field: "label" | "startsOn" | "endsOn",
    value: string,
  ) {
    setRows((previous) =>
      previous.map((row, position) =>
        position === index ? { ...row, [field]: value } : row,
      ),
    );
  }
  async function persist() {
    try {
      await save.run({ params: { kind: "congress" }, body: { rows } });
      onSaved();
      onClose();
    } catch {
      /* Retain dates when server policy rejects a fork. */
    }
  }
  const valid = rows.every(
    (row) => row.label.trim() && row.startsOn && row.endsOn > row.startsOn,
  );
  return (
    <>
      <Modal
        open
        onOpenChange={(open) => {
          if (!open && !save.pending) setDiscard(true);
        }}
        title="Edit legislative calendar"
        description="Saving creates or replaces your firm’s reference calendar."
        footer={
          <>
            <ActionButton
              disabled={save.pending}
              onClick={() => setDiscard(true)}
            >
              Cancel
            </ActionButton>
            <ActionButton
              primary
              disabled={save.pending || !valid}
              onClick={persist}
            >
              Save calendar
            </ActionButton>
          </>
        }
      >
        <div className={styles.form}>
          {rows.map((row, index) => (
            <Panel key={index} title={row.label || "New milestone"}>
              <div className={styles.form}>
                <Field label="Milestone" htmlFor={`reference-label-${index}`}>
                  <TextInput
                    id={`reference-label-${index}`}
                    value={row.label}
                    maxLength={200}
                    onChange={(event) =>
                      update(index, "label", event.target.value)
                    }
                  />
                </Field>
                <div className={styles.grid}>
                  <Field
                    label="Start date"
                    htmlFor={`reference-start-${index}`}
                  >
                    <TextInput
                      id={`reference-start-${index}`}
                      type="date"
                      value={row.startsOn}
                      onChange={(event) =>
                        update(index, "startsOn", event.target.value)
                      }
                    />
                  </Field>
                  <Field
                    label="End date · Exclusive"
                    htmlFor={`reference-end-${index}`}
                  >
                    <TextInput
                      id={`reference-end-${index}`}
                      type="date"
                      value={row.endsOn}
                      onChange={(event) =>
                        update(index, "endsOn", event.target.value)
                      }
                    />
                  </Field>
                </div>
                <ActionButton
                  onClick={() =>
                    setRows((previous) =>
                      previous.filter((_, position) => position !== index),
                    )
                  }
                >
                  Remove milestone
                </ActionButton>
              </div>
            </Panel>
          ))}
          <ActionButton
            disabled={rows.length >= 60}
            onClick={() =>
              setRows((previous) => [
                ...previous,
                { label: "", startsOn: "", endsOn: "", tone: "info" },
              ])
            }
          >
            Add milestone
          </ActionButton>
          {!valid && (
            <p className={styles.notice}>
              Each milestone needs a label and an end after its start.
            </p>
          )}
          {save.error && (
            <p role="alert" className={styles.error}>
              {save.error.message}
            </p>
          )}
        </div>
      </Modal>
      <Modal
        open={discard}
        onOpenChange={setDiscard}
        title="Discard calendar changes?"
        footer={
          <>
            <ActionButton onClick={() => setDiscard(false)}>
              Keep editing
            </ActionButton>
            <ActionButton primary onClick={onClose}>
              Discard changes
            </ActionButton>
          </>
        }
      >
        <p>The saved calendar remains available.</p>
      </Modal>
    </>
  );
}
