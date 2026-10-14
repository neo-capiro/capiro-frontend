"use client";
import { useRef, useState } from "react";
import type {
  PlannerPerson,
  PlannerProject,
  PlannerTask,
} from "../../../shared/capiro/operations/planner-schemas";
import {
  useCapiroMutation,
  useCapiroQuery,
} from "../../../shared/capiro/queries";
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
import { TaskSubtasks } from "./TaskSubtasks";
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
  const [edit, setEdit] = useState(false),
    [subtask, setSubtask] = useState(false),
    [time, setTime] = useState(false),
    [comment, setComment] = useState(""),
    [subtaskRevision, setSubtaskRevision] = useState(0);
  const active = useRef(false);
  const events = useCapiroQuery("planner.task.events", {
    params: { id: task.id },
  });
  const commentMutation = useCapiroMutation("planner.task.comment");
  const archiveMutation = useCapiroMutation("planner.task.update");
  const writable = ["admin", "editor"].includes(task.access);
  const addComment = async (event: React.FormEvent) => {
    event.preventDefault();
    if (active.current || task.access === "viewer") return;
    active.current = true;
    const submitted = comment;
    archiveMutation.reset();
    try {
      await commentMutation.run({
        params: { id: task.id },
        body: { kind: "comment", text: submitted },
      });
      setComment((current) => (current === submitted ? "" : current));
      events.reload();
    } catch {
      // Canonical mutation state retains the failure; an uncertain write is never replayed.
    } finally {
      active.current = false;
    }
  };
  const archive = async () => {
    if (active.current || !writable) return;
    active.current = true;
    commentMutation.reset();
    try {
      await archiveMutation.run({
        params: { id: task.id },
        body: { data: {}, version: task.version, archived: !task.archived },
      });
      onSaved();
    } catch {
      // Canonical mutation state owns errors and view-generation disposal.
    } finally {
      active.current = false;
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
    error: commentMutation.error?.message ?? archiveMutation.error?.message,
    busy: commentMutation.pending || archiveMutation.pending,
    isPending: () => active.current,
    events,
    writable,
    addComment,
    archive,
    subtaskRevision,
    refreshSubtasks: () => setSubtaskRevision((revision) => revision + 1),
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
          if (!open && !m.isPending()) props.onClose();
        }}
        title={props.task.name}
        description={props.task.description || "Task details"}
        footer={
          <div className={detailStyles.footerActions}>
            <TaskDetailActions props={props} model={m} />
            <ActionButton
              disabled={m.busy}
              onClick={() => {
                if (!m.isPending()) props.onClose();
              }}
            >
              Close
            </ActionButton>
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
          <TaskSubtasks
            key={`${props.task.id}:${m.subtaskRevision}`}
            taskId={props.task.id}
            writable={m.writable}
            busy={m.busy}
            isPending={m.isPending}
            onAdd={() => m.setSubtask(true)}
            onNavigate={props.onClose}
          />
          <TaskAttachments
            taskId={props.task.id}
            writable={props.task.access !== "viewer" && !props.task.archived}
          />
          <ActionButton
            disabled={!m.writable || m.busy}
            onClick={() => {
              if (!m.isPending()) m.setTime(true);
            }}
          >
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
        onSaved={m.refreshSubtasks}
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
      <form aria-busy={m.busy} onSubmit={(event) => void m.addComment(event)}>
        <fieldset
          disabled={m.busy || task.access === "viewer"}
          className={styles.editorFields}
        >
          <Field label="Comment" htmlFor="task-comment">
            <TextArea
              id="task-comment"
              disabled={m.busy || task.access === "viewer"}
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
        </fieldset>
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
      <ActionButton
        disabled={!m.writable || m.busy}
        onClick={() => {
          if (!m.isPending()) m.setEdit(true);
        }}
      >
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
