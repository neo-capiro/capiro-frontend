"use client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useApi } from "@/shared/portfolio/api/provider";
import { useRetainedIntent } from "@/shared/session/recovery/useRetainedIntent";
import { assertReviewAccess, type ReviewActor } from "./actions";
import { setupSchema } from "./contracts";
import { enrichmentPath, latestReviewKey } from "./queries";
import { researchRecoveryContract, researchScope } from "./research-recovery";
import { researchOperations } from "./research-operations";
import type { ResearchInput } from "./research-contracts";
import type { RetrySelection } from "./retry-contracts";
type Intent =
  | { kind: "start"; input: ResearchInput }
  | { kind: "retry"; selection: RetrySelection };

export function useResearchCommands(
  clientId: string,
  actor: ReviewActor,
  open: boolean,
  canRead: boolean,
) {
  const api = useApi(),
    cache = useQueryClient();
  const authorize = () => {
    if (!open || !canRead)
      throw new Error("Open the client with a current session to continue.");
    assertReviewAccess(cache, actor, false);
  };
  const retained = useRetainedIntent(
    researchScope(clientId, actor),
    researchRecoveryContract,
    async (signal, assert) => {
      authorize();
      await api.request(
        "core",
        enrichmentPath(clientId) + "/setup",
        setupSchema.refine((value) => value.clientId === clientId),
        { signal },
      );
      assert();
      authorize();
    },
    JSON.stringify([open, canRead]),
  );
  const guard = () => {
    retained.guard();
    authorize();
  };
  const operations = researchOperations({
    api,
    clientId,
    actor,
    guard,
    signal: retained.signal,
    install: retained.install,
  });
  const display = async (
    result: Awaited<ReturnType<typeof operations.recover>>,
  ) => {
    guard();
    if (result)
      cache.setQueryData(latestReviewKey(clientId, actor), result.run);
    else
      await cache.invalidateQueries({
        queryKey: latestReviewKey(clientId, actor),
      });
    return result;
  };
  const mutation = useMutation({
    retry: false,
    mutationFn: async (intent: Intent) => {
      guard();
      if (!retained.ready)
        throw new Error("Check saved research requests before continuing.");
      return display(
        await (intent.kind === "start"
          ? operations.start(intent.input)
          : operations.retry(intent.selection)),
      );
    },
  });
  const recover = useMutation({
    retry: false,
    onSuccess: () => mutation.reset(),
    mutationFn: async () => {
      await retained.verify();
      return display(await operations.recover());
    },
  });
  const latest =
    mutation.submittedAt >= recover.submittedAt ? mutation : recover;
  return {
    mutation,
    recover,
    retained,
    result: latest.data?.retry,
    error: latest.error,
    busy: mutation.isPending || recover.isPending,
    blocked: !retained.ready || Boolean(retained.record),
  };
}
