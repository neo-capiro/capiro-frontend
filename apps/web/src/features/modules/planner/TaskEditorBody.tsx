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
import { TaskRepeatValues } from "./TaskDetailFields";
import detailStyles from "./task-detail.module.css";
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
export function useDesktopTaskLayout() {
  return useSyncExternalStore(subscribe, desktopSnapshot, serverSnapshot);
}
export function TaskEditorBody(props: Props) {
  const desktop = useDesktopTaskLayout();
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
        {props.data.recurrence &&
          (props.data.recurrence.basedOn ||
            props.data.recurrence.weekdays ||
            props.data.recurrence.endsOn !== undefined ||
            props.data.recurrence.anchorOn) && (
            <dl
              className={detailStyles.grid}
              aria-label="Saved repeat settings"
            >
              <TaskRepeatValues recurrence={props.data.recurrence} />
            </dl>
          )}
      </fieldset>
      <TaskDescriptionField {...props} />
      <TaskProjectFields {...props} showSections />
      <AdvancedTaskFields {...props} compact />
      <TaskEstimateField {...props} />
    </>
  );
}
