import { expect, it } from "vitest";
import { plannerTask } from "../../../shared/capiro/operations/planner-schemas";
import { plannerItems, uniqueAgenda } from "./agenda";
import { inCalendarRange, calendarRange } from "./range";

const task = plannerTask.parse({
  id: "51000000-0000-4000-8000-000000000001",
  name: "Scheduled work",
  description: "",
  ownerId: "owner",
  assigneeId: null,
  version: 1,
  archived: false,
  status: "todo",
  priority: "none",
  subtype: "task",
  approval: "pending",
  startOn: "2026-10-10",
  dueOn: "2026-10-12",
  startTime: null,
  dueTime: null,
  timeZone: null,
  parentId: null,
  dependencies: [],
  collaborators: [],
  tags: [],
  memberships: [],
  customValues: {},
  estimateMinutes: 0,
  actualMinutes: 0,
  recurrence: null,
  clientId: null,
  meetingId: null,
  completedAt: null,
  createdAt: "2026-10-01T00:00:00Z",
  updatedAt: "2026-10-01T00:00:00Z",
  access: "viewer",
});
it("retains a start inside the selected week when the deadline is outside", () => {
  const range = calendarRange("2026-10-08", "week");
  const items = plannerItems([task]).filter((item) =>
    inCalendarRange(item.date, range),
  );
  expect(items).toMatchObject([
    {
      date: "2026-10-10",
      context: "Start date",
      time: "Date only",
      href: `/modules/planner?task=${task.id}`,
    },
  ]);
});
it("combines identical civil-day occurrences with both semantics", () => {
  expect(plannerItems([{ ...task, startOn: task.dueOn }])).toMatchObject([
    { date: task.dueOn, context: "Start and due date", time: "Date only" },
  ]);
});
it("retains distinct times on the same date and collapses identical timestamps", () => {
  const timed = {
    ...task,
    startOn: task.dueOn,
    startTime: "09:00",
    dueTime: "17:00",
    timeZone: "America/New_York",
  };
  expect(plannerItems([timed])).toMatchObject([
    { time: "09:00", context: "Start date · America/New_York" },
    { time: "17:00", context: "Due date · America/New_York" },
  ]);
  expect(plannerItems([{ ...timed, startTime: timed.dueTime }])).toMatchObject([
    { time: "17:00", context: "Start and due date · America/New_York" },
  ]);
});
it("does not confuse date-only and timed occurrences on the same day", () => {
  expect(
    plannerItems([
      {
        ...task,
        startOn: task.dueOn,
        dueTime: "10:00",
        timeZone: "America/New_York",
      },
    ]),
  ).toHaveLength(2);
});
it("deduplicates repeated pages without losing separate start and due rows", () => {
  const items = uniqueAgenda(plannerItems([task, task]));
  expect(items).toHaveLength(2);
  expect(new Set(items.map((item) => item.key)).size).toBe(2);
});
it("omits archived or undated work while preserving start-only work", () => {
  expect(
    plannerItems([
      { ...task, archived: true },
      { ...task, startOn: null, dueOn: null },
    ]),
  ).toEqual([]);
  expect(plannerItems([{ ...task, dueOn: null }])).toMatchObject([
    { context: "Start date", date: task.startOn },
  ]);
});
