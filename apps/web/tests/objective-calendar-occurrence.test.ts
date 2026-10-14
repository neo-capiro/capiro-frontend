import { expect, it } from "vitest";
import { plannerCalendarOccurrences } from "../src/features/portfolio/calendar/planner-feed";
import {
  readPlannerOccurrenceKey,
  readObjectiveCalendarLocation,
  requireObjectiveCalendarOccurrence,
} from "../src/features/portfolio/calendar/objective-occurrence";
import {
  loadObjectiveWorkChoices,
  resolveObjectiveWork,
} from "../src/features/portfolio/objectives/objective-work-sources";
import {
  objectivePlannerDestination,
  objectiveWorkspaceDestination,
  requireObjectiveWorkspace,
} from "../src/shared/capiro/operations/objective-work-destinations";
import { createApiClient } from "../src/shared/portfolio/api/http";
import {
  boundTask,
  boundWorkspace,
  binding,
  taskId,
  strategyId,
  draft,
  version,
} from "./objective-work-fixtures";
const query = {
  clientId: binding.clientId,
  objectiveId: binding.objectiveId,
  objectiveVersion: 1,
};
const key = `planner:${taskId}:due`;
it("uses exact existing Planner occurrence keys and refuses malformed bound hints", () => {
  expect(
    readPlannerOccurrenceKey(`planner:${taskId.toUpperCase()}:due`),
  ).toEqual({ taskId, key });
  for (const bad of [
    taskId,
    `meeting:${taskId}:due`,
    `planner:${taskId}:end`,
    `planner:opaque:due`,
    key + ":x",
  ])
    expect(() => readPlannerOccurrenceKey(bad)).toThrow();
  const params = new URLSearchParams({
    ...query,
    objectiveVersion: "1",
    occurrence: key,
    taskVersion: "4",
  });
  expect(readObjectiveCalendarLocation(params)?.occurrenceKey).toBe(key);
  for (const suffix of [
    "&date=2026-11-01",
    "&occurrence=" + key,
    "&taskId=" + taskId,
    "&objectiveVersion=2",
  ])
    expect(
      readObjectiveCalendarLocation(new URLSearchParams(params + suffix)),
    ).toBeUndefined();
  params.delete("clientId");
  expect(readObjectiveCalendarLocation(params)).toBeUndefined();
});
it("preserves civil dates and collapses coincident start/due to due", () => {
  const task = {
    ...boundTask.task,
    startOn: "2026-11-01",
    dueOn: "2026-11-01",
  };
  const rows = plannerCalendarOccurrences(task);
  expect(rows).toHaveLength(1);
  expect(rows[0]).toMatchObject({ key, day: "2026-11-01" });
  expect(rows[0]?.startAt).toBeUndefined();
  expect(() =>
    requireObjectiveCalendarOccurrence(
      objectivePlannerDestination.parse({ ...boundTask, task }),
      `planner:${taskId}:start`,
      query,
      4,
    ),
  ).toThrow("no longer");
});
it("uses source IANA zone and preserves distinct same-day times", () => {
  const rows = plannerCalendarOccurrences({
    ...boundTask.task,
    startOn: "2026-07-01",
    dueOn: "2026-07-01",
    startTime: "09:30",
    dueTime: "10:30",
    timeZone: "America/New_York",
  });
  expect(rows.map((x) => [x.key, x.startAt, x.timeZone])).toEqual([
    [`planner:${taskId}:start`, "2026-07-01T13:30:00Z", "America/New_York"],
    [key, "2026-07-01T14:30:00Z", "America/New_York"],
  ]);
});
for (const changes of [
  { dueTime: "09:30", timeZone: null },
  { dueTime: "25:00", timeZone: "UTC" },
  { dueTime: "09:30", timeZone: "Fake/Zone" },
  { dueOn: "2026-02-30" },
  { dueOn: null, dueTime: "09:30", timeZone: "UTC" },
])
  it(`refuses malformed owner schedule ${JSON.stringify(changes)}`, () => {
    expect(() =>
      plannerCalendarOccurrences({ ...boundTask.task, ...changes }),
    ).toThrow();
  });
it("requires requested resource/client/Objective and a still-current occurrence", () => {
  const value = objectivePlannerDestination.parse(boundTask);
  expect(
    requireObjectiveCalendarOccurrence(value, key, query, 4).sourceId,
  ).toBe(taskId);
  for (const changed of [
    { clientId: strategyId },
    { objectiveId: strategyId },
    { objectiveVersion: 2 },
  ])
    expect(() =>
      requireObjectiveCalendarOccurrence(
        value,
        key,
        { ...query, ...changed },
        4,
      ),
    ).toThrow("does not match");
  expect(() =>
    requireObjectiveCalendarOccurrence(
      value,
      `planner:${strategyId}:due`,
      query,
      4,
    ),
  ).toThrow();
  expect(() =>
    requireObjectiveCalendarOccurrence(
      { ...value, task: { ...value.task, dueOn: null } },
      key,
      query,
      4,
    ),
  ).toThrow("no longer");
});
it("lists only real same-client unarchived scheduled occurrences and preserves cursor", async () => {
  const api = createApiClient(async () =>
    Response.json({
      items: [
        boundTask.task,
        { ...boundTask.task, id: strategyId, clientId: null },
        { ...boundTask.task, id: strategyId, archived: true },
        { ...boundTask.task, id: strategyId, dueOn: null },
      ],
      nextCursor: strategyId,
    }),
  );
  const result = await loadObjectiveWorkChoices(
    api,
    "planner_occurrence",
    query.clientId,
    undefined,
    new AbortController().signal,
  );
  expect(result.items.map((x) => x.id)).toEqual([key]);
  expect(result.nextCursor).toBe(strategyId);
  await expect(
    loadObjectiveWorkChoices(
      api,
      "planner_occurrence",
      query.clientId,
      strategyId,
      new AbortController().signal,
    ),
  ).rejects.toThrow("did not advance");
});
it("preflight uses the existing Planner bound GET, not a new occurrence endpoint", async () => {
  let observed = "";
  const api = createApiClient(async (url) => {
    observed = String(url);
    return Response.json(boundTask);
  });
  const href = await resolveObjectiveWork(
    api,
    "planner_occurrence",
    key,
    "",
    query,
    new AbortController().signal,
    { taskVersion: 4 },
  );
  expect(observed).toContain(`/planner/tasks/${taskId}/objective-destination?`);
  expect(new URL(href, "http://local.test").pathname).toBe("/calendar");
  expect(
    new URL(href, "http://local.test").searchParams.get("occurrence"),
  ).toBe(key);
});
for (const status of [403, 404, 409, 503])
  it(`does not fabricate navigation after owner${status}`, async () => {
    let calls = 0;
    const api = createApiClient(async () => {
      calls++;
      return Response.json({ message: "Owner unavailable" }, { status });
    });
    await expect(
      resolveObjectiveWork(
        api,
        "planner_occurrence",
        key,
        "",
        query,
        new AbortController().signal,
        { taskVersion: 4 },
      ),
    ).rejects.toThrow();
    expect(calls).toBe(1);
  });
it("Context Files reuses exact saved Workspace identity/hash and refuses foreign versions", async () => {
  const value = objectiveWorkspaceDestination.parse(boundWorkspace);
  expect(requireObjectiveWorkspace(value, draft.id, version.id, query)).toBe(
    value,
  );
  for (const changed of [
    { versionId: strategyId },
    { draftId: strategyId },
    { clientId: null },
    { snapshotHash: "guessed" },
    { hashFormat: "mutable" },
  ])
    expect(
      objectiveWorkspaceDestination.safeParse({ ...boundWorkspace, ...changed })
        .success,
    ).toBe(false);
  const api = createApiClient(async () => Response.json(boundWorkspace));
  const href = await resolveObjectiveWork(
    api,
    "workspace_saved_revision",
    draft.id,
    version.id,
    query,
    new AbortController().signal,
  );
  expect(new URL(href, "http://local.test").searchParams.get("versionId")).toBe(
    version.id,
  );
});
