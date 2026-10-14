import { z } from "zod";
import type { ApiClient } from "@/shared/portfolio/api/http";
import { queryString } from "@/shared/portfolio/api/http";
import { strategiesPlanOperations } from "@/shared/capiro/operations/strategies-plan";
import { workspaceDraftSchema } from "../work/public";
import {
  loadObjectiveCalendarChoices,
  resolveObjectiveCalendar,
  loadObjectivePlannerChoices,
  readObjectivePlanner,
} from "./objective-planner-sources";
import {
  objectiveStrategyDestination,
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
  | "planner_occurrence"
  | "workspace_saved_revision";
export const objectiveWorkLabels: Record<ObjectiveWorkKind, string> = {
  strategy: "Strategy",
  planner_task: "Planner task",
  planner_occurrence: "Calendar Planner occurrence",
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
  if (kind === "planner_occurrence")
    return loadObjectiveCalendarChoices(api, clientId, cursor, signal);
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
  if (kind === "planner_task")
    return loadObjectivePlannerChoices(api, clientId, cursor, signal);
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
  if (kind === "planner_occurrence")
    return resolveObjectiveCalendar(api, resourceId, query, signal);
  const suffix = queryString(query),
    id = encodeURIComponent(resourceId);
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
    const value = await readObjectivePlanner(api, resourceId, query, signal);
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
