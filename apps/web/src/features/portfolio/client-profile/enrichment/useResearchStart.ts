"use client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useApi } from "@/shared/portfolio/api/provider";
import { useRetainedIntent } from "@/shared/session/recovery/useRetainedIntent";
import { assertReviewAccess, type ReviewActor } from "./actions";
import { setupSchema, type FillRun } from "./contracts";
import { enrichmentPath, latestReviewKey } from "./queries";
import { researchRecoveryContract, researchScope } from "./research-recovery";
import { researchOperations } from "./research-operations";
import type { ResearchInput } from "./research-contracts";

export function useResearchStart(
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
  const display = async (run?: FillRun) => {
    guard();
    if (run) cache.setQueryData(latestReviewKey(clientId, actor), run);
    else
      await cache.invalidateQueries({
        queryKey: latestReviewKey(clientId, actor),
      });
    return run;
  };
  const start = useMutation({
    retry: false,
    mutationFn: async (input: ResearchInput) => {
      guard();
      if (!retained.ready)
        throw new Error("Check saved research requests before continuing.");
      return display(await operations.start(input));
    },
  });
  const recover = useMutation({
    retry: false,
    onSuccess: () => start.reset(),
    mutationFn: async () => {
      await retained.verify();
      return display(await operations.recover());
    },
  });
  return {
    start,
    recover,
    retained,
    busy: start.isPending || recover.isPending,
    blocked: !retained.ready || Boolean(retained.record),
  };
}
