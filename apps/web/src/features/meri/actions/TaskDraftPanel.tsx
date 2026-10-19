import { useId } from "react";
import { Button } from "@capiro/ui/button";
import type { DraftView, TaskEdits } from "./action-workflow-port";
import styles from "./workflow.module.css";

export function TaskDraftPanel({
  edits,
  draft,
  busy,
  onEdit,
  onReview,
  onPrepare,
}: {
  edits: TaskEdits;
  draft: DraftView | null;
  busy: boolean;
  onEdit: (edits: TaskEdits) => void;
  onReview: () => void;
  onPrepare: () => void;
}) {
  const titleId = useId(),
    dateId = useId();
  return (
    <section className={styles.panel} aria-label="Task draft">
      <h2>Edit task draft</h2>
      <p className={styles.muted}>
        Editing and reviewing a draft does not create a task.
      </p>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          onReview();
        }}
      >
        <div className={styles.field}>
          <label htmlFor={titleId}>Task title</label>
          <input
            id={titleId}
            value={edits.title}
            required
            disabled={busy}
            onChange={(event) =>
              onEdit({ ...edits, title: event.target.value })
            }
          />
        </div>
        <div className={styles.field}>
          <label htmlFor={dateId}>Due date</label>
          <input
            id={dateId}
            type="date"
            value={edits.dueDate ?? ""}
            disabled={busy}
            onChange={(event) =>
              onEdit({ ...edits, dueDate: event.target.value || null })
            }
          />
        </div>
        <Button
          type="submit"
          variant="outline"
          className={styles.button}
          disabled={busy || !edits.title.trim() || Boolean(draft)}
        >
          Review draft
        </Button>
      </form>
      {draft && (
        <div className={styles.review} aria-label="Service-reviewed draft">
          <h3>Reviewed task intent</h3>
          <p>{draft.title}</p>
          <p>Due date: {draft.dueDate ?? "None"}</p>
          <p className={styles.muted}>
            The supporting recommendation is context, not approval-bound source
            evidence.
          </p>
          <Button
            type="button"
            className={styles.button}
            disabled={busy}
            onClick={onPrepare}
          >
            Prepare approval proposal
          </Button>
        </div>
      )}
    </section>
  );
}
