"use client";
import type {
  PlannerPerson,
  PlannerProject,
  PlannerTask,
} from "../../../shared/capiro/operations/planner-schemas";
import { ActionButton } from "../../../shared/module-ui";
import { TaskEditorBody } from "./TaskEditorBody";
import type { TaskEditorModel } from "./useTaskEditor";
import styles from "./planner.module.css";
import dialogStyles from "./task-dialog.module.css";
type Props = {
  model: TaskEditorModel;
  people: PlannerPerson[];
  projects: PlannerProject[];
  task?: PlannerTask;
  disabled?: boolean;
  inline?: boolean;
  onClose?: () => void;
};
export function TaskEditorForm({
  model: m,
  people,
  projects,
  task,
  disabled = false,
  inline = false,
  onClose,
}: Props) {
  const busy = m.busy || disabled;
  return (
    <form
      id={m.formId}
      aria-busy={busy}
      className={`${styles.stack} ${inline ? dialogStyles.inlineForm : dialogStyles.editorForm}`}
      onSubmit={(event) => void m.submit(event)}
      data-slot={inline ? "task-detail-editor" : "task-editor-form"}
    >
      <fieldset
        disabled={busy}
        className={`${styles.editorFields} ${dialogStyles.editorFields}`}
      >
        <div
          className={
            inline ? dialogStyles.inlineContent : dialogStyles.editorContent
          }
          data-slot="task-editor-content"
        >
          <TaskEditorBody
            {...m}
            disabled={busy}
            people={people}
            projects={projects}
            taskId={task?.id}
          />
          {m.error && (
            <p className={styles.error} role="alert">
              {m.error}
            </p>
          )}
        </div>
        {!inline && (
          <div
            className={`${styles.footer} ${dialogStyles.editorFooter}`}
            data-slot="task-editor-footer"
          >
            <ActionButton
              type="button"
              onClick={() => {
                if (!m.isPending()) onClose?.();
              }}
            >
              Cancel
            </ActionButton>
            <ActionButton primary type="submit" disabled={busy}>
              {busy ? "Saving…" : "Save task"}
            </ActionButton>
          </div>
        )}
      </fieldset>
    </form>
  );
}
