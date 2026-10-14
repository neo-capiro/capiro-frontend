import { z } from "zod";
import type { ApiClient } from "@/shared/portfolio/api/http";
import { queryString } from "@/shared/portfolio/api/http";
import { strategiesPlanOperations } from "@/shared/capiro/operations/strategies-plan";
import { workspaceDraftSchema } from "../work/public";
import { targetSchema } from "../relationships/public";
import { objectiveDirectoryDestination } from "@/shared/capiro/operations/directory-objective-destination";
import {
  loadObjectiveCalendarChoices,
  resolveObjectiveCalendar,
  loadObjectivePlannerChoices,
  readObjectivePlanner,
} from "./objective-planner-sources";
import {
  objectiveStrategyDestination,
  objectiveWorkspaceDestination,
} from "@/shared/capiro/operations/objective-work-destinations";
import {
  requireObjectiveBinding,
  type ObjectiveDestinationQuery,
} from "@/shared/capiro/operations/objective-destination-binding";
import { receiveObjectiveWorkspace } from "@/shared/capiro/operations/objective-workspace-receiving";
import { captureObjectiveRead } from "@/shared/capiro/operations/objective-read-admission";

export type ObjectiveWorkKind =
  | "strategy"
  | "planner_task"
  | "directory_target"
  | "planner_occurrence"
  | "workspace_saved_revision";
export const objectiveWorkLabels: Record<ObjectiveWorkKind, string> = {
  strategy: "Strategy",
  planner_task: "Planner task",
  directory_target: "Saved Directory target",
  planner_occurrence: "Calendar Planner occurrence",
  workspace_saved_revision: "Workspace saved revision",
};
export type ObjectiveWorkChoices = {
  items: { id: string; label: string; taskVersion?: number }[];
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
  selected: {
    taskVersion?: number;
    snapshotHash?: string;
    isCurrent?: () => boolean;
  } = {},
) {
  const captured = captureObjectiveRead(query, signal, selected.isCurrent),
    taskVersion = selected.taskVersion,
    snapshotHash = selected.snapshotHash,
    isCurrent = selected.isCurrent;
  try {
    if (kind === "planner_occurrence")
      return resolveObjectiveCalendar(
        api,
        resourceId,
        captured.query,
        signal,
        taskVersion!,
        isCurrent,
      );
    const suffix = queryString(captured.query),
      id = encodeURIComponent(resourceId);
    if (kind === "directory_target") {
      const value = await api.request(
        "core",
        `clients/${encodeURIComponent(captured.query.clientId)}/targets/${id}/objective-destination?${suffix}`,
        objectiveDirectoryDestination,
        { signal },
      );
      captured.admitted();
      requireObjectiveBinding(value, resourceId, captured.query);
      return `/modules/directory?${queryString({ targetId: value.destination.resourceId, ...captured.query })}`;
    }
    if (kind === "strategy") {
      const value = await api.request(
        "strategy",
        `strategies/${id}/objective-destination?${suffix}`,
        objectiveStrategyDestination,
        { signal },
      );
      signal.throwIfAborted();
      captured.admitted();
      requireObjectiveBinding(value, resourceId, captured.query);
      return `/modules/strategies?${queryString({ strategyId: value.destination.resourceId, ...captured.query })}`;
    }
    if (kind === "planner_task") {
      const value = await readObjectivePlanner(
        api,
        resourceId,
        captured.query,
        signal,
      );
      captured.admitted();
      return `/modules/planner?${queryString({ taskId: value.destination.resourceId, ...captured.query })}`;
    }
    const value = await api.request(
      "workspace",
      `drafts/${id}/versions/${encodeURIComponent(versionId)}/objective-destination?${suffix}`,
      objectiveWorkspaceDestination,
      { signal },
    );
    captured.admitted();
    const current = await receiveObjectiveWorkspace(
      value,
      resourceId,
      versionId,
      captured.query,
      signal,
      snapshotHash,
      isCurrent,
    );
    captured.admitted();
    return `/modules/workspace?${queryString({ draftId: current.destination.draftId, versionId: current.destination.resourceId, snapshotHash: current.snapshotHash, ...captured.query })}`;
  } catch (error) {
    captured.admitted();
    throw error;
  }
}
