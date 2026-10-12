import type {
  PlannerPerson,
  PlannerTask,
} from "../../../shared/capiro/operations/planner-schemas";
export const statuses = [
  { id: "todo", label: "To do" },
  { id: "in_progress", label: "In progress" },
  { id: "blocked", label: "Blocked" },
  { id: "done", label: "Done" },
] as const;
export const taskViews = [
  "list",
  "board",
  "calendar",
  "timeline",
  "gantt",
] as const;
export type TaskView = (typeof taskViews)[number];
export function minutesLabel(minutes: number) {
  return `${Math.floor(minutes / 60)}:${String(minutes % 60).padStart(2, "0")}`;
}
export function assigneeName(task: PlannerTask, people: PlannerPerson[]) {
  return (
    people.find((person) => person.id === task.assigneeId)?.name ??
    (task.assigneeId ? "Team member" : "Unassigned")
  );
}
export function dayLabel(date: string | null) {
  return date
    ? new Intl.DateTimeFormat("en-US", {
        month: "short",
        day: "numeric",
        timeZone: "UTC",
      }).format(new Date(`${date}T12:00:00Z`))
    : "No due date";
}
export function shiftDate(date: string, days: number) {
  const parsed = new Date(`${date}T12:00:00Z`);
  parsed.setUTCDate(parsed.getUTCDate() + days);
  return parsed.toISOString().slice(0, 10);
}
export function weekStart(date: string) {
  const day = new Date(`${date}T12:00:00Z`).getUTCDay();
  return shiftDate(date, -((day + 6) % 7));
}
export function filterTasks(
  tasks: PlannerTask[],
  status: string,
  priority: string,
  assignee: string,
) {
  return tasks.filter(
    (task) =>
      (status === "all" ||
        (status === "open"
          ? task.status !== "done"
          : task.status === status)) &&
      (priority === "all" || task.priority === priority) &&
      (assignee === "all" ||
        (assignee === "unassigned"
          ? task.assigneeId === null
          : task.assigneeId === assignee)),
  );
}
