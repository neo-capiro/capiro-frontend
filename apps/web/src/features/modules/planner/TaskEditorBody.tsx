"use client";
import { useSyncExternalStore } from "react";
import type { PlannerPerson } from "../../../shared/capiro/operations/planner-schemas";
import type { TaskFormModel } from "./task-editor-data";
import { AdvancedTaskFields } from "./AdvancedTaskFields";
import {
  TaskNameField,
  TaskDescriptionField,
  TaskAssigneeField,
  TaskPriorityField,
  TaskStatusField,
  TaskEstimateField,
} from "./TaskEditorFields";
import { TaskTypeFields, TaskRepeatFields } from "./TaskDefinitionFields";
import { TaskProjectFields, type TaskProjectModel } from "./TaskProjectFields";
import { TaskScheduleFields } from "./TaskScheduleFields";
import styles from "./planner.module.css";
import dialogStyles from "./task-dialog.module.css";
const desktopQuery = "(min-width: 1024px)";
function subscribe(listener: () => void) {
  const query = window.matchMedia(desktopQuery);
  query.addEventListener("change", listener);
  return () => query.removeEventListener("change", listener);
}
function desktopSnapshot() {
  return window.matchMedia(desktopQuery).matches;
}
function serverSnapshot() {
  return false;
}
type Props = TaskFormModel &
  TaskProjectModel & { people: PlannerPerson[]; taskId?: string };
export function TaskEditorBody(props: Props) {
  const desktop = useSyncExternalStore(
    subscribe,
    desktopSnapshot,
    serverSnapshot,
  );
  if (!desktop)
    return (
      <>
        <TaskNameField {...props} />
        <TaskDescriptionField {...props} />
        <TaskAssigneeField {...props} />
        <TaskProjectFields {...props} />
        <div className={styles.form}>
          <TaskScheduleFields {...props} />
          <TaskPriorityField {...props} />
          <TaskStatusField {...props} />
          <TaskEstimateField {...props} />
        </div>
        <AdvancedTaskFields {...props} />
      </>
    );
  return (
    <>
      <TaskNameField {...props} />
      <div className={dialogStyles.primaryFields}>
        <TaskAssigneeField {...props} />
        <TaskStatusField {...props} />
        <TaskPriorityField {...props} />
        <TaskTypeFields {...props} />
      </div>
      <fieldset className={dialogStyles.scheduleFields}>
        <legend>Schedule</legend>
        <div className={styles.form}>
          <TaskScheduleFields {...props} />
          <TaskRepeatFields {...props} />
        </div>
      </fieldset>
      <TaskDescriptionField {...props} />
      <TaskProjectFields {...props} showSections />
      <AdvancedTaskFields {...props} compact />
      <TaskEstimateField {...props} />
    </>
  );
}
