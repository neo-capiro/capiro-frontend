import { z } from "zod";
import { taskSchema, type CalendarItem } from "./contracts";
import { dateTimeInstant } from "./range";

/** Keep separately scheduled starts and deadlines attached to their real task. */
export function plannerCalendarItems(
  task: z.infer<typeof taskSchema>,
  startDay: string,
  endDay: string,
): CalendarItem[] {
  if (task.archived) return [];
  const dates = [
    { kind: "start", day: task.startOn, time: task.startTime },
    { kind: "due", day: task.dueOn, time: task.dueTime },
  ] as const;
  const sameOccurrence =
    task.startOn === task.dueOn &&
    (task.startTime ?? null) === (task.dueTime ?? null);
  return dates.flatMap(({ kind, day, time }) => {
    if (!day || day < startDay || day >= endDay) return [];
    if (kind === "start" && sameOccurrence) return [];
    // Date-only values retain their civil date. This fallback is never used to
    // manufacture a timed event; the source schema requires an explicit zone.
    const timeZone = task.timeZone ?? "UTC";
    return [
      {
        key: `planner:${task.id}:${kind}`,
        kind: "planner" as const,
        sourceId: task.id,
        title: task.name,
        day,
        ...(time && task.timeZone
          ? { startAt: dateTimeInstant(day, time, task.timeZone) }
          : {}),
        timeZone,
        clientId: task.clientId ?? undefined,
        status: task.status,
        provenance: `Planner tasks you can access; ${
          sameOccurrence
            ? "scheduled start and due date"
            : kind === "start"
              ? "scheduled start"
              : "due date"
        }`,
      },
    ];
  });
}
