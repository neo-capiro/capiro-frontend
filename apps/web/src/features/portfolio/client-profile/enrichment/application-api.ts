import type { ApiClient } from "@/shared/portfolio/api/http";
import { enrichmentPath } from "./queries";
import {
  applicationResponse,
  type ApplicationAttempt,
  type ApplicationResult,
} from "./review-contracts";

/** Recovery always sends the retained request, revisions and target unchanged. */
export async function sendApplication(
  api: ApiClient,
  clientId: string,
  attempt: ApplicationAttempt,
  guard: () => void,
  signal: AbortSignal,
  received: (
    attempt: ApplicationAttempt,
    result: ApplicationResult,
  ) => Promise<void> = async () => {},
) {
  guard();
  signal.throwIfAborted();
  const runPath = `${enrichmentPath(clientId)}/runs/${attempt.runId}`;
  const result = await api.request(
    "core",
    attempt.kind === "apply"
      ? `${runPath}/apply`
      : `${runPath}/findings/${attempt.findingId}/assign-matter`,
    applicationResponse(attempt),
    {
      method: "POST",
      signal,
      body:
        attempt.kind === "apply"
          ? attempt.command
          : { ...attempt.command, ...attempt.target },
    },
  );
  // Retain an exact late response in its original scope before checking display authority.
  await received(attempt, result);
  guard();
  signal.throwIfAborted();
  return result;
}
