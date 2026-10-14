import { z } from "zod";
import type { ApiClient } from "@/shared/portfolio/api/http";
import { queryString } from "@/shared/portfolio/api/http";
import { strategiesPlanOperations } from "@/shared/capiro/operations/strategies-plan";
import { plannerTaskOperations } from "@/shared/capiro/operations/planner-tasks";
import { workspaceDraftSchema } from "../work/public";
import { targetSchema } from "../relationships/public";
import { objectiveDirectoryDestination } from "@/shared/capiro/operations/directory-objective-destination";
import {
  objectiveStrategyDestination,
  objectivePlannerDestination,
  objectiveWorkspaceDestination,
  requireObjectiveWorkspace,
} from "@/shared/capiro/operations/objective-work-destinations";
import {
  requireObjectiveBinding,
  type ObjectiveDestinationQuery,
} from "@/shared/capiro/operations/objective-destination-binding";

export type ObjectiveWorkKind =
  | "strategy"
  | "planner_task"
  | "directory_target"
  | "workspace_saved_revision";
export const objectiveWorkLabels: Record<ObjectiveWorkKind, string> = {
  strategy: "Strategy",
  planner_task: "Planner task",
  directory_target: "Saved Directory target",
  workspace_saved_revision: "Workspace saved revision",
};
export type ObjectiveWorkChoices = {
  items: { id: string; label: string }[];
  nextCursor: string | null;
};
export async function loadObjectiveWorkChoices(
  api: ApiClient,
  kind: ObjectiveWorkKind,
  clientId: string,
  cursor: string | undefined,
  signal: AbortSignal,
): Promise<ObjectiveWorkChoices> {
  if (kind === "directory_target") {
    const rows = await api.request(
      "core",
      `clients/${encodeURIComponent(clientId)}/targets`,
      z
        .array(targetSchema)
        .refine(
          (targets) =>
            targets.every(
              (row) => row.clientId.toLowerCase() === clientId.toLowerCase(),
            ),
          "Target client mismatch",
        ),
      { signal },
    );
    return {
      items: rows.map((row) => ({
        id: row.id,
        label: `${row.sourceDirectory}: ${row.memberId} · ${row.id}`,
      })),
      nextCursor: null,
    };
  }
  if (kind === "strategy") {
    const rows = await api.request(
      "strategy",
      "strategies",
      strategiesPlanOperations["strategies.list"].response,
      { signal },
    );
    return {
      items: rows
        .filter((row) => row.clientId.toLowerCase() === clientId.toLowerCase())
        .map((row) => ({ id: row.id, label: row.title })),
      nextCursor: null,
    };
  }
  if (kind === "planner_task") {
    const page = await api.request(
      "strategy",
      `planner/tasks?${queryString({ archived: "false", cursor })}`,
      plannerTaskOperations["planner.tasks"].response,
      { signal },
    );
    if (page.nextCursor && page.nextCursor === cursor)
      throw new Error("The task page did not advance. Refresh the list.");
    return {
      items: page.items
        .filter(
          (row) =>
            !row.archived &&
            row.clientId?.toLowerCase() === clientId.toLowerCase(),
        )
        .map((row) => ({ id: row.id, label: row.name })),
      nextCursor: page.nextCursor,
    };
  }
  const list = await api.request(
    "workspace",
    "drafts?scope=all",
    z.object({ drafts: z.array(workspaceDraftSchema) }),
    { signal },
  );
  return {
    items: list.drafts
      .filter((row) => !row.prospectId)
      .map((row) => ({ id: row.id, label: row.docTitle })),
    nextCursor: null,
  };
}
export async function resolveObjectiveWork(
  api: ApiClient,
  kind: ObjectiveWorkKind,
  resourceId: string,
  versionId: string,
  query: ObjectiveDestinationQuery,
  signal: AbortSignal,
) {
  const suffix = queryString(query),
    id = encodeURIComponent(resourceId);
  if (kind === "directory_target") {
    const value = await api.request(
      "core",
      `clients/${encodeURIComponent(query.clientId)}/targets/${id}/objective-destination?${suffix}`,
      objectiveDirectoryDestination,
      { signal },
    );
    signal.throwIfAborted();
    requireObjectiveBinding(value, resourceId, query);
    return `/modules/directory?${queryString({ targetId: value.destination.resourceId, ...query })}`;
  }
  if (kind === "strategy") {
    const value = await api.request(
      "strategy",
      `strategies/${id}/objective-destination?${suffix}`,
      objectiveStrategyDestination,
      { signal },
    );
    signal.throwIfAborted();
    requireObjectiveBinding(value, resourceId, query);
    return `/modules/strategies?${queryString({ strategyId: value.destination.resourceId, ...query })}`;
  }
  if (kind === "planner_task") {
    const value = await api.request(
      "strategy",
      `planner/tasks/${id}/objective-destination?${suffix}`,
      objectivePlannerDestination,
      { signal },
    );
    signal.throwIfAborted();
    requireObjectiveBinding(value, resourceId, query);
    return `/modules/planner?${queryString({ taskId: value.destination.resourceId, ...query })}`;
  }
  const value = await api.request(
    "workspace",
    `drafts/${id}/versions/${encodeURIComponent(versionId)}/objective-destination?${suffix}`,
    objectiveWorkspaceDestination,
    { signal },
  );
  signal.throwIfAborted();
  requireObjectiveWorkspace(value, resourceId, versionId, query);
  return `/modules/workspace?${queryString({ draftId: value.destination.draftId, versionId: value.destination.resourceId, ...query })}`;
}
