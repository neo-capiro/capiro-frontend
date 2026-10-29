import type { ApiClient } from "@/shared/portfolio/api/http";
import type { ReviewActor } from "./actions";
import { loadRun } from "./queries";
import { researchRecovery, type SavedResearch } from "./research-recovery";
import { prepareResearch, sendResearch } from "./research-api";
import type { ResearchInput } from "./research-contracts";

/** UI lifetimes own visibility; this owner reuses the journal for exact start/replay. */
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
  async function finish(saved: SavedResearch) {
    if (!saved.confirmed)
      await sendResearch(
        api,
        clientId,
        saved.command,
        guard,
        signal(),
        journal.received,
      );
    const run = await loadRun(api, clientId, saved.command.requestId, signal());
    guard();
    await journal.acknowledge(saved.command.requestId);
    guard();
    install(null);
    return run;
  }
  return {
    start: (input: ResearchInput) =>
      journal.lock(async () => {
        const pending = await journal.load();
        if (pending) {
          install(pending);
          throw new Error("Recover the saved research request first.");
        }
        const command = await prepareResearch(
          api,
          clientId,
          input,
          guard,
          signal(),
        );
        const saved = await journal.reserve(command);
        guard();
        install(saved);
        return finish(saved);
      }),
    recover: () =>
      journal.lock(async () => {
        const saved = await journal.load();
        guard();
        install(saved);
        return saved ? finish(saved) : undefined;
      }),
  };
}
