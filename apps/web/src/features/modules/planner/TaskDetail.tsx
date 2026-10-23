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
} from "../../../shared/module-ui";
import styles from "./planner.module.css";
import dialogStyles from "./task-dialog.module.css";
import { assigneeName, dayLabel, minutesLabel } from "./task-presentation";
import { TaskAttachments } from "./TaskAttachments";
import { TaskEditor } from "./TaskEditor";
import { TaskDetailFields } from "./TaskDetailFields";
import { TaskEditorForm } from "./TaskEditorForm";
import { useTaskEditor } from "./useTaskEditor";
import { useDesktopTaskLayout } from "./TaskEditorBody";
import { TaskSubtasks } from "./TaskSubtasks";
import detailStyles from "./task-detail.module.css";
import { AddTimeDialog } from "./TimeDialogs";
import { duplicateTaskSeed } from "./task-editor-data";
import { MarkdownTextarea } from "../../../shared/markdown/MarkdownTextarea";
import { TaskEventText } from "./TaskEventText";
import { useEntityEntry } from "../../../shared/meri-entry/public";
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
    [duplicate, setDuplicateState] = useState(false),
    [subtask, setSubtask] = useState(false),
    [time, setTime] = useState(false),
    [comment, setComment] = useState(""),
    [subtaskRevision, setSubtaskRevision] = useState(0),
    [editorBusy, setEditorBusy] = useState(false);
  const active = useRef(false);
  const duplicateOpen = useRef(false);
  const events = useCapiroQuery("planner.task.events", {
    params: { id: task.id },
  });
  const commentMutation = useCapiroMutation("planner.task.comment");
  const archiveMutation = useCapiroMutation("planner.task.update");
  const writable = ["admin", "editor"].includes(task.access);
  const addComment = async (event: React.FormEvent) => {
    event.preventDefault();
    if (
      active.current ||
      duplicateOpen.current ||
      task.access === "viewer" ||
      !comment.trim()
    )
      return;
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
    if (active.current || duplicateOpen.current || !writable) return;
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
    duplicate,
    setDuplicate: (value: boolean) => {
      if (value && (active.current || !writable)) return;
      duplicateOpen.current = value;
      setDuplicateState(value);
    },
    canSubmitDuplicate: () =>
      duplicateOpen.current && writable && !active.current,
    subtask,
    setSubtask,
    time,
    setTime,
    comment,
    setComment,
    error: commentMutation.error?.message ?? archiveMutation.error?.message,
    busy:
      duplicate ||
      editorBusy ||
      commentMutation.pending ||
      archiveMutation.pending,
    setEditorPending: (_owner: object, value: boolean) => {
      if (value) {
        commentMutation.reset();
        archiveMutation.reset();
      }
      active.current = value;
      setEditorBusy(value);
    },
    isPending: () => active.current || duplicateOpen.current,
    events,
    writable,
    addComment,
    archive,
    subtaskRevision,
    refreshSubtasks: () => setSubtaskRevision((revision) => revision + 1),
  };
}
export function TaskDetail(props: Props) {
  return (
    <TaskDetailSession
      key={`${props.task.id}:${props.task.version}:${props.task.access}`}
      {...props}
    />
  );
}
function TaskDetailSession(props: Props) {
  const m = useDetail(props);
  const [attachments, setAttachments] = useState<{
    pending: boolean;
    error?: string;
  }>({ pending: false });
  const desktop = useDesktopTaskLayout();
  const editor = useTaskEditor({
    task: props.task,
    onSaved: props.onSaved,
    onClose: () => {
      if (m.edit) m.setEdit(false);
      else props.onClose();
    },
    canSubmit: () => m.writable && !m.isPending(),
    onPendingChange: m.setEditorPending,
  });
  const duplicateEditor = useTaskEditor({
    initialCreate: duplicateTaskSeed(props.task, props.projects),
    onSaved: props.onSaved,
    onClose: () => m.setDuplicate(false),
    canSubmit: m.canSubmitDuplicate,
    onPendingChange: m.setEditorPending,
  });
  const inline =
    desktop && m.writable && !m.edit && !m.subtask && !m.time && !m.duplicate;
  const edited = editor.hasChanges || Boolean(m.comment.trim());
  const meri = useEntityEntry(
    props.task.clientId ?? "",
    { source: "planner-task", taskId: props.task.id },
    Boolean(props.task.clientId) &&
      !props.task.archived &&
      !m.busy &&
      !edited &&
      !m.edit &&
      !m.subtask &&
      !m.time &&
      !m.error &&
      !attachments.pending &&
      !attachments.error &&
      !editor.error,
  );
  const meriAction = (
    <ActionButton
      disabled={!meri.ready}
      onClick={meri.open}
      title={edited ? "Save your task edits before opening Meri." : meri.reason}
    >
      Ask Meri
    </ActionButton>
  );
  return (
    <>
      <Modal
        className={`${dialogStyles.taskDialog} ${detailStyles.dialog}`}
        open
        onOpenChange={(open) => {
          if (!open && !m.isPending()) props.onClose();
        }}
        title={props.task.name}
        description="Review task details, description and activity."
        footer={
          <div className={detailStyles.footerActions}>
            <TaskDetailActions
              props={props}
              model={m}
              showSummary={false}
              onDuplicate={() => {
                if (!m.isPending()) {
                  duplicateEditor.reset();
                  m.setDuplicate(true);
                }
              }}
            />
            {meriAction}
            <ActionButton
              className={detailStyles.closeAction}
              disabled={m.busy}
              onClick={() => {
                if (!m.isPending()) props.onClose();
              }}
            >
              Close
            </ActionButton>
            {inline && (
              <ActionButton
                primary
                type="submit"
                form={editor.formId}
                disabled={m.busy}
              >
                {editor.busy ? "Saving…" : "Save task"}
              </ActionButton>
            )}
          </div>
        }
      >
        <div className={styles.drawerContent}>
          <div className={detailStyles.legacySummary}>
            <TaskSummary props={props} model={m} />
            {meriAction}
          </div>
          {inline ? (
            <TaskEditorForm
              inline
              model={editor}
              task={props.task}
              people={props.people}
              projects={props.projects}
              disabled={m.busy}
            />
          ) : (
            <TaskDetailFields
              task={props.task}
              people={props.people}
              projects={props.projects}
            />
          )}
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
            onStateChange={setAttachments}
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
        open={m.duplicate}
        model={duplicateEditor}
        onClose={() => m.setDuplicate(false)}
        onSaved={props.onSaved}
        people={props.people}
        projects={props.projects}
      />
      <TaskEditor
        open={m.edit}
        model={editor}
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
                <TaskEventText kind={item.kind} text={item.text} />
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
            <MarkdownTextarea
              id="task-comment"
              label="Comment"
              disabled={m.busy || task.access === "viewer"}
              canEdit={() => !m.isPending() && task.access !== "viewer"}
              value={m.comment}
              onChange={m.setComment}
              required
              maxLength={20000}
            />
          </Field>
          <ActionButton
            type="submit"
            disabled={m.busy || task.access === "viewer" || !m.comment.trim()}
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
  showSummary = true,
  onDuplicate,
}: {
  props: Props;
  model: Model;
  showSummary?: boolean;
  onDuplicate?: () => void;
}) {
  const task = props.task;
  return (
    <>
      {onDuplicate && (
        <ActionButton disabled={!m.writable || m.busy} onClick={onDuplicate}>
          Duplicate task
        </ActionButton>
      )}
      {showSummary && (
        <>
          <Badge>{task.status.replaceAll("_", " ")}</Badge>
          <Badge tone={task.priority === "high" ? "danger" : "neutral"}>
            {task.priority}
          </Badge>
        </>
      )}
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
