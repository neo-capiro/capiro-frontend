"use client";
import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useApi } from "@/shared/portfolio/api/provider";
import { Dialog } from "@/shared/portfolio/ui/Dialog";
import { TextareaField } from "@/shared/portfolio/ui/TextareaField";
import { QueryState } from "@/shared/portfolio/ui/QueryState";
import type { Preparation } from "./schema";
import { savePreparation, type EditPreparation } from "./api";
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
  });
  function close() {
    if (save.isPending) return;
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
          if (save.isPending) return;
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
              (field === "emailEvidence" && structuredEmailEvidence)
            }
            onChange={(event) => {
              setValues((prior) => ({ ...prior, [field]: event.target.value }));
              setValidation(undefined);
              save.reset();
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
          <button
            className="button primary"
            disabled={!writable || !dirty || save.isPending}
          >
            {save.isPending
              ? "Saving…"
              : save.isError
                ? "Check saved prep"
                : "Save prep"}
          </button>
        </footer>
      </form>
    </Dialog>
  );
}
