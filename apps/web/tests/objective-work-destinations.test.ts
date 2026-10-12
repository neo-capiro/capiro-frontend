import { expect, it } from "vitest";
import {
  objectiveStrategyDestination,
  objectivePlannerDestination,
  objectiveWorkspaceDestination,
  requireObjectiveWorkspace,
  strategyObjectiveOperations,
  plannerObjectiveOperations,
  workspaceObjectiveOperations,
} from "../src/shared/capiro/operations/objective-work-destinations";
import {
  readObjectiveLocation,
  requireObjectiveBinding,
} from "../src/shared/capiro/operations/objective-destination-binding";
import {
  boundStrategy,
  boundTask,
  boundWorkspace,
  binding,
  strategyId,
  taskId,
  draft,
  version,
} from "./objective-work-fixtures";
import { loadObjectiveWorkChoices } from "../src/features/portfolio/objectives/objective-work-sources";
import { createApiClient } from "../src/shared/portfolio/api/http";

const query = {
  clientId: binding.clientId,
  objectiveId: binding.objectiveId,
  objectiveVersion: binding.objectiveVersion,
};
it("registers only three fixed bounded GET routes and rejects claimed authority", () => {
  const operations = [
    ...Object.values(strategyObjectiveOperations),
    ...Object.values(plannerObjectiveOperations),
    ...Object.values(workspaceObjectiveOperations),
  ];
  expect(operations.map((x) => [x.service, x.method, x.path])).toEqual([
    ["strategy", "GET", "/strategies/:id/objective-destination"],
    ["strategy", "GET", "/planner/tasks/:id/objective-destination"],
    [
      "workspace",
      "GET",
      "/drafts/:draftId/versions/:versionId/objective-destination",
    ],
  ]);
  for (const operation of operations)
    for (const key of [
      "actorId",
      "tenantId",
      "kind",
      "url",
      "resourceId",
      "objectiveRevisionId",
    ])
      expect(
        operation.request.safeParse({
          params:
            operation.service === "workspace"
              ? { draftId: draft.id, versionId: version.id }
              : { id: strategyId },
          query: { ...query, [key]: strategyId },
        }).success,
      ).toBe(false);
});
it("rejects repeated, nested, unknown and malformed bound browser query fields before dispatch", () => {
  const valid = new URLSearchParams({
    ...query,
    objectiveVersion: String(query.objectiveVersion),
    strategyId: strategyId.toUpperCase(),
  });
  expect(readObjectiveLocation(valid, ["strategyId"])?.ids.strategyId).toBe(
    strategyId,
  );
  for (const suffix of [
    "&objectiveVersion=1",
    "&clientId=" + binding.clientId,
    "&actorId=me",
    "&clientId[x]=bad",
    "&view=edit",
  ]) {
    expect(
      readObjectiveLocation(new URLSearchParams(valid + suffix), [
        "strategyId",
      ]),
    ).toBeUndefined();
  }
  for (const value of ["0", "-1", "1e0", "01", "2147483648", "1.5"]) {
    const changed = new URLSearchParams(valid);
    changed.set("objectiveVersion", value);
    expect(readObjectiveLocation(changed, ["strategyId"])).toBeUndefined();
  }
});
it("requires the canonical Strategy resource/client and live owned nodes", () => {
  const value = objectiveStrategyDestination.parse(boundStrategy);
  expect(requireObjectiveBinding(value, strategyId.toUpperCase(), query)).toBe(
    value,
  );
  for (const changes of [{ id: taskId }, { clientId: taskId }])
    expect(
      objectiveStrategyDestination.safeParse({
        ...boundStrategy,
        strategy: { ...boundStrategy.strategy, ...changes },
      }).success,
    ).toBe(false);
  expect(
    objectiveStrategyDestination.safeParse({
      ...boundStrategy,
      destination: { ...boundStrategy.destination, kind: "planner_task" },
    }).success,
  ).toBe(false);
  expect(() =>
    requireObjectiveBinding(value, strategyId, {
      ...query,
      objectiveVersion: 2,
    }),
  ).toThrow("does not match");
  const node = {
    id: taskId,
    strategyId,
    kind: "action",
    subject: "deliverable",
    title: "Synthetic live step",
    startsOn: "2026-10-12",
    endsOn: null,
    updatedAt: "2026-10-12T12:00:00Z",
  };
  expect(
    objectiveStrategyDestination.safeParse({
      ...boundStrategy,
      strategy: { ...boundStrategy.strategy, nodes: [node] },
    }).success,
  ).toBe(true);
  for (const changes of [
    { strategyId: taskId },
    { archivedAt: "2026-10-12T12:00:00Z" },
  ])
    expect(
      objectiveStrategyDestination.safeParse({
        ...boundStrategy,
        strategy: {
          ...boundStrategy.strategy,
          nodes: [{ ...node, ...changes }],
        },
      }).success,
    ).toBe(false);
});
it("requires explicit Planner client, nonarchived task and exact current version", () => {
  const value = objectivePlannerDestination.parse(boundTask);
  expect(requireObjectiveBinding(value, taskId, query)).toBe(value);
  for (const changes of [
    { clientId: null },
    { clientId: strategyId },
    { archived: true },
    { version: 5 },
    { id: strategyId },
  ])
    expect(
      objectivePlannerDestination.safeParse({
        ...boundTask,
        task: { ...boundTask.task, ...changes },
      }).success,
    ).toBe(false);
});
it("binds Workspace saved revision, parent, nonnull client, hash format and literal content", () => {
  const value = objectiveWorkspaceDestination.parse(boundWorkspace);
  expect(requireObjectiveWorkspace(value, draft.id, version.id, query)).toBe(
    value,
  );
  for (const changes of [
    { clientId: null },
    { clientId: strategyId },
    { draftId: strategyId },
    { versionId: strategyId },
    { snapshotHash: "not-a-hash" },
    { hashFormat: "working-copy" },
    { contentSkeleton: { subject: "Unsafe", body: "{{secret}}", slots: [] } },
  ])
    expect(
      objectiveWorkspaceDestination.safeParse({ ...boundWorkspace, ...changes })
        .success,
    ).toBe(false);
  expect(() =>
    requireObjectiveWorkspace(value, taskId, version.id, query),
  ).toThrow("saved document");
  expect(
    objectiveWorkspaceDestination.safeParse({
      ...boundWorkspace,
      destination: { ...boundWorkspace.destination, destinationVersion: 3 },
    }).success,
  ).toBe(false);
});
it("does not infer a Planner client from task names, meeting or project links", async () => {
  const api = createApiClient(async () =>
    Response.json({
      items: [
        boundTask.task,
        {
          ...boundTask.task,
          id: strategyId,
          clientId: null,
          name: binding.clientId,
          meetingId: binding.clientId,
        },
      ],
      nextCursor: null,
    }),
  );
  const result = await loadObjectiveWorkChoices(
    api,
    "planner_task",
    binding.clientId,
    undefined,
    new AbortController().signal,
  );
  expect(result.items).toEqual([{ id: taskId, label: boundTask.task.name }]);
});
it("preserves empty candidate task pages and rejects a nonadvancing cursor", async () => {
  const api = createApiClient(async () =>
    Response.json({ items: [], nextCursor: taskId }),
  );
  expect(
    (
      await loadObjectiveWorkChoices(
        api,
        "planner_task",
        binding.clientId,
        undefined,
        new AbortController().signal,
      )
    ).nextCursor,
  ).toBe(taskId);
  await expect(
    loadObjectiveWorkChoices(
      api,
      "planner_task",
      binding.clientId,
      taskId,
      new AbortController().signal,
    ),
  ).rejects.toThrow("did not advance");
});
it("lists authorized draft metadata without inferring eligibility from the client label", async () => {
  const api = createApiClient(async () =>
    Response.json({
      drafts: [
        { ...draft, client: "Same-name client" },
        { ...draft, id: strategyId, prospectId: taskId },
      ],
    }),
  );
  const result = await loadObjectiveWorkChoices(
    api,
    "workspace_saved_revision",
    binding.clientId,
    undefined,
    new AbortController().signal,
  );
  expect(result.items).toEqual([{ id: draft.id, label: draft.docTitle }]);
});
