import type { PlannerTask } from "../../../shared/capiro/operations/planner-schemas";
export type Draft = Pick<
  PlannerTask,
  | "name"
  | "description"
  | "assigneeId"
  | "dueOn"
  | "startOn"
  | "status"
  | "priority"
  | "estimateMinutes"
  | "startTime"
  | "dueTime"
  | "timeZone"
  | "subtype"
  | "approval"
  | "tags"
  | "collaborators"
  | "dependencies"
  | "recurrence"
>;
export type TaskFormModel = {
  data: Draft;
  setData: (data: Draft) => void;
  disabled?: boolean;
};
