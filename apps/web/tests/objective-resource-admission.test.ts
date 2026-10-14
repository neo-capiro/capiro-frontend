import { afterEach, expect, it, vi } from "vitest";
import { resolveObjectiveWork } from "../src/features/portfolio/objectives/objective-work-sources";
import { loadObjectiveCalendarChoices } from "../src/features/portfolio/objectives/objective-planner-sources";
import { receiveObjectiveWorkspace } from "../src/shared/capiro/operations/objective-workspace-receiving";
import { readObjectiveCalendarLocation } from "../src/features/portfolio/calendar/objective-occurrence";
import { objectiveWorkspaceDestination } from "../src/shared/capiro/operations/objective-work-destinations";
import {
  createApiClient,
  type ApiClient,
} from "../src/shared/portfolio/api/http";
import {
  boundTask,
  boundWorkspace,
  binding,
  taskId,
  draft,
  version,
  strategyId,
} from "./objective-work-fixtures";
const query = {
  clientId: binding.clientId,
  objectiveId: binding.objectiveId,
  objectiveVersion: 1,
};
const occurrence = `planner:${taskId}:due`;
const signal = () => new AbortController().signal;
afterEach(() => vi.restoreAllMocks());

it("retains selected current task version in the local hint, never the owner query", async () => {
  let observed = "";
  const api = createApiClient(async (url) => {
    observed = String(url);
    return Response.json(boundTask);
  });
  const href = await resolveObjectiveWork(
    api,
    "planner_occurrence",
    occurrence,
    "",
    query,
    signal(),
    { taskVersion: 4 },
  );
  expect(new URL(href, "http://local").searchParams.get("taskVersion")).toBe(
    "4",
  );
  expect(observed).not.toContain("taskVersion");
  const parsed = readObjectiveCalendarLocation(
    new URL(href, "http://local").searchParams,
  );
  expect(parsed?.taskVersion).toBe(4);
  expect(parsed?.query).toEqual(query);
  const choices = await loadObjectiveCalendarChoices(
    createApiClient(async () =>
      Response.json({ items: [boundTask.task], nextCursor: null }),
    ),
    query.clientId,
    undefined,
    signal(),
  );
  expect(choices.items[0]?.taskVersion).toBe(4);
});
it("changed task version refuses the still-existing occurrence until deliberate reselection", async () => {
  const newer = {
    ...boundTask,
    destination: { ...boundTask.destination, destinationVersion: 5 },
    task: { ...boundTask.task, version: 5 },
  };
  const api = createApiClient(async () => Response.json(newer));
  await expect(
    resolveObjectiveWork(
      api,
      "planner_occurrence",
      occurrence,
      "",
      query,
      signal(),
      { taskVersion: 4 },
    ),
  ).rejects.toThrow("version changed");
  await expect(
    resolveObjectiveWork(
      api,
      "planner_occurrence",
      occurrence,
      "",
      query,
      signal(),
      { taskVersion: 5 },
    ),
  ).resolves.toContain("taskVersion=5");
});
it("pins query/version/callback scalars before an owner await", async () => {
  const mutableQuery = { ...query };
  const selection = { taskVersion: 4, isCurrent: () => true };
  const api = createApiClient(async () => {
    mutableQuery.objectiveVersion = 2;
    mutableQuery.clientId = strategyId;
    selection.taskVersion = 5;
    selection.isCurrent = () => false;
    return Response.json(boundTask);
  });
  const href = await resolveObjectiveWork(
    api,
    "planner_occurrence",
    occurrence,
    "",
    mutableQuery,
    signal(),
    selection,
  );
  expect(
    new URL(href, "http://local").searchParams.get("objectiveVersion"),
  ).toBe("1");
  expect(new URL(href, "http://local").searchParams.get("clientId")).toBe(
    query.clientId,
  );
  expect(href).toContain("taskVersion=4");
});
for (const rejected of [false, true])
  it(`discards late ${rejected ? "error" : "value"} after current selection admission changes`, async () => {
    let current = true;
    const api: ApiClient = {
      request: async () => {
        current = false;
        if (rejected) throw new Error("old owner denial");
        return boundTask as never;
      },
    };
    await expect(
      resolveObjectiveWork(
        api,
        "planner_occurrence",
        occurrence,
        "",
        query,
        signal(),
        { taskVersion: 4, isCurrent: () => current },
      ),
    ).rejects.toMatchObject({ name: "AbortError" });
  });
it("Workspace integrity uses the exact full snapshot hash and retains it only as a local hint", async () => {
  let observed = "";
  const api = createApiClient(async (url) => {
    observed = String(url);
    return Response.json(boundWorkspace);
  });
  const href = await resolveObjectiveWork(
    api,
    "workspace_saved_revision",
    draft.id,
    version.id,
    query,
    signal(),
  );
  expect(new URL(href, "http://local").searchParams.get("snapshotHash")).toBe(
    boundWorkspace.snapshotHash,
  );
  expect(observed).not.toContain("snapshotHash");
  const valid = objectiveWorkspaceDestination.parse(boundWorkspace);
  await expect(
    receiveObjectiveWorkspace(
      valid,
      draft.id,
      version.id,
      query,
      signal(),
      "b".repeat(64),
    ),
  ).rejects.toThrow("revision changed");
  await expect(
    receiveObjectiveWorkspace(
      {
        ...valid,
        snapshot: { ...(valid.snapshot as object), added: "hidden data" },
      },
      draft.id,
      version.id,
      query,
      signal(),
    ),
  ).rejects.toThrow("revision changed");
});
it("checks current admission in the outer continuation after an inner owner promise resolves", async () => {
  let current = true;
  const api: ApiClient = {
    request: () =>
      new Promise((resolve) => {
        resolve(boundTask as never);
        queueMicrotask(() => {
          current = false;
        });
      }),
  };
  await expect(
    resolveObjectiveWork(
      api,
      "planner_occurrence",
      occurrence,
      "",
      query,
      signal(),
      { taskVersion: 4, isCurrent: () => current },
    ),
  ).rejects.toMatchObject({ name: "AbortError" });
});
it("Workspace captures selected hash/query/snapshot before asynchronous hashing", async () => {
  const digest = crypto.subtle.digest.bind(crypto.subtle);
  const value = objectiveWorkspaceDestination.parse(
      structuredClone(boundWorkspace),
    ),
    mutableQuery = { ...query };
  const snapshot = value.snapshot as { docTitle: string };
  vi.spyOn(crypto.subtle, "digest").mockImplementation(async (...args) => {
    snapshot.docTitle = "Changed after selection";
    mutableQuery.objectiveVersion = 2;
    return digest(...args);
  });
  const result = await receiveObjectiveWorkspace(
    value,
    draft.id,
    version.id,
    mutableQuery,
    signal(),
    boundWorkspace.snapshotHash,
  );
  expect(result.snapshot).toEqual(boundWorkspace.snapshot);
  expect(result.destination.objectiveVersion).toBe(1);
});
for (const rejected of [false, true])
  it(`late hash ${rejected ? "error" : "success"} cannot install a superseded snapshot`, async () => {
    let current = true;
    const digest = crypto.subtle.digest.bind(crypto.subtle);
    vi.spyOn(crypto.subtle, "digest").mockImplementation(async (...args) => {
      current = false;
      if (rejected) throw new Error("late hash error");
      return digest(...args);
    });
    await expect(
      receiveObjectiveWorkspace(
        objectiveWorkspaceDestination.parse(boundWorkspace),
        draft.id,
        version.id,
        query,
        signal(),
        boundWorkspace.snapshotHash,
        () => current,
      ),
    ).rejects.toMatchObject({ name: "AbortError" });
  });
it("local version hints reject omitted, noncanonical, repeated and out-of-range selectors", () => {
  const params = new URLSearchParams({
    ...query,
    objectiveVersion: "1",
    occurrence,
    taskVersion: "4",
  });
  for (const raw of ["", "0", "04", "-1", "2147483648"]) {
    const changed = new URLSearchParams(params);
    changed.set("taskVersion", raw);
    expect(readObjectiveCalendarLocation(changed)).toBeUndefined();
  }
  params.append("taskVersion", "4");
  expect(readObjectiveCalendarLocation(params)).toBeUndefined();
});
