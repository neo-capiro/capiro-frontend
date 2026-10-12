"use client";
import { useState } from "react";
import { Dialog } from "@/shared/portfolio/ui/Dialog";
import { QueryState } from "@/shared/portfolio/ui/QueryState";
import { draftForMatter, prepareMatterUpdate } from "./matter-edit";
import type { MatterEditReview } from "./matter-edit-scope";
import { MatterEditFields } from "./MatterEditFields";
import { useMatterEdit } from "./useMatterEdit";
import styles from "./matter-edit.module.css";

export function EditMatterDialog({
  review: initialReview,
  onClose,
  onSaved,
}: {
  review: MatterEditReview;
  onClose: () => void;
  onSaved: (message: string) => void;
}) {
  const [review, setReview] = useState(initialReview);
  const [reloaded, setReloaded] = useState(false);
  const [draft, setDraft] = useState(() => draftForMatter(review.matter));
  const writer = useMatterEdit(review, onSaved, (next) => {
    setReview(next);
    setDraft((current) => ({ ...current, confirmOutcome: false }));
    setReloaded(true);
  });
  let valid = true;
  try {
    prepareMatterUpdate(review.matter, draft);
  } catch {
    valid = false;
  }
  const locked =
    writer.pending || Boolean(writer.attempt) || Boolean(writer.actorError);
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      title="Edit advocacy matter"
      className={styles.dialog}
    >
      <form
        onSubmit={(event) => {
          event.preventDefault();
          if (valid && !locked && !writer.sourceError && !writer.reviewConflict)
            writer.save.mutate(draft);
        }}
      >
        <div className={styles.body}>
          {!writer.actorError && (
            <MatterEditFields
              matter={review.matter}
              draft={
                writer.attempt
                  ? {
                      ...writer.attempt.input,
                      confirmOutcome:
                        writer.attempt.input.confirmOutcome ?? false,
                    }
                  : draft
              }
              onChange={setDraft}
              disabled={locked}
            />
          )}
          {(writer.actorError || writer.sourceError) && (
            <p role="status" className="status">
              {writer.actorError ?? writer.sourceError} Your draft remains here.
              Reload current details before saving.
            </p>
          )}
          {!writer.attempt && (writer.sourceError || writer.reviewConflict) && (
            <button
              className="button"
              type="button"
              disabled={writer.pending || Boolean(writer.actorError)}
              onClick={() => writer.reload.mutate()}
            >
              Reload current details
            </button>
          )}
          {reloaded && !writer.actorError && (
            <div className="status" role="status">
              <p>
                Current details reloaded. Your draft is retained; review it
                against the current saved values before saving.
              </p>
              <dl>
                <dt>Current title</dt>
                <dd>{review.matter.title}</dd>
                <dt>Current status</dt>
                <dd>{review.matter.status.replaceAll("_", " ")}</dd>
                <dt>Current summary</dt>
                <dd>{review.matter.summary ?? "No summary"}</dd>
              </dl>
            </div>
          )}
          {writer.attempt && (
            <div role="status" className="status">
              <p>
                {writer.pending
                  ? "The submitted result is being checked."
                  : "The submitted result is unknown. Another save is disabled until current details confirm the reviewed changes."}
              </p>
              {!writer.pending && (
                <button
                  className="button"
                  type="button"
                  disabled={Boolean(writer.actorError)}
                  onClick={() => writer.check.mutate()}
                >
                  Check current result
                </button>
              )}
            </div>
          )}
          <QueryState
            error={
              writer.reload.error ?? writer.check.error ?? writer.save.error
            }
          />
        </div>
        <footer className={styles.footer}>
          <button
            className="button primary"
            type="submit"
            disabled={
              !valid ||
              locked ||
              Boolean(writer.sourceError) ||
              writer.reviewConflict
            }
          >
            {writer.pending ? "Saving…" : "Save changes"}
          </button>
          <button className="button" type="button" onClick={onClose}>
            Cancel
          </button>
        </footer>
      </form>
    </Dialog>
  );
}
