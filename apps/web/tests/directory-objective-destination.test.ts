import { expect, it, vi } from "vitest";
import {
  objectiveDirectoryDestination,
  directoryObjectiveOperations,
} from "../src/shared/capiro/operations/directory-objective-destination";
import {
  requireObjectiveBinding,
  readObjectiveLocation,
} from "../src/shared/capiro/operations/objective-destination-binding";
import { createApiClient } from "../src/shared/portfolio/api/http";
import {
  loadObjectiveWorkChoices,
  resolveObjectiveWork,
} from "../src/features/portfolio/objectives/objective-work-sources";
import {
  boundDirectory,
  savedTarget,
  targetId,
  directoryQuery as query,
} from "./directory-objective-fixtures";
import { handleCapiroRequest } from "../src/shared/capiro/gateway";
import { readCapiroConfig } from "../src/shared/capiro/config";
import { taskId } from "./objective-work-fixtures";
const operation =
  directoryObjectiveOperations["directory.objectiveDestination"];
it("admits only the reviewed Core target GET with matching path/query client", () => {
  expect([operation.service, operation.method, operation.path]).toEqual([
    "core",
    "GET",
    "/clients/:clientId/targets/:targetId/objective-destination",
  ]);
  const input = {
    params: { clientId: query.clientId.toUpperCase(), targetId },
    query,
  };
  expect(operation.request.parse(input).params.clientId).toBe(query.clientId);
  expect(
    operation.request.safeParse({
      ...input,
      params: { ...input.params, clientId: taskId },
    }).success,
  ).toBe(false);
  for (const key of [
    "tenantId",
    "actorId",
    "kind",
    "url",
    "memberId",
    "objectiveRevisionId",
  ])
    expect(
      operation.request.safeParse({
        ...input,
        query: { ...query, [key]: targetId },
      }).success,
    ).toBe(false);
});
for (const sourceDirectory of ["congress", "state", "staff"])
  it(`accepts exact saved ${sourceDirectory} identity without requiring a resolvable profile`, () => {
    const value = objectiveDirectoryDestination.parse({
      ...boundDirectory,
      target: {
        ...boundDirectory.target,
        sourceDirectory,
        memberId: "opaque / member",
      },
    });
    expect(requireObjectiveBinding(value, targetId.toUpperCase(), query)).toBe(
      value,
    );
  });
it("preserves stored whitespace and the owner's Unicode character budget", () => {
  for (const memberId of [" x ", "😀".repeat(128), "ocd-person/not-a-profile"])
    expect(
      objectiveDirectoryDestination.parse({
        ...boundDirectory,
        target: { ...boundDirectory.target, memberId },
      }).target.memberId,
    ).toBe(memberId);
  for (const memberId of ["", "  ", "😀".repeat(129), "x".repeat(129)])
    expect(
      objectiveDirectoryDestination.safeParse({
        ...boundDirectory,
        target: { ...boundDirectory.target, memberId },
      }).success,
    ).toBe(false);
});
it("rejects foreign/moved targets, unsupported sources and added metadata", () => {
  for (const changes of [
    { id: taskId },
    { clientId: taskId },
    { sourceDirectory: "directory" },
    { memberName: "Cached label" },
    { url: "https://example.test" },
  ])
    expect(
      objectiveDirectoryDestination.safeParse({
        ...boundDirectory,
        target: { ...boundDirectory.target, ...changes },
      }).success,
    ).toBe(false);
  expect(
    objectiveDirectoryDestination.safeParse({ ...boundDirectory, cached: true })
      .success,
  ).toBe(false);
  expect(
    objectiveDirectoryDestination.safeParse({
      ...boundDirectory,
      destination: { ...boundDirectory.destination, kind: "strategy" },
    }).success,
  ).toBe(false);
  const value = objectiveDirectoryDestination.parse(boundDirectory);
  for (const changed of [
    { clientId: taskId },
    { objectiveId: taskId },
    { objectiveVersion: 2 },
  ])
    expect(() =>
      requireObjectiveBinding(value, targetId, { ...query, ...changed }),
    ).toThrow("does not match");
  expect(() => requireObjectiveBinding(value, taskId, query)).toThrow(
    "does not match",
  );
});
it("refuses repeated, extra or incomplete bound target locations", () => {
  const params = new URLSearchParams({
    ...query,
    objectiveVersion: "1",
    targetId,
  });
  expect(readObjectiveLocation(params, ["targetId"])?.ids.targetId).toBe(
    targetId,
  );
  for (const suffix of [
    "&targetId=" + targetId,
    "&view=state-legislators",
    "&memberId=opaque",
    "&objectiveVersion=1",
    "&objectiveVersion=2",
  ])
    expect(
      readObjectiveLocation(new URLSearchParams(params + suffix), ["targetId"]),
    ).toBeUndefined();
  params.delete("objectiveId");
  expect(readObjectiveLocation(params, ["targetId"])).toBeUndefined();
});
it("lists saved row IDs without treating cached labels or global member IDs as destinations", async () => {
  const api = createApiClient(async () => Response.json([savedTarget]));
  const result = await loadObjectiveWorkChoices(
    api,
    "directory_target",
    query.clientId,
    undefined,
    new AbortController().signal,
  );
  expect(result.items).toEqual([
    { id: targetId, label: `congress: SYNTHETIC/member · ${targetId}` },
  ]);
  const foreign = createApiClient(async () =>
    Response.json([{ ...savedTarget, clientId: taskId }]),
  );
  await expect(
    loadObjectiveWorkChoices(
      foreign,
      "directory_target",
      query.clientId,
      undefined,
      new AbortController().signal,
    ),
  ).rejects.toThrow("unexpected response");
});
it("resolves the exact reviewed owner URL before returning a bounded navigation hint", async () => {
  let observed: string | undefined;
  const api = createApiClient(async (url, options) => {
    observed = String(url);
    expect(options?.cache).toBe("no-store");
    return Response.json(boundDirectory);
  });
  const href = await resolveObjectiveWork(
    api,
    "directory_target",
    targetId,
    "",
    query,
    new AbortController().signal,
  );
  expect(observed).toBe(
    `/api/backend/core/clients/${query.clientId}/targets/${targetId}/objective-destination?clientId=${query.clientId}&objectiveId=${query.objectiveId}&objectiveVersion=1`,
  );
  expect(new URL(href, "http://local.test").searchParams.get("targetId")).toBe(
    targetId,
  );
  expect(href).not.toContain("memberId");
});
for (const status of [401, 403, 404, 409, 503])
  it(`does not navigate/retry automatically after owner ${status}`, async () => {
    let count = 0;
    const api = createApiClient(async () => {
      count++;
      return Response.json({ message: "Owner refused" }, { status });
    });
    await expect(
      resolveObjectiveWork(
        api,
        "directory_target",
        targetId,
        "",
        query,
        new AbortController().signal,
      ),
    ).rejects.toThrow();
    expect(count).toBe(1);
  });
it("rejects late aborted or mismatched observations before navigation", async () => {
  const controller = new AbortController();
  const api = createApiClient(async () => {
    controller.abort();
    return Response.json(boundDirectory);
  });
  await expect(
    resolveObjectiveWork(
      api,
      "directory_target",
      targetId,
      "",
      query,
      controller.signal,
    ),
  ).rejects.toThrow();
  const stale = createApiClient(async () =>
    Response.json({
      ...boundDirectory,
      destination: { ...boundDirectory.destination, objectiveVersion: 2 },
    }),
  );
  await expect(
    resolveObjectiveWork(
      stale,
      "directory_target",
      targetId,
      "",
      query,
      new AbortController().signal,
    ),
  ).rejects.toThrow("does not match");
});

// Exercise the production fixed-operation gateway and configured Core binding.

it("gateway uses configured Core /api and normal bearer; no auth means no owner read", async () => {
  const input = { params: { clientId: query.clientId, targetId }, query };
  const request = new Request(
    `https://frontend.example.test/api/capiro/directory.objectiveDestination?input=${encodeURIComponent(JSON.stringify(input))}`,
  );
  const config = {
    ...readCapiroConfig({ CORE_API_BASE_URL: "https://core.example.test/api" }),
    authConfigured: true,
  };
  const fetcher = vi.fn(async () => Response.json(boundDirectory));
  const response = await handleCapiroRequest(
    request,
    "directory.objectiveDestination",
    directoryObjectiveOperations,
    config,
    async () => "synthetic-existing-token",
    fetcher,
  );
  expect(response.status).toBe(200);
  expect(response.headers.get("Cache-Control")).toBe("no-store");
  const [url, options] = fetcher.mock.calls[0]! as unknown as [
    URL,
    RequestInit,
  ];
  expect(url.href).toBe(
    `https://core.example.test/api/clients/${query.clientId}/targets/${targetId}/objective-destination?clientId=${query.clientId}&objectiveId=${query.objectiveId}&objectiveVersion=1`,
  );
  expect(options.headers).toEqual({
    Authorization: "Bearer synthetic-existing-token",
    Accept: "application/json",
    "Content-Type": "application/json",
  });
  fetcher.mockClear();
  expect(
    (
      await handleCapiroRequest(
        request,
        "directory.objectiveDestination",
        directoryObjectiveOperations,
        config,
        async () => null,
        fetcher,
      )
    ).status,
  ).toBe(401);
  expect(fetcher).not.toHaveBeenCalled();
});

it("captures Directory owner selectors before awaiting and retains that exact navigation input", async () => {
  const mutable = { ...query };
  const api = createApiClient(async () => {
    mutable.clientId = taskId;
    mutable.objectiveId = taskId;
    mutable.objectiveVersion = 2;
    return Response.json(boundDirectory);
  });
  const href = await resolveObjectiveWork(
    api,
    "directory_target",
    targetId,
    "",
    mutable,
    new AbortController().signal,
  );
  const selected = new URL(href, "http://local.test").searchParams;
  expect(Object.fromEntries(selected)).toEqual({
    targetId,
    ...query,
    objectiveVersion: "1",
  });
});
for (const status of [200, 503])
  it(`refuses Directory ${status} continuation when captured selection is replaced`, async () => {
    let current = true;
    const selection = { isCurrent: () => current };
    const api = createApiClient(async () => {
      current = false;
      selection.isCurrent = () => true;
      return Response.json(
        status === 200 ? boundDirectory : { message: "Unavailable" },
        { status },
      );
    });
    await expect(
      resolveObjectiveWork(
        api,
        "directory_target",
        targetId,
        "",
        query,
        new AbortController().signal,
        selection,
      ),
    ).rejects.toMatchObject({ name: "AbortError" });
  });
