"use client";
import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useApi } from "@/shared/portfolio/api/provider";
import { Dialog } from "@/shared/portfolio/ui/Dialog";
import { TextareaField } from "@/shared/portfolio/ui/TextareaField";
import { QueryState } from "@/shared/portfolio/ui/QueryState";
import type { Preparation } from "./schema";
import { savePreparation, readPreparation, type EditPreparation } from "./api";
import {
  editedBody,
  editValues,
  prepEditability,
  prepFields,
  type PrepField,
} from "./editing";
import styles from "./preparation.module.css";

/**
 * The editor's submit decision, exported so the binding guard is testable without a
 * DOM: only a prep whose client provenance matches the enclosing meeting may be
 * written, and only a changed body is sent.
 */
export function submitPrepEdit({
  prep,
  values,
  clientId,
  canWrite,
  save,
  onInvalid,
}: {
  prep: Preparation;
  values: Record<PrepField, string>;
  clientId: string | null;
  canWrite: boolean;
  save: (body: EditPreparation) => void;
  onInvalid?: (message: string) => void;
}): void {
  if (!canWrite || prepEditability(prep, clientId) !== "editable") return;
  try {
    const body = editedBody(prep, values);
    if (Object.keys(body).length) save(body);
  } catch (error) {
    onInvalid?.(
      error instanceof Error ? error.message : "Check the preparation fields.",
    );
  }
}
export function PreparationEditor({
  meetingId,
  clientId,
  prep,
  canWrite,
  onClose,
}: {
  meetingId: string;
  clientId: string | null;
  prep: Preparation;
  canWrite: boolean;
  onClose: () => void;
}) {
  const api = useApi();
  const cache = useQueryClient();
  const [values, setValues] = useState(() => editValues(prep));
  const [validation, setValidation] = useState<string>();
  const [discard, setDiscard] = useState(false);
  // A save whose receipt never validated may still have committed. Until the stored
  // record is READ back, the outcome is unresolved: no implicit write is allowed and
  // typing must not turn this back into an ordinary save.
  const [outcome, setOutcome] = useState<{
    body: EditPreparation;
    values: Record<PrepField, string>;
  }>();
  const structuredEmailEvidence = prep.emailEvidence.some(
    (item) => typeof item !== "string",
  );
  // A prep whose client provenance is unknown cannot be written through this
  // editor: the update path preserves the stored stamp, so the receipt check would
  // report a committed write as invalid. Read-only until the backend binds the row.
  const editability = prepEditability(prep, clientId);
  const writable = canWrite && editability === "editable";
  const dirty = JSON.stringify(values) !== JSON.stringify(editValues(prep));
  const save = useMutation({
    retry: false,
    mutationFn: (body: EditPreparation) =>
      savePreparation(api, meetingId, prep.id, body, clientId),
    onSuccess: async () => {
      await Promise.all([
        cache.invalidateQueries({ queryKey: ["meeting", meetingId] }),
        cache.invalidateQueries({ queryKey: ["calendar", "meetings"] }),
      ]);
      onClose();
    },
    // The receipt is what failed, not necessarily the write. Hold the outcome open
    // and keep the draft; only a read can settle what was actually stored.
    onError: (_error: Error, body: EditPreparation) =>
      setOutcome({ body, values: { ...values } }),
  });
  /**
   * The "check" action: an authorized read of the existing prep under this same
   * meeting/client identity. It never writes. Only a read that returns a valid
   * receipt settles the uncertainty.
   */
  const check = useMutation({
    retry: false,
    mutationFn: () => readPreparation(api, meetingId, prep.id, clientId),
    onSuccess: async (stored) => {
      const target = outcome;
      if (!target) return;
      const storedValues = editValues(stored);
      const applied = (Object.keys(target.body) as PrepField[]).every(
        (field) => storedValues[field] === target.values[field],
      );
      setOutcome(undefined);
      if (applied) {
        await Promise.all([
          cache.invalidateQueries({ queryKey: ["meeting", meetingId] }),
          cache.invalidateQueries({ queryKey: ["calendar", "meetings"] }),
        ]);
        onClose();
        return;
      }
      // Read established the outcome: the change was not stored. The draft is
      // intact, so an explicit save is allowed again.
      save.reset();
      setValidation(
        "The saved preparation does not contain your changes. Your draft is unchanged, so you can save again.",
      );
    },
  });
  function close() {
    if (save.isPending || check.isPending) return;
    if (dirty) setDiscard(true);
    else onClose();
  }
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) close();
      }}
      title="Edit prep"
      description="Update the working content for this meeting."
      className={styles.dialog}
    >
      <form
        className={styles.form}
        onSubmit={(event) => {
          event.preventDefault();
          if (save.isPending || check.isPending || outcome) return;
          setValidation(undefined);
          submitPrepEdit({
            prep,
            values,
            clientId,
            canWrite: writable,
            save: save.mutate,
            onInvalid: setValidation,
          });
        }}
      >
        {(Object.keys(prepFields) as PrepField[]).map((field) => (
          <TextareaField
            key={field}
            label={prepFields[field]}
            value={values[field]}
            rows={Math.max(1, Math.min(8, values[field].split(/\r?\n/).length))}
            disabled={
              !writable ||
              save.isPending ||
              check.isPending ||
              (field === "emailEvidence" && structuredEmailEvidence)
            }
            onChange={(event) => {
              // The draft stays editable, but nothing here clears an unresolved
              // write: only the readback action can settle it.
              setValues((prior) => ({ ...prior, [field]: event.target.value }));
              setValidation(undefined);
            }}
          />
        ))}
        <small>
          Use one item per line. Editing a section saves its text; unchanged
          sections retain their original evidence references.
        </small>
        {!canWrite && (
          <p role="note">
            Preparation changes are unavailable. Your draft is preserved.
          </p>
        )}
        {editability === "unbound-legacy" && (
          <p role="note">
            This preparation was saved before it was bound to a client, so it is
            read-only here. Ask an administrator to rebind it, or generate a new
            preparation to edit its content.
          </p>
        )}
        {editability === "other-client" && (
          <p role="note">
            This preparation belongs to a different client and cannot be edited
            from this meeting.
          </p>
        )}
        {structuredEmailEvidence && (
          <p role="note">
            Email evidence is read-only here to preserve its saved source
            attribution. The current edit service accepts text only.
          </p>
        )}
        {validation && <p role="alert">{validation}</p>}
        <QueryState error={save.error} />
        {outcome && (
          <p role="alert">
            This save did not come back with a confirmed receipt, so the change
            may or may not have been stored. Your draft is kept. Use “Check
            saved prep” to read what was stored before writing again.
          </p>
        )}
        {check.error && <QueryState error={check.error} />}
        {discard && (
          <div className="status" role="alert">
            <p>Discard your unsaved preparation changes?</p>
            <div className="row">
              <button
                className="button"
                type="button"
                onClick={() => setDiscard(false)}
              >
                Keep editing
              </button>
              <button className="button" type="button" onClick={onClose}>
                Discard changes
              </button>
            </div>
          </div>
        )}
        <footer className="row">
          <button
            className="button"
            type="button"
            disabled={save.isPending}
            onClick={close}
          >
            Cancel
          </button>
          {outcome ? (
            <button
              className="button primary"
              type="button"
              disabled={check.isPending}
              onClick={() => check.mutate()}
            >
              {check.isPending ? "Checking…" : "Check saved prep"}
            </button>
          ) : (
            <button
              className="button primary"
              disabled={
                !writable || !dirty || save.isPending || check.isPending
              }
            >
              {save.isPending ? "Saving…" : "Save prep"}
            </button>
          )}
        </footer>
      </form>
    </Dialog>
  );
}
