import type {
  OperationalAction,
  OperationalResource,
} from "@/shared/capiro/operations/objective-operational";

/** Current owner destinations only. A projection never executes the owner action. */
export function operationalResourceHref(
  resource: OperationalResource,
  actions: OperationalAction[],
  clientId: string,
) {
  const admitted = actions.some(
    (action) =>
      action.kind === "open_resource" &&
      action.resource.kind === resource.selection.kind &&
      action.resource.id === resource.selection.id &&
      JSON.stringify(action.ownerVersion) ===
        JSON.stringify(resource.ownerVersion),
  );
  if (!admitted) return undefined;
  const query = new URLSearchParams({ clientId });
  const { kind, id } = resource.selection;
  if (kind === "strategy") {
    query.set("strategy", id);
    return `/modules/strategies?${query}`;
  }
  if (kind === "planner_project" || kind === "planner_task") {
    if (kind === "planner_project") query.set("view", "projects");
    query.set(kind === "planner_project" ? "project" : "task", id);
    return `/modules/planner?${query}`;
  }
  if (kind === "meeting") {
    return `/portfolio/${encodeURIComponent(clientId)}/calendar?${new URLSearchParams({ meeting: id, objectiveMeeting: "1" })}`;
  }
  if (kind === "outreach_session") {
    query.set("view", "outreach");
    query.set("session", id);
    return `/modules/engagement?${query}`;
  }
  return undefined;
}

export function operationalReviewHref(
  resource: OperationalResource<"planner_task">,
  actions: OperationalAction[],
  clientId: string,
) {
  const version = resource.ownerVersion;
  if (
    version.kind !== "counter" ||
    !actions.some(
      (action) =>
        action.kind === "review_planner_approval" &&
        action.taskId === resource.selection.id &&
        action.taskVersion === version.value,
    )
  )
    return undefined;
  return `/modules/planner?${new URLSearchParams({ clientId, task: resource.selection.id })}`;
}
