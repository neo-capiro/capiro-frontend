import { useId } from "react";
import { Button } from "@capiro/ui/button";
import { Input } from "@capiro/ui/input";
import { Textarea } from "@capiro/ui/textarea";
import {
  workbookExample,
  workbookProblem,
  type WorkbookDraft,
} from "./workbook-draft";
import styles from "./files.module.css";

export function WorkbookEditor({
  draft,
  parentVersionId,
  acknowledged,
  disabled,
  onEdit,
  onAcknowledge,
  onSubmit,
  onCancelRevision,
}: {
  draft: WorkbookDraft;
  parentVersionId: string | null;
  acknowledged: boolean;
  disabled: boolean;
  onEdit: (draft: WorkbookDraft) => void;
  onAcknowledge: (value: boolean) => void;
  onSubmit: () => void;
  onCancelRevision: () => void;
}) {
  const prefix = useId();
  const problem = workbookProblem(draft);
  return (
    <section className={styles.panel} aria-labelledby={`${prefix}-heading`}>
      <h2 id={`${prefix}-heading`}>
        {parentVersionId ? "Replace workbook content" : "Create a workbook"}
      </h2>
      <p className={styles.muted}>
        This connection creates Excel (.xlsx) workbooks. Enter typed sheets and
        cells as JSON. The service validates the complete content before
        admission.
      </p>
      {parentVersionId && (
        <p className={styles.identifier}>Parent version: {parentVersionId}</p>
      )}
      <form
        className={styles.form}
        onSubmit={(event) => {
          event.preventDefault();
          if (!disabled && !problem && (!parentVersionId || acknowledged))
            onSubmit();
        }}
      >
        <label className={styles.field}>
          <span>Workbook title</span>
          <Input
            value={draft.title}
            maxLength={200}
            required
            disabled={disabled}
            onChange={(event) =>
              onEdit({ ...draft, title: event.target.value })
            }
          />
        </label>
        <label className={styles.field}>
          <span>Complete sheets (JSON)</span>
          <Textarea
            rows={18}
            value={draft.sheets}
            disabled={disabled}
            spellCheck={false}
            aria-describedby={`${prefix}-help`}
            onChange={(event) =>
              onEdit({ ...draft, sheets: event.target.value })
            }
          />
        </label>
        <div className={styles.muted} id={`${prefix}-help`}>
          <p>
            Each sheet has a name and rows of typed cells. Use{" "}
            <code>value</code> for a string, number, boolean or null; use{" "}
            <code>formula</code> for a formula beginning with =. Literal strings
            beginning with = remain literal strings. Optional{" "}
            <code>numberFormat</code> formats a cell.
          </p>
          <p>
            The complete sheet array replaces the prior workbook content when
            revising. Formula caches remain unverified and require recalculation
            in Excel. Inspection does not load the old workbook into this
            editor.
          </p>
        </div>
        <details>
          <summary>Show typed workbook example</summary>
          <pre className={styles.example}>{workbookExample}</pre>
        </details>
        {parentVersionId && (
          <label className={styles.confirmation}>
            <input
              type="checkbox"
              checked={acknowledged}
              disabled={disabled}
              onChange={(event) => onAcknowledge(event.target.checked)}
            />
            <span>
              This is the complete replacement workbook, including every sheet
              and cell to retain.
            </span>
          </label>
        )}
        <div className={styles.controls}>
          <Button
            type="submit"
            className={styles.button}
            disabled={
              disabled ||
              Boolean(problem) ||
              Boolean(parentVersionId && !acknowledged)
            }
          >
            {parentVersionId ? "Create revised workbook" : "Create workbook"}
          </Button>
          {parentVersionId && (
            <Button
              type="button"
              variant="outline"
              className={styles.button}
              disabled={disabled}
              onClick={onCancelRevision}
            >
              Cancel revision
            </Button>
          )}
        </div>
        {problem && <p className={styles.muted}>{problem}</p>}
      </form>
    </section>
  );
}
