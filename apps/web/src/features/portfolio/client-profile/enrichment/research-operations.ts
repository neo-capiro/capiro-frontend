import type { ApiClient } from "@/shared/portfolio/api/http";
import type { ReviewActor } from "./actions";
import { loadRun } from "./queries";
import { researchRecovery, type SavedResearch } from "./research-recovery";
import { prepareResearch, sendResearch } from "./research-api";
import { prepareRetry, sendRetry } from "./retry-api";
import type { ResearchInput } from "./research-contracts";
import type { RetrySelection } from "./retry-contracts";

/** Starts and retries share one pending command and execution lock for this actor/client. */
export function researchOperations({
  api,
  clientId,
  actor,
  guard,
  signal,
  install,
}: {
  api: ApiClient;
  clientId: string;
  actor: ReviewActor;
  guard: () => void;
  signal: () => AbortSignal;
  install: (saved: SavedResearch | null) => void;
}) {
  const journal = researchRecovery(clientId, actor, guard);
  const context = { api, clientId, guard, signal, journal, install };
  const begin = (prepare: () => Promise<SavedResearch["command"]>) =>
    journal.lock(async () => {
      const pending = await journal.load();
      if (pending) {
        install(pending);
        throw new Error("Recover the saved research request first.");
      }
      const saved = await journal.reserve(await prepare());
      guard();
      install(saved);
      return finishResearch(context, saved);
    });
  return {
    start: (input: ResearchInput) =>
      begin(() => prepareResearch(api, clientId, input, guard, signal())),
    retry: (selection: RetrySelection) =>
      begin(() => prepareRetry(api, clientId, selection, guard, signal())),
    recover: () =>
      journal.lock(async () => {
        const saved = await journal.load();
        guard();
        install(saved);
        return saved ? finishResearch(context, saved) : undefined;
      }),
  };
}
async function finishResearch(
  {
    api,
    clientId,
    guard,
    signal,
    journal,
    install,
  }: {
    api: ApiClient;
    clientId: string;
    guard: () => void;
    signal: () => AbortSignal;
    journal: ReturnType<typeof researchRecovery>;
    install: (saved: SavedResearch | null) => void;
  },
  saved: SavedResearch,
) {
  let retry = saved.retry;
  if ("input" in saved.command) {
    if (!saved.confirmed)
      await sendResearch(
        api,
        clientId,
        saved.command,
        guard,
        signal(),
        journal.received,
      );
  } else if (!retry)
    retry = await sendRetry(
      api,
      clientId,
      saved.command,
      guard,
      signal(),
      journal.receivedRetry,
    );
  const runId =
    "input" in saved.command ? saved.command.requestId : saved.command.runId;
  const run = await loadRun(api, clientId, runId, signal());
  guard();
  await journal.acknowledge(saved.command.requestId);
  guard();
  install(null);
  return { run, retry };
}
