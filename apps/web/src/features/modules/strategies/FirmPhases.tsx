"use client";

import { useState } from "react";
import type { FirmPhase } from "../../../shared/capiro/operations/strategies-schemas";
import { useCapiroMutation } from "../../../shared/capiro/queries";
import {
  ActionButton,
  Field,
  Modal,
  Panel,
  SelectInput,
  TextInput,
} from "../../../shared/module-ui";
import styles from "./strategies.module.css";
import { fiscalYear, validPhaseRows } from "./strategy-model";

type Phase = Pick<FirmPhase, "label" | "startFy" | "startQ" | "endFy" | "endQ">;
export function FirmPhases({
  phases,
  onClose,
  onSaved,
}: {
  phases: FirmPhase[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [rows, setRows] = useState<Phase[]>(
    phases.map(({ label, startFy, startQ, endFy, endQ }) => ({
      label,
      startFy,
      startQ,
      endFy,
      endQ,
    })),
  );
  const [discard, setDiscard] = useState(false);
  const save = useCapiroMutation("strategies.phases.replace");
  function update(index: number, field: keyof Phase, value: string) {
    setRows((previous) =>
      previous.map((row, position) =>
        position === index
          ? { ...row, [field]: field === "label" ? value : Number(value) }
          : row,
      ),
    );
  }
  function move(index: number, offset: number) {
    const next = [...rows];
    const target = index + offset;
    if (target < 0 || target >= next.length) return;
    const row = next[index]!;
    next[index] = next[target]!;
    next[target] = row;
    setRows(next);
  }
  function add() {
    const fy = rows.at(-1)?.endFy ?? fiscalYear(new Date());
    setRows((previous) => [
      ...previous,
      { label: "", startFy: fy, startQ: 1, endFy: fy + 1, endQ: 1 },
    ]);
  }
  async function persist() {
    try {
      await save.run({ body: { rows } });
      onSaved();
      onClose();
    } catch {
      /* Preserve edits so coverage/order conflicts can be fixed. */
    }
  }
  return (
    <>
      <Modal
        open
        onOpenChange={(open) => {
          if (!open && !save.pending) setDiscard(true);
        }}
        title="Firm phases"
        description="This shared ladder appears in every strategy."
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
              disabled={save.pending || !rows.length || !validPhaseRows(rows)}
              onClick={persist}
            >
              {save.pending ? "Saving…" : "Save phases"}
            </ActionButton>
          </>
        }
      >
        <div className={styles.form}>
          {rows.map((row, index) => (
            <Panel key={index} title={row.label || "New phase"}>
              <div className={styles.form}>
                <Field label="Phase label" htmlFor={`phase-label-${index}`}>
                  <TextInput
                    id={`phase-label-${index}`}
                    maxLength={120}
                    value={row.label}
                    onChange={(event) =>
                      update(index, "label", event.target.value)
                    }
                  />
                </Field>
                <div className={styles.quarters}>
                  {(["startFy", "startQ", "endFy", "endQ"] as const).map(
                    (field) => (
                      <Field
                        key={field}
                        label={
                          {
                            startFy: "Start FY",
                            startQ: "Start quarter",
                            endFy: "End FY",
                            endQ: "End quarter · Exclusive",
                          }[field]
                        }
                        htmlFor={`phase-${field}-${index}`}
                      >
                        {field.endsWith("Q") ? (
                          <SelectInput
                            id={`phase-${field}-${index}`}
                            value={String(row[field])}
                            onValueChange={(value) =>
                              update(index, field, value)
                            }
                            options={[1, 2, 3, 4].map((value) => ({
                              value: String(value),
                              label: `Q${value}`,
                            }))}
                          />
                        ) : (
                          <TextInput
                            id={`phase-${field}-${index}`}
                            type="number"
                            min={2000}
                            max={2100}
                            value={row[field]}
                            onChange={(event) =>
                              update(index, field, event.target.value)
                            }
                          />
                        )}
                      </Field>
                    ),
                  )}
                </div>
                <div className={styles.actions}>
                  <ActionButton
                    disabled={!index}
                    onClick={() => move(index, -1)}
                  >
                    Move up
                  </ActionButton>
                  <ActionButton
                    disabled={index === rows.length - 1}
                    onClick={() => move(index, 1)}
                  >
                    Move down
                  </ActionButton>
                  <ActionButton
                    onClick={() =>
                      setRows((previous) =>
                        previous.filter((_, position) => position !== index),
                      )
                    }
                  >
                    Remove phase
                  </ActionButton>
                </div>
              </div>
            </Panel>
          ))}
          <div className={styles.actions}>
            <ActionButton disabled={rows.length >= 40} onClick={add}>
              Add phase
            </ActionButton>
            <ActionButton
              onClick={() =>
                setRows((previous) =>
                  [...previous].sort(
                    (a, b) =>
                      a.startFy * 4 + a.startQ - b.startFy * 4 - b.startQ,
                  ),
                )
              }
            >
              Sort by start date
            </ActionButton>
          </div>
          {!validPhaseRows(rows) && (
            <p role="alert" className={styles.notice}>
              Use unique labels, order phases by start date and end each phase
              after it begins.
            </p>
          )}
          {save.error && (
            <p role="alert" className={styles.error}>
              {save.error.message}
            </p>
          )}
          <p className={styles.muted}>
            Saving replaces the shared phase ladder. End quarters are exclusive.
          </p>
        </div>
      </Modal>
      <Modal
        open={discard}
        onOpenChange={setDiscard}
        title="Discard phase changes?"
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
        <p>Your saved firm phases stay available.</p>
      </Modal>
    </>
  );
}
