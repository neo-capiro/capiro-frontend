import type {
  PlannerProject,
  PlannerTask,
} from "../../../shared/capiro/operations/planner-schemas";

export type TaskClientGroup = {
  key: string;
  label: string;
  clientId?: string;
  tasks: PlannerTask[];
};

/** Groups a permitted page for display; never establishes client/task access. */
export function groupTasksByClient(
  tasks: PlannerTask[],
  projects: PlannerProject[],
  clients: readonly { id: string; name: string }[],
): TaskClientGroup[] {
  const groups = new Map<string, TaskClientGroup>();
  for (const task of tasks) {
    const linked = task.clientId
      ? [task.clientId]
      : [
          ...new Set(
            task.memberships.flatMap((membership) => {
              const project = projects.find(
                (item) => item.id === membership.projectId,
              );
              return project?.clientId ? [project.clientId] : [];
            }),
          ),
        ];
    const unresolved =
      !task.clientId &&
      task.memberships.some(
        (membership) =>
          !projects.some((project) => project.id === membership.projectId),
      );
    const clientId = !unresolved && linked.length === 1 ? linked[0] : undefined;
    const client = clients.find((item) => item.id === clientId);
    const key =
      clientId ??
      (unresolved ? "unresolved" : linked.length > 1 ? "multiple" : "firm");
    if (!groups.has(key))
      groups.set(key, {
        key,
        label:
          client?.name ??
          (clientId
            ? "Client unavailable"
            : unresolved
              ? "Client association unavailable"
              : linked.length > 1
                ? "Multiple clients"
                : "No client · firm work"),
        clientId: client?.id,
        tasks: [],
      });
    groups.get(key)!.tasks.push(task);
  }
  return [...groups.values()];
}
