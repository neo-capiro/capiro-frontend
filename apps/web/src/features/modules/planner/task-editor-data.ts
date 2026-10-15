import type {
  PlannerProject,
  PlannerTask,
} from "../../../shared/capiro/operations/planner-schemas";
export type TaskCreateSeed = Pick<
  PlannerTask,
  "name" | "description" | "priority" | "clientId" | "memberships"
>;
/** Seed only editable create data; receipt identity and task history never enter it. */
export function duplicateTaskSeed(
  task: PlannerTask,
  projects: PlannerProject[],
): TaskCreateSeed {
  return {
    name: `Copy of ${task.name}`.slice(0, 500),
    description: task.description,
    priority: task.priority,
    clientId: task.clientId,
    memberships: task.memberships.flatMap((membership) => {
      const project = projects.find((item) => item.id === membership.projectId);
      if (
        !project ||
        project.archived ||
        !["admin", "editor"].includes(project.access)
      )
        return [];
      return [
        {
          projectId: project.id,
          sectionId: project.sections.some(
            (item) => item.id === membership.sectionId,
          )
            ? membership.sectionId
            : null,
          position: 0,
        },
      ];
    }),
  };
}
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
