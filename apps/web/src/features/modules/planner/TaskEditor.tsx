"use client";
import { useRef, useState } from "react";
import { useCapiro } from "../../../shared/capiro/CapiroBoundary";
import type {
  PlannerPerson,
  PlannerProject,
  PlannerTask,
} from "../../../shared/capiro/operations/planner-schemas";
import { ActionButton, Modal } from "../../../shared/module-ui";
import styles from "./planner.module.css";
import dialogStyles from "./task-dialog.module.css";
import { TaskEditorBody } from "./TaskEditorBody";
import type { Draft } from "./task-editor-data";
type Props = {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  people: PlannerPerson[];
  projects: PlannerProject[];
  projectId?: string | null;
  task?: PlannerTask;
  parentId?: string;
  initialTitle?: string;
};
export function TaskEditor(props: Props) {
  const pending = useRef<object | null>(null);
  return (
    <Modal
      className={`${dialogStyles.taskDialog} ${dialogStyles.editorDialog}`}
      open={props.open}
      onOpenChange={(open) => {
        if (!open && !pending.current) props.onClose();
      }}
      title={
        props.task ? "Edit task" : props.parentId ? "Add subtask" : "New task"
      }
      description="Task access and updates are checked by the Planner service."
    >
      {props.open && (
        <TaskForm
          {...props}
          onPendingChange={(owner, value) => {
            if (value) pending.current = owner;
            else if (pending.current === owner) pending.current = null;
          }}
        />
      )}
    </Modal>
  );
}
function TaskForm(
  props: Props & { onPendingChange: (owner: object, pending: boolean) => void },
) {
  const api = useCapiro();
  const task = props.task;
  const [data, setData] = useState<Draft>({
    name: task?.name ?? props.initialTitle ?? "",
    description: task?.description ?? "",
    assigneeId: task?.assigneeId ?? null,
    dueOn: task?.dueOn ?? null,
    startOn: task?.startOn ?? null,
    status: task?.status ?? "todo",
    priority: task?.priority ?? "none",
    estimateMinutes: task?.estimateMinutes ?? 0,
    startTime: task?.startTime ?? null,
    dueTime: task?.dueTime ?? null,
    timeZone: task?.timeZone ?? null,
    subtype: task?.subtype ?? "task",
    approval: task?.approval ?? "pending",
    tags: task?.tags ?? [],
    collaborators: task?.collaborators ?? [],
    dependencies: task?.dependencies ?? [],
    recurrence: task?.recurrence ?? null,
  });
  const [projectIds, setProjects] = useState(
      task?.memberships.map((item) => item.projectId) ??
        (props.projectId ? [props.projectId] : []),
    ),
    [busy, setBusy] = useState(false),
    [error, setError] = useState<string>();
  const [sectionIds, setSections] = useState<Record<string, string | null>>(
    Object.fromEntries(
      task?.memberships.map((item) => [item.projectId, item.sectionId]) ?? [],
    ),
  );
  const pending = useRef(false);
  const owner = useRef({});
  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (pending.current) return;
    pending.current = true;
    props.onPendingChange(owner.current, true);
    setBusy(true);
    setError(undefined);
    try {
      const mutation = {
        ...data,
        parentId: props.parentId ?? task?.parentId ?? null,
        memberships: projectIds.map((projectId) => ({
          projectId,
          sectionId: sectionIds[projectId] ?? null,
          position:
            task?.memberships.find((item) => item.projectId === projectId)
              ?.position ?? 0,
        })),
      };
      if (task)
        await api.request("planner.task.update", {
          params: { id: task.id },
          body: { version: task.version, data: mutation },
        });
      else
        await api.request("planner.task.create", { body: { data: mutation } });
      props.onSaved();
      props.onClose();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to save task.");
    } finally {
      pending.current = false;
      props.onPendingChange(owner.current, false);
      setBusy(false);
    }
  };
  return (
    <form
      aria-busy={busy}
      className={`${styles.stack} ${dialogStyles.editorForm}`}
      onSubmit={(event) => void submit(event)}
    >
      <fieldset
        disabled={busy}
        className={`${styles.editorFields} ${dialogStyles.editorFields}`}
      >
        <div
          className={dialogStyles.editorContent}
          data-slot="task-editor-content"
        >
          <TaskEditorBody
            data={data}
            setData={setData}
            disabled={busy}
            people={props.people}
            projects={props.projects}
            projectIds={projectIds}
            setProjects={setProjects}
            sectionIds={sectionIds}
            setSections={setSections}
            taskId={task?.id}
          />
          {error && (
            <p className={styles.error} role="alert">
              {error}
            </p>
          )}
        </div>
        <div
          className={`${styles.footer} ${dialogStyles.editorFooter}`}
          data-slot="task-editor-footer"
        >
          <ActionButton type="button" onClick={props.onClose}>
            Cancel
          </ActionButton>
          <ActionButton primary type="submit" disabled={busy}>
            {busy ? "Saving…" : "Save task"}
          </ActionButton>
        </div>
      </fieldset>
    </form>
  );
}
