"use client";
import { useState } from "react";
import { useCapiro } from "../../../shared/capiro/CapiroBoundary";
import type {
  PlannerPerson,
  PlannerProject,
  PlannerTask,
} from "../../../shared/capiro/operations/planner-schemas";
import { useCapiroQuery } from "../../../shared/capiro/queries";
import {
  ActionButton,
  Badge,
  Field,
  Modal,
  Panel,
  StatusPanel,
  TextArea,
} from "../../../shared/module-ui";
import styles from "./planner.module.css";
import dialogStyles from "./task-dialog.module.css";
import { assigneeName, dayLabel, minutesLabel } from "./task-presentation";
import { TaskAttachments } from "./TaskAttachments";
import { TaskEditor } from "./TaskEditor";
import { TaskDetailFields } from "./TaskDetailFields";
import detailStyles from "./task-detail.module.css";
import { AddTimeDialog } from "./TimeDialogs";
type Props = {
  task: PlannerTask;
  people: PlannerPerson[];
  projects: PlannerProject[];
  onClose: () => void;
  onSaved: () => void;
};
type Model = ReturnType<typeof useDetail>;
function useDetail({ task, onSaved }: Props) {
  const api = useCapiro();
  const [edit, setEdit] = useState(false),
    [subtask, setSubtask] = useState(false),
    [time, setTime] = useState(false),
    [comment, setComment] = useState(""),
    [error, setError] = useState<string>(),
    [busy, setBusy] = useState(false);
  const events = useCapiroQuery("planner.task.events", {
      params: { id: task.id },
    }),
    children = useCapiroQuery("planner.tasks", {
      query: { parentId: task.id },
    });
  const writable = ["admin", "editor"].includes(task.access);
  const addComment = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError(undefined);
    try {
      await api.request("planner.task.comment", {
        params: { id: task.id },
        body: { kind: "comment", text: comment },
      });
      setComment("");
      events.reload();
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Unable to add comment.",
      );
    } finally {
      setBusy(false);
    }
  };
  const archive = async () => {
    setBusy(true);
    setError(undefined);
    try {
      await api.request("planner.task.update", {
        params: { id: task.id },
        body: { data: {}, version: task.version, archived: !task.archived },
      });
      onSaved();
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Unable to update task.",
      );
    } finally {
      setBusy(false);
    }
  };
  return {
    edit,
    setEdit,
    subtask,
    setSubtask,
    time,
    setTime,
    comment,
    setComment,
    error,
    busy,
    events,
    children,
    writable,
    addComment,
    archive,
  };
}
export function TaskDetail(props: Props) {
  const m = useDetail(props);
  return (
    <>
      <Modal
        className={`${dialogStyles.taskDialog} ${detailStyles.dialog}`}
        open
        onOpenChange={(open) => {
          if (!open) props.onClose();
        }}
        title={props.task.name}
        description={props.task.description || "Task details"}
        footer={
          <div className={detailStyles.footerActions}>
            <TaskDetailActions props={props} model={m} />
            <ActionButton onClick={props.onClose}>Close</ActionButton>
          </div>
        }
      >
        <div className={styles.drawerContent}>
          <div className={detailStyles.legacySummary}>
            <TaskSummary props={props} model={m} />
          </div>
          <TaskDetailFields
            task={props.task}
            people={props.people}
            projects={props.projects}
          />
          <SubtaskPanel model={m} />
          <TaskAttachments
            taskId={props.task.id}
            writable={props.task.access !== "viewer" && !props.task.archived}
          />
          <ActionButton disabled={!m.writable} onClick={() => m.setTime(true)}>
            Add time
          </ActionButton>
          <TaskActivity task={props.task} model={m} />
          {m.error && (
            <p className={styles.error} role="alert">
              {m.error}
            </p>
          )}
        </div>
      </Modal>
      <TaskEditor
        open={m.edit}
        onClose={() => m.setEdit(false)}
        onSaved={props.onSaved}
        task={props.task}
        people={props.people}
        projects={props.projects}
      />
      <TaskEditor
        open={m.subtask}
        onClose={() => m.setSubtask(false)}
        onSaved={m.children.reload}
        parentId={props.task.id}
        projectId={props.task.memberships[0]?.projectId}
        people={props.people}
        projects={props.projects}
      />
      <AddTimeDialog
        open={m.time}
        onClose={() => m.setTime(false)}
        taskId={props.task.id}
        projects={props.projects}
        projectId={props.task.memberships[0]?.projectId ?? null}
        onSaved={() => {
          m.events.reload();
          props.onSaved();
        }}
      />
    </>
  );
}
function TaskSummary({ props, model: m }: { props: Props; model: Model }) {
  const task = props.task;
  return (
    <>
      <div className={styles.tools}>
        <TaskDetailActions props={props} model={m} />
      </div>
      <dl className={styles.miniGrid}>
        <div>
          <dt>Assignee</dt>
          <dd>{assigneeName(task, props.people)}</dd>
        </div>
        <div>
          <dt>Due</dt>
          <dd>{dayLabel(task.dueOn)}</dd>
        </div>
        <div>
          <dt>Time</dt>
          <dd>
            {minutesLabel(task.actualMinutes)} /{" "}
            {minutesLabel(task.estimateMinutes)}
          </dd>
        </div>
      </dl>
      <Panel title="Projects and dependencies">
        <div className={styles.detail}>
          {task.memberships.map((item) => (
            <span key={item.projectId}>
              {props.projects.find((project) => project.id === item.projectId)
                ?.name ?? "Permitted project"}
            </span>
          ))}
          <p className={styles.muted}>
            {task.dependencies.length} dependencies ·{" "}
            {task.collaborators.length} collaborators
          </p>
        </div>
      </Panel>
    </>
  );
}
function SubtaskPanel({ model: m }: { model: Model }) {
  return (
    <Panel
      title="Subtasks"
      actions={
        <ActionButton disabled={!m.writable} onClick={() => m.setSubtask(true)}>
          + Subtask
        </ActionButton>
      }
    >
      <StatusPanel
        loading={m.children.loading}
        error={m.children.error}
        onRetry={m.children.reload}
        empty={m.children.data?.items.length === 0 ? "No subtasks" : undefined}
      >
        <div className={styles.detail}>
          {m.children.data?.items.map((child) => (
            <div key={child.id} className={styles.inline}>
              <Badge>{child.status.replaceAll("_", " ")}</Badge>
              <span>{child.name}</span>
            </div>
          ))}
        </div>
      </StatusPanel>
    </Panel>
  );
}
function TaskActivity({ task, model: m }: { task: PlannerTask; model: Model }) {
  return (
    <>
      <Panel title="Activity">
        <StatusPanel
          loading={m.events.loading}
          error={m.events.error}
          onRetry={m.events.reload}
        >
          <div className={styles.detail}>
            {m.events.data?.map((item) => (
              <article key={item.id}>
                <Badge>{item.kind}</Badge>
                <p>{item.text}</p>
                <time className={styles.note}>
                  {new Date(item.createdAt).toLocaleString()}
                </time>
              </article>
            ))}
          </div>
        </StatusPanel>
      </Panel>
      <form onSubmit={(event) => void m.addComment(event)}>
        <Field label="Comment" htmlFor="task-comment">
          <TextArea
            id="task-comment"
            value={m.comment}
            onChange={(event) => m.setComment(event.target.value)}
            required
            maxLength={20000}
          />
        </Field>
        <ActionButton
          type="submit"
          disabled={m.busy || task.access === "viewer"}
        >
          Post comment
        </ActionButton>
      </form>
    </>
  );
}

function TaskDetailActions({
  props,
  model: m,
}: {
  props: Props;
  model: Model;
}) {
  const task = props.task;
  return (
    <>
      <Badge>{task.status.replaceAll("_", " ")}</Badge>
      <Badge tone={task.priority === "high" ? "danger" : "neutral"}>
        {task.priority}
      </Badge>
      <ActionButton disabled={!m.writable} onClick={() => m.setEdit(true)}>
        Edit task
      </ActionButton>
      <ActionButton
        disabled={!m.writable || m.busy}
        onClick={() => void m.archive()}
      >
        {task.archived ? "Restore" : "Archive"}
      </ActionButton>
    </>
  );
}
