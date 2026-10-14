import {
  objectiveResourceId,
  readObjectiveLocation,
  requireObjectiveBinding,
  type ObjectiveDestinationQuery,
} from "@/shared/capiro/operations/objective-destination-binding";
import type { objectivePlannerDestination } from "@/shared/capiro/operations/objective-work-destinations";
import { plannerCalendarOccurrences } from "./planner-feed";
import { z } from "zod";

export const selectedPlannerVersion = z.number().int().min(1).max(2147483647);

/** Existing Calendar presentation key; it is not an owner resource UUID or new DTO. */
export function readPlannerOccurrenceKey(key: string) {
  const match = /^planner:([^:]+):(start|due)$/.exec(key);
  const id = objectiveResourceId.safeParse(match?.[1]);
  if (!match || !id.success)
    throw new Error("Select an exact existing Planner occurrence.");
  return { taskId: id.data, key: `planner:${id.data}:${match[2]}` };
}

export function readObjectiveCalendarLocation(params: URLSearchParams) {
  const fields = [
    "clientId",
    "objectiveId",
    "objectiveVersion",
    "occurrence",
    "taskVersion",
  ];
  if (
    [...params.keys()].some((key) => !fields.includes(key)) ||
    fields.some((key) => params.getAll(key).length !== 1)
  )
    return;
  try {
    const occurrence = readPlannerOccurrenceKey(params.get("occurrence")!);
    const rawVersion = params.get("taskVersion")!;
    const taskVersion = selectedPlannerVersion.parse(
      /^[1-9]\d*$/.test(rawVersion) ? Number(rawVersion) : 0,
    );
    const bounded = new URLSearchParams(params);
    bounded.delete("occurrence");
    bounded.delete("taskVersion");
    bounded.set("taskId", occurrence.taskId);
    const selected = readObjectiveLocation(bounded, ["taskId"]);
    return (
      selected && {
        query: selected.query,
        taskId: occurrence.taskId,
        occurrenceKey: occurrence.key,
        taskVersion,
      }
    );
  } catch {
    return;
  }
}

export function requireObjectiveCalendarOccurrence(
  value: z.infer<typeof objectivePlannerDestination>,
  key: string,
  query: ObjectiveDestinationQuery,
  taskVersion: number,
) {
  const selected = readPlannerOccurrenceKey(key);
  requireObjectiveBinding(value, selected.taskId, query);
  if (
    value.destination.destinationVersion !==
    selectedPlannerVersion.parse(taskVersion)
  )
    throw new Error(
      "The selected Planner task version changed. Return to the Objective, refresh and select a current occurrence.",
    );
  const current = plannerCalendarOccurrences(value.task).find(
    (item) => item.key.toLowerCase() === selected.key,
  );
  if (!current)
    throw new Error(
      "This selected Planner occurrence is no longer available. Return to the Objective to choose a current occurrence.",
    );
  return current;
}
