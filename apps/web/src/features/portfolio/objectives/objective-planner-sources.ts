import type { ApiClient } from "@/shared/portfolio/api/http";
import { queryString } from "@/shared/portfolio/api/http";
import { plannerTaskOperations } from "@/shared/capiro/operations/planner-tasks";
import { objectivePlannerDestination } from "@/shared/capiro/operations/objective-work-destinations";
import {
  requireObjectiveBinding,
  type ObjectiveDestinationQuery,
} from "@/shared/capiro/operations/objective-destination-binding";
import {
  plannerCalendarOccurrences,
  readPlannerOccurrenceKey,
  requireObjectiveCalendarOccurrence,
  selectedPlannerVersion,
} from "../calendar/public";
import { captureObjectiveRead } from "@/shared/capiro/operations/objective-read-admission";

async function loadPlannerPage(
  api: ApiClient,
  clientId: string,
  cursor: string | undefined,
  signal: AbortSignal,
) {
  const page = await api.request(
    "strategy",
    `planner/tasks?${queryString({ archived: "false", cursor })}`,
    plannerTaskOperations["planner.tasks"].response,
    { signal },
  );
  if (page.nextCursor && page.nextCursor === cursor)
    throw new Error("The task page did not advance. Refresh the list.");
  return {
    ...page,
    items: page.items.filter(
      (task) =>
        !task.archived &&
        task.clientId?.toLowerCase() === clientId.toLowerCase(),
    ),
    nextCursor: page.nextCursor,
  };
}

export async function loadObjectivePlannerChoices(
  api: ApiClient,
  clientId: string,
  cursor: string | undefined,
  signal: AbortSignal,
) {
  const page = await loadPlannerPage(api, clientId, cursor, signal);
  return {
    items: page.items.map((task) => ({ id: task.id, label: task.name })),
    nextCursor: page.nextCursor,
  };
}
export async function loadObjectiveCalendarChoices(
  api: ApiClient,
  clientId: string,
  cursor: string | undefined,
  signal: AbortSignal,
) {
  const page = await loadPlannerPage(api, clientId, cursor, signal);
  return {
    items: page.items.flatMap((task) =>
      plannerCalendarOccurrences(task).map((item) => ({
        id: item.key,
        taskVersion: task.version,
        label: `${item.title} · ${item.key.endsWith(":start") ? "start" : "due"} · ${item.day}${item.startAt ? ` · ${item.timeZone}` : " · civil date"}`,
      })),
    ),
    nextCursor: page.nextCursor,
  };
}
export async function readObjectivePlanner(
  api: ApiClient,
  taskId: string,
  query: ObjectiveDestinationQuery,
  signal: AbortSignal,
) {
  const captured = captureObjectiveRead(query, signal);
  const value = await api.request(
    "strategy",
    `planner/tasks/${encodeURIComponent(taskId)}/objective-destination?${queryString(captured.query)}`,
    objectivePlannerDestination,
    { signal },
  );
  captured.admitted();
  return requireObjectiveBinding(value, taskId, captured.query);
}
export async function resolveObjectiveCalendar(
  api: ApiClient,
  key: string,
  query: ObjectiveDestinationQuery,
  signal: AbortSignal,
  taskVersion: number,
  isCurrent?: () => boolean,
) {
  const selected = readPlannerOccurrenceKey(key);
  const expectedVersion = selectedPlannerVersion.parse(taskVersion),
    captured = captureObjectiveRead(query, signal, isCurrent);
  try {
    const value = await readObjectivePlanner(
      api,
      selected.taskId,
      captured.query,
      signal,
    );
    captured.admitted();
    const current = requireObjectiveCalendarOccurrence(
      value,
      selected.key,
      captured.query,
      expectedVersion,
    );
    return `/calendar?${queryString({ occurrence: current.key, taskVersion: expectedVersion, ...captured.query })}`;
  } catch (error) {
    captured.admitted();
    throw error;
  }
}
