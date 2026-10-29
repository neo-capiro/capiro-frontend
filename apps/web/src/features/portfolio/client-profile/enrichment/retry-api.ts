import { ApiError, type ApiClient } from "@/shared/portfolio/api/http";
import { enrichmentPath, loadRun } from "./queries";
import {
  retryCommandSchema,
  retryResponse,
  type RetryCommand,
  type RetryResult,
  type RetrySelection,
} from "./retry-contracts";

export async function prepareRetry(
  api: ApiClient,
  clientId: string,
  selection: RetrySelection,
  guard: () => void,
  signal: AbortSignal,
) {
  guard();
  const run = await loadRun(api, clientId, selection.runId, signal);
  guard();
  signal.throwIfAborted();
  const current = run.tasks?.find((task) => task.id === selection.task.id);
  if (
    run.status === "cancelled" ||
    selection.task.status !== "failed" ||
    current?.status !== "failed" ||
    current.attempt !== selection.task.attempt ||
    current.taskType !== selection.task.taskType
  )
    throw new ApiError(
      409,
      "The task changed. Refresh its saved status before retrying.",
    );
  return retryCommandSchema.parse({
    requestId: crypto.randomUUID(),
    runId: selection.runId,
    taskId: selection.task.id,
    expectedAttempt: selection.task.attempt,
    expectedTaskType: selection.task.taskType,
  });
}
export async function sendRetry(
  api: ApiClient,
  clientId: string,
  command: RetryCommand,
  guard: () => void,
  signal: AbortSignal,
  received: (command: RetryCommand, result: RetryResult) => Promise<unknown>,
) {
  guard();
  signal.throwIfAborted();
  const result = await api.request(
    "core",
    `${enrichmentPath(clientId)}/runs/${command.runId}/tasks/${command.taskId}/retry`,
    retryResponse(command),
    {
      method: "POST",
      body: {
        requestId: command.requestId,
        expectedAttempt: command.expectedAttempt,
        expectedTaskType: command.expectedTaskType,
      },
      signal,
    },
  );
  await received(command, result);
  guard();
  signal.throwIfAborted();
  return result;
}
