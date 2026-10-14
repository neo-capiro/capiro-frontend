"use client";
import { useId, useRef, useState } from "react";
import type { PlannerTask } from "../../../shared/capiro/operations/planner-schemas";
import { useCapiroMutation } from "../../../shared/capiro/queries";
import type { Draft } from "./task-editor-data";
export type TaskEditorInput = {
  task?: PlannerTask;
  projectId?: string | null;
  parentId?: string;
  initialTitle?: string;
  onSaved: () => void;
  onClose: () => void;
  canSubmit?: () => boolean;
  onPendingChange?: (owner: object, pending: boolean) => void;
};
function taskDraft(props: TaskEditorInput): Draft {
  const task = props.task;
  return {
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
  };
}
/** The single draft/membership/versioned-save owner for every task editor presentation. */
export function useTaskEditor(props: TaskEditorInput) {
  const task = props.task;
  const formId = useId();
  const [data, setData] = useState(() => taskDraft(props));
  const [projectIds, setProjects] = useState(
    task?.memberships.map((item) => item.projectId) ??
      (props.projectId ? [props.projectId] : []),
  );
  const [sectionIds, setSections] = useState<Record<string, string | null>>(
    Object.fromEntries(
      task?.memberships.map((item) => [item.projectId, item.sectionId]) ?? [],
    ),
  );
  const create = useCapiroMutation("planner.task.create");
  const update = useCapiroMutation("planner.task.update");
  const pending = useRef(false);
  const owner = useRef({});
  const reset = () => {
    if (pending.current) return;
    setData(taskDraft(props));
    setProjects(
      task?.memberships.map((item) => item.projectId) ??
        (props.projectId ? [props.projectId] : []),
    );
    setSections(
      Object.fromEntries(
        task?.memberships.map((item) => [item.projectId, item.sectionId]) ?? [],
      ),
    );
    create.reset();
    update.reset();
  };
  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (pending.current || (props.canSubmit && !props.canSubmit())) return;
    pending.current = true;
    props.onPendingChange?.(owner.current, true);
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
        await update.run({
          params: { id: task.id },
          body: { version: task.version, data: mutation },
        });
      else await create.run({ body: { data: mutation } });
      props.onSaved();
      props.onClose();
    } catch {
      // Canonical mutation state owns failure and retires replaced-view callbacks; never replay a write.
    } finally {
      pending.current = false;
      props.onPendingChange?.(owner.current, false);
    }
  };
  return {
    data,
    setData,
    projectIds,
    setProjects,
    sectionIds,
    setSections,
    formId,
    busy: create.pending || update.pending,
    error: create.error?.message ?? update.error?.message,
    isPending: () => pending.current,
    submit,
    reset,
  };
}
export type TaskEditorModel = ReturnType<typeof useTaskEditor>;
