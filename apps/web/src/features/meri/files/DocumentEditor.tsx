import { useId } from "react";
import { Button } from "@capiro/ui/button";
import { Input } from "@capiro/ui/input";
import { Textarea } from "@capiro/ui/textarea";
import type { DocumentDraft } from "./document-draft";
import { draftProblem } from "./document-draft";
import styles from "./files.module.css";

export function DocumentEditor({
  draft,
  parentVersionId,
  acknowledged,
  disabled,
  onEdit,
  onAcknowledge,
  onCreate,
  onRevise,
  onCancelRevision,
}: {
  draft: DocumentDraft;
  parentVersionId: string | null;
  acknowledged: boolean;
  disabled: boolean;
  onEdit: (draft: DocumentDraft) => void;
  onAcknowledge: (value: boolean) => void;
  onCreate: () => void;
  onRevise: () => void;
  onCancelRevision: () => void;
}) {
  const prefix = useId();
  const problem = draftProblem(draft);
  return (
    <section className={styles.panel} aria-labelledby={`${prefix}-heading`}>
      <h2 id={`${prefix}-heading`}>
        {parentVersionId ? "Replace document content" : "Create a document"}
      </h2>
      <p className={styles.muted} id={`${prefix}-guidance`}>
        {parentVersionId
          ? "Supply the complete replacement text. This creates a new version; the selected parent stays unchanged. Inspection does not load the original text into this editor."
          : "Write the text to save as a Word document or a plain text file."}
      </p>
      {parentVersionId && (
        <p className={styles.identifier}>Parent version: {parentVersionId}</p>
      )}
      <form
        className={styles.form}
        aria-describedby={`${prefix}-guidance`}
        onSubmit={(event) => {
          event.preventDefault();
          if (!disabled && !problem && (!parentVersionId || acknowledged))
            (parentVersionId ? onRevise : onCreate)();
        }}
      >
        <label className={styles.field}>
          <span>Document title</span>
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
          <span>File format</span>
          <select
            value={draft.format}
            disabled={disabled || Boolean(parentVersionId)}
            onChange={(event) => {
              const format = event.target.value;
              if (format === "docx" || format === "txt")
                onEdit({ ...draft, format });
            }}
          >
            <option value="docx">Word document (.docx)</option>
            <option value="txt">Plain text (.txt)</option>
          </select>
        </label>
        <label className={styles.field}>
          <span>
            {parentVersionId ? "Complete replacement text" : "Document text"}
          </span>
          <Textarea
            rows={12}
            value={draft.body}
            disabled={disabled}
            aria-describedby={`${prefix}-text-help`}
            onChange={(event) => onEdit({ ...draft, body: event.target.value })}
          />
        </label>
        <p className={styles.muted} id={`${prefix}-text-help`}>
          {draft.format === "docx"
            ? "Each line becomes a normal paragraph, including blank lines. Up to 1,000 paragraphs and 100,000 characters."
            : "Plain text preserves your whitespace. Up to 100,000 characters."}
        </p>
        {parentVersionId && (
          <label className={styles.confirmation}>
            <input
              type="checkbox"
              checked={acknowledged}
              disabled={disabled}
              onChange={(event) => onAcknowledge(event.target.checked)}
            />
            <span>
              This is the complete replacement, including any intentionally
              empty text.
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
            {parentVersionId ? "Create revised version" : "Create document"}
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
