import "./command-recovery-platform";
import { expect, it, vi } from "vitest";
import { installPlatform } from "./command-recovery-platform";
import { researchRecovery } from "../src/features/portfolio/client-profile/enrichment/research-recovery";
import { researchOperations } from "../src/features/portfolio/client-profile/enrichment/research-operations";
import {
  sendRetry,
  prepareRetry,
} from "../src/features/portfolio/client-profile/enrichment/retry-api";
import {
  retryResponse,
  type RetryCommand,
} from "../src/features/portfolio/client-profile/enrichment/retry-contracts";
import { createApiClient } from "../src/shared/portfolio/api/http";
import { runSchema } from "../src/features/portfolio/client-profile/enrichment/contracts";
installPlatform();
const clientId = "10000000-0000-4000-8000-000000000001",
  runId = "10000000-0000-4000-8000-000000000002";
const taskId = "10000000-0000-4000-8000-000000000003",
  requestId = "10000000-0000-4000-8000-000000000004";
const actor = { tenantId: "tenant", userId: "actor" },
  guard = () => {};
const command: RetryCommand = {
  requestId,
  runId,
  taskId,
  expectedAttempt: 3,
  expectedTaskType: "public_web",
};
const journal = () => researchRecovery(clientId, actor, guard);
const receipt = { ...command, status: "queued" as const, reason: null };
const run = () =>
  runSchema.parse({
    id: runId,
    clientId,
    status: "partial",
    workflowVersion: 2,
    requestedSources: ["public_web"],
    sourceStates: {},
    summary: {},
    error: null,
    startedAt: "2026-10-29T10:00:00Z",
    completedAt: null,
    findings: [],
    tasks: [
      {
        id: taskId,
        runId,
        taskType: "public_web",
        taskKey: "public_web",
        status: "failed",
        attempt: 3,
        maxAttempts: 3,
        errorCode: null,
        errorMessage: null,
        outputSummary: {},
        nextAttemptAt: null,
      },
    ],
  });

it("an interrupted task retry retains its original attempt and replays exactly", async () => {
  await journal().reserve(command);
  const fetcher = vi
    .fn<typeof fetch>()
    .mockRejectedValueOnce(Error("Disconnected"))
    .mockResolvedValueOnce(Response.json({ ...receipt, replayed: true }));
  const api = createApiClient(fetcher),
    signal = new AbortController().signal;
  await expect(
    sendRetry(api, clientId, command, guard, signal, journal().receivedRetry),
  ).rejects.toThrow("Disconnected");
  const saved = (await journal().load())!;
  expect(saved.command).toEqual(command);
  await sendRetry(
    api,
    clientId,
    command,
    guard,
    signal,
    journal().receivedRetry,
  );
  expect(fetcher.mock.calls[0]?.[1]?.body).toBe(
    fetcher.mock.calls[1]?.[1]?.body,
  );
  expect((await journal().load())?.retry).toEqual(receipt);
  await journal().acknowledge(requestId);
  expect(await journal().load()).toBeNull();
});
it("a recorded refusal settles only its exact request and cannot become queued", async () => {
  await journal().reserve(command);
  const refused = {
    ...receipt,
    status: "refused" as const,
    reason: "Task changed",
  };
  await journal().receivedRetry(command, refused);
  await expect(journal().receivedRetry(command, receipt)).rejects.toThrow();
  expect((await journal().load())?.retry).toEqual(refused);
  await journal().acknowledge(requestId);
});
it("pending starts and retries share one actor/client recovery lock", async () => {
  await journal().reserve({
    requestId,
    input: {
      sources: ["public_web"],
      website: "",
      attachmentIds: [],
      ldaClientIds: [],
    },
  });
  await expect(
    journal().reserve({ ...command, requestId: taskId }),
  ).rejects.toThrow("Recover");
});
it.each([
  { taskId: clientId },
  { expectedAttempt: 4 },
  { expectedTaskType: "district_nexus" },
  { requestId: runId },
])(
  "mismatched retry results cannot acknowledge another selection: %j",
  (changed) => {
    expect(
      retryResponse(command).safeParse({
        ...receipt,
        ...changed,
        replayed: false,
      }).success,
    ).toBe(false);
  },
);
it("once the receipt is saved, recovery reads current progress without another retry POST", async () => {
  await journal().reserve(command);
  await journal().receivedRetry(command, receipt);
  const current = run();
  current.tasks![0]!.attempt = 4;
  const fetcher = vi.fn<typeof fetch>(async (url) =>
    Response.json(
      String(url).endsWith("/review")
        ? { clientId, runId, clientRevision: "a".repeat(64), findings: [] }
        : current,
    ),
  );
  const result = await researchOperations({
    api: createApiClient(fetcher),
    clientId,
    actor,
    guard,
    signal: () => new AbortController().signal,
    install: () => {},
  }).recover();
  expect(result?.retry).toEqual(receipt);
  expect(result?.run.tasks?.[0]).toMatchObject({
    attempt: 4,
    status: "failed",
  });
  expect(fetcher.mock.calls.every((call) => call[1]?.method === "GET")).toBe(
    true,
  );
  expect(await journal().load()).toBeNull();
});
it("changed task preflight refuses before reserving or dispatching a retry", async () => {
  const shown = run(),
    current = run();
  current.tasks![0]!.attempt = 4;
  const fetcher = vi.fn<typeof fetch>(async (url) =>
    Response.json(
      String(url).endsWith("/review")
        ? { clientId, runId, clientRevision: "a".repeat(64), findings: [] }
        : current,
    ),
  );
  await expect(
    prepareRetry(
      createApiClient(fetcher),
      clientId,
      { runId, task: shown.tasks![0]! },
      guard,
      new AbortController().signal,
    ),
  ).rejects.toThrow("task changed");
  expect(await journal().load()).toBeNull();
  expect(fetcher.mock.calls.every((call) => call[1]?.method === "GET")).toBe(
    true,
  );
});
