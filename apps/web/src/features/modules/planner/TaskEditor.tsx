"use client";
import { useRef } from "react";
import type {
  PlannerPerson,
  PlannerProject,
} from "../../../shared/capiro/operations/planner-schemas";
import { Modal } from "../../../shared/module-ui";
import { TaskEditorForm } from "./TaskEditorForm";
import {
  useTaskEditor,
  type TaskEditorInput,
  type TaskEditorModel,
} from "./useTaskEditor";
import dialogStyles from "./task-dialog.module.css";
type Props = TaskEditorInput & {
  open: boolean;
  people: PlannerPerson[];
  projects: PlannerProject[];
  model?: TaskEditorModel;
};
export function TaskEditor(props: Props) {
  const pending = useRef<object | null>(null);
  const close = () => {
    if (pending.current || props.model?.isPending()) return;
    props.model?.reset();
    props.onClose();
  };
  return (
    <Modal
      className={`${dialogStyles.taskDialog} ${dialogStyles.editorDialog}`}
      open={props.open}
      onOpenChange={(open) => {
        if (!open) close();
      }}
      title={
        props.task ? "Edit task" : props.parentId ? "Add subtask" : "New task"
      }
      description="Task access and updates are checked by the Planner service."
    >
      {props.open &&
        (props.model ? (
          <TaskEditorForm {...props} model={props.model} onClose={close} />
        ) : (
          <OwnedTaskForm
            key={
              props.task
                ? `${props.task.id}:${props.task.version}:${props.task.access}`
                : `create:${props.parentId ?? ""}:${props.projectId ?? ""}`
            }
            {...props}
            onPendingChange={(owner, value) => {
              if (value) pending.current = owner;
              else if (pending.current === owner) pending.current = null;
            }}
          />
        ))}
    </Modal>
  );
}
function OwnedTaskForm(props: Props) {
  const model = useTaskEditor(props);
  return <TaskEditorForm {...props} model={model} />;
}
