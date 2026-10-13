"use client";
import { useState } from "react";
import { useCapiro } from "../../../shared/capiro/CapiroBoundary";
import type {
  PlannerPerson,
  PlannerProject,
  PlannerTask,
} from "../../../shared/capiro/operations/planner-schemas";
import {
  ActionButton,
  Field,
  Modal,
  SelectInput,
  TextArea,
  TextInput,
} from "../../../shared/module-ui";
import { AdvancedTaskFields } from "./AdvancedTaskFields";
import styles from "./planner.module.css";
import type { Draft, TaskFormModel } from "./task-editor-data";
import { statuses } from "./task-presentation";
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
  return (
    <Modal
      open={props.open}
      onOpenChange={(open) => {
        if (!open) props.onClose();
      }}
      title={
        props.task ? "Edit task" : props.parentId ? "Add subtask" : "New task"
      }
      description="Task access and updates are checked by the Planner service."
    >
      {props.open && <TaskForm {...props} />}
    </Modal>
  );
}
function TaskForm(props: Props) {
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
  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError(undefined);
    try {
      const mutation = {
        ...data,
        parentId: props.parentId ?? task?.parentId ?? null,
        memberships: projectIds.map((projectId) => ({
          projectId,
          sectionId:
            task?.memberships.find((item) => item.projectId === projectId)
              ?.sectionId ?? null,
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
      setBusy(false);
    }
  };
  return (
    <form className={styles.stack} onSubmit={(event) => void submit(event)}>
      <TaskContentFields data={data} setData={setData} />
      <TaskOwnerFields
        data={data}
        setData={setData}
        people={props.people}
        projects={props.projects}
        projectIds={projectIds}
        setProjects={setProjects}
      />
      <TaskScheduleFields data={data} setData={setData} />
      <AdvancedTaskFields
        data={data}
        setData={setData}
        people={props.people}
        taskId={task?.id}
      />
      {error && (
        <p className={styles.error} role="alert">
          {error}
        </p>
      )}
      <div className={styles.footer}>
        <ActionButton type="button" onClick={props.onClose}>
          Cancel
        </ActionButton>
        <ActionButton primary type="submit" disabled={busy}>
          {busy ? "Saving…" : "Save task"}
        </ActionButton>
      </div>
    </form>
  );
}
function TaskContentFields({ data, setData }: TaskFormModel) {
  return (
    <>
      <Field label="Task name" htmlFor="task-name">
        <TextInput
          id="task-name"
          required
          maxLength={500}
          value={data.name}
          onChange={(event) => setData({ ...data, name: event.target.value })}
        />
      </Field>
      <Field label="Description" htmlFor="task-description">
        <TextArea
          id="task-description"
          maxLength={50000}
          value={data.description}
          onChange={(event) =>
            setData({ ...data, description: event.target.value })
          }
        />
      </Field>
    </>
  );
}
function TaskOwnerFields({
  data,
  setData,
  people,
  projects,
  projectIds,
  setProjects,
}: TaskFormModel & {
  people: PlannerPerson[];
  projects: PlannerProject[];
  projectIds: string[];
  setProjects: (ids: string[]) => void;
}) {
  return (
    <>
      <Field label="Assignee" htmlFor="task-assignee">
        <SelectInput
          id="task-assignee"
          value={data.assigneeId ?? "unassigned"}
          onValueChange={(id) =>
            setData({ ...data, assigneeId: id === "unassigned" ? null : id })
          }
          options={[
            { value: "unassigned", label: "Unassigned" },
            ...people.map((person) => ({
              value: person.id,
              label: person.name,
            })),
          ]}
        />
      </Field>
      <fieldset>
        <legend>Projects</legend>
        {projects
          .filter((project) => !project.archived)
          .map((project) => (
            <label key={project.id} className={styles.checkbox}>
              <input
                type="checkbox"
                checked={projectIds.includes(project.id)}
                disabled={
                  !projectIds.includes(project.id) &&
                  !["admin", "editor"].includes(project.access)
                }
                onChange={(event) =>
                  setProjects(
                    event.target.checked
                      ? [...projectIds, project.id]
                      : projectIds.filter((id) => id !== project.id),
                  )
                }
              />
              {project.name}
            </label>
          ))}
      </fieldset>
    </>
  );
}
function TaskScheduleFields({ data, setData }: TaskFormModel) {
  return (
    <div className={styles.form}>
      <Field label="Start date" htmlFor="task-start">
        <TextInput
          id="task-start"
          type="date"
          value={data.startOn ?? ""}
          onChange={(event) =>
            setData({
              ...data,
              startOn: event.target.value || null,
              startTime: event.target.value ? data.startTime : null,
            })
          }
        />
      </Field>
      <Field label="Due date" htmlFor="task-due">
        <TextInput
          id="task-due"
          type="date"
          min={data.startOn ?? undefined}
          value={data.dueOn ?? ""}
          onChange={(event) =>
            setData({
              ...data,
              dueOn: event.target.value || null,
              dueTime: event.target.value ? data.dueTime : null,
            })
          }
        />
      </Field>
      <Field label="Start time" htmlFor="task-start-time">
        <TextInput
          id="task-start-time"
          type="time"
          disabled={!data.startOn}
          value={data.startTime ?? ""}
          onChange={(event) =>
            setData({ ...data, startTime: event.target.value || null })
          }
        />
      </Field>
      <Field label="Due time" htmlFor="task-due-time">
        <TextInput
          id="task-due-time"
          type="time"
          disabled={!data.dueOn}
          value={data.dueTime ?? ""}
          onChange={(event) =>
            setData({ ...data, dueTime: event.target.value || null })
          }
        />
      </Field>
      <Field label="Time zone" htmlFor="task-zone">
        <TextInput
          id="task-zone"
          required={!!data.startTime || !!data.dueTime}
          value={data.timeZone ?? ""}
          placeholder="America/New_York"
          onChange={(event) =>
            setData({ ...data, timeZone: event.target.value || null })
          }
        />
      </Field>
      <Field label="Priority" htmlFor="task-priority">
        <SelectInput
          id="task-priority"
          value={data.priority}
          onValueChange={(value) =>
            setData({ ...data, priority: value as Draft["priority"] })
          }
          options={["none", "low", "medium", "high"].map((value) => ({
            value,
            label: value,
          }))}
        />
      </Field>
      <Field label="Status" htmlFor="task-status">
        <SelectInput
          id="task-status"
          value={data.status}
          onValueChange={(value) =>
            setData({ ...data, status: value as Draft["status"] })
          }
          options={statuses.map((item) => ({
            value: item.id,
            label: item.label,
          }))}
        />
      </Field>
      <Field label="Estimated minutes" htmlFor="task-estimate">
        <TextInput
          id="task-estimate"
          type="number"
          min={0}
          max={1000000}
          value={data.estimateMinutes}
          onChange={(event) =>
            setData({ ...data, estimateMinutes: Number(event.target.value) })
          }
        />
      </Field>
    </div>
  );
}
