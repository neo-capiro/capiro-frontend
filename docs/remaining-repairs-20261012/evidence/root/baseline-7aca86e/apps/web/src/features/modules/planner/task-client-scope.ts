import type {
  PlannerProject,
  PlannerTask,
} from "../../../shared/capiro/operations/planner-schemas";

/** Presentation scope only: service reads remain the authority for task access. */
export function taskMatchesClient(
  task: PlannerTask,
  clientId: string | undefined,
  projects: PlannerProject[],
) {
  return (
    !clientId ||
    task.clientId === clientId ||
    task.memberships.some((membership) =>
      projects.some(
        (project) =>
          project.id === membership.projectId && project.clientId === clientId,
      ),
    )
  );
}
