import { Button } from "@capiro/ui/button";
import { Input } from "@capiro/ui/input";
import type { TaskUpdateDraft } from "./workflow-state";
import styles from "./workflow.module.css";

export function TaskUpdateForm({
  draft,
  disabled,
  onEdit,
  onPrepare,
}: {
  draft: TaskUpdateDraft;
  disabled: boolean;
  onEdit: (draft: TaskUpdateDraft) => void;
  onPrepare: () => void;
}) {
  return (
    <form
      className={styles.panel}
      aria-label="Task update draft"
      onSubmit={(event) => {
        event.preventDefault();
        onPrepare();
      }}
    >
      <h2>Prepare a task update</h2>
      <p>
        Enter a known task ID and the fields to change. Empty fields stay
        unchanged. This is an unconditional update.
      </p>
      <fieldset disabled={disabled} className={styles.fields}>
        <label>
          Task ID
          <Input
            required
            value={draft.taskId}
            pattern="[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}"
            onChange={(event) =>
              onEdit({ ...draft, taskId: event.target.value })
            }
          />
        </label>
        <label>
          New task title
          <Input
            maxLength={240}
            value={draft.title}
            onChange={(event) =>
              onEdit({ ...draft, title: event.target.value })
            }
          />
        </label>
        <label>
          New task status
          <select
            value={draft.status}
            onChange={(event) =>
              onEdit({ ...draft, status: event.target.value })
            }
          >
            <option value="">Leave unchanged</option>
            <option value="todo">To do</option>
            <option value="in_progress">In progress</option>
            <option value="done">Done</option>
            <option value="blocked">Blocked</option>
            <option value="canceled">Canceled</option>
          </select>
        </label>
        <label>
          New due date
          <Input
            type="date"
            value={draft.dueDate}
            onChange={(event) =>
              onEdit({ ...draft, dueDate: event.target.value })
            }
          />
        </label>
        <p>
          Due dates use midnight UTC. Clearing a title or due date is not
          supported by this update contract.
        </p>
        <Button
          type="submit"
          disabled={
            disabled ||
            !draft.taskId.trim() ||
            ![draft.title, draft.status, draft.dueDate].some((value) =>
              value.trim(),
            )
          }
        >
          Prepare approval proposal
        </Button>
      </fieldset>
    </form>
  );
}
