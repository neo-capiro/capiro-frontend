"use client";
import { useLayoutEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useApi } from "@/shared/portfolio/api/provider";
import {
  assertReviewAccess,
  executeReviewAction,
  type ReviewAction,
  type ReviewActor,
} from "./actions";
import { latestReviewKey, loadRun } from "./queries";
import type { FillRun } from "./contracts";
import { reviewRecovery, type SavedApplication } from "./review-recovery";
import { sendApplication } from "./application-api";
import { refreshAppliedSurfaces } from "./review-effects";

export function useReviewAction(
  clientId: string,
  open: boolean,
  actor: ReviewActor,
  canRead: boolean,
) {
  const api = useApi();
  const cache = useQueryClient();
  const lifetime = useRef<AbortController | null>(null);
  const { userId, tenantId } = actor;
  const session = useMemo(
    () => ({ clientId, open, canRead, userId, tenantId }),
    [clientId, open, canRead, userId, tenantId],
  );
  const [loadedSession, setLoadedSession] = useState<typeof session>();
  const ready = loadedSession === session;
  const [pending, setPending] = useState<SavedApplication | null>(null);
  const [legacyUnknown, setLegacyUnknown] = useState<FillRun>();
  const [uncertainReview, setUncertainReview] = useState<FillRun>();
  const [receipt, setReceipt] = useState<string>();
  const [application, setApplication] = useState<FillRun["application"]>();
  const [readError, setReadError] = useState<Error>();
  function currentGuard(controller: AbortController, admin: boolean) {
    return () => {
      controller.signal.throwIfAborted();
      if (!open || lifetime.current !== controller)
        throw new Error("Reopen the review before continuing.");
      assertReviewAccess(cache, actor, admin);
    };
  }
  useLayoutEffect(() => {
    const controller = new AbortController();
    lifetime.current = controller;
    if (session.open && session.canRead) {
      const guard = () => {
        controller.signal.throwIfAborted();
        assertReviewAccess(cache, session, false);
      };
      void reviewRecovery(session.clientId, session, guard)
        .load()
        .then(async (saved) => {
          guard();
          setPending(saved);
          setLoadedSession(session);
          setReadError(undefined);
          if (saved) {
            const run = await loadRun(
              api,
              session.clientId,
              saved.attempt.runId,
              controller.signal,
            );
            guard();
            setUncertainReview(run);
          }
        })
        .catch((error) => {
          if (!controller.signal.aborted) setReadError(asError(error));
        });
    }
    return () => controller.abort();
  }, [session, cache, api]);

  async function settle(
    result: FillRun,
    controller: AbortController,
    acknowledge?: () => Promise<void>,
  ) {
    const guard = currentGuard(controller, false);
    guard();
    if (acknowledge) await acknowledge();
    guard();
    cache.setQueryData(latestReviewKey(clientId, actor), result);
    setPending(null);
    setLegacyUnknown(undefined);
    setUncertainReview(undefined);
    setApplication(result.application);
    setReadError(undefined);
    setLoadedSession(session);
  }
  const mutation = useMutation({
    retry: false,
    mutationFn: async ({
      review,
      action,
    }: {
      review: FillRun;
      action: ReviewAction;
    }) => {
      const controller = lifetime.current;
      if (!controller || !ready || pending || legacyUnknown)
        throw new Error("Resolve the saved request before continuing.");
      const guard = currentGuard(controller, action.kind !== "cancel");
      const journal = reviewRecovery(clientId, actor, guard);
      let dispatched = false;
      return journal.lock(async () => {
        const previous = await journal.load();
        if (previous) {
          setPending(previous);
          throw new Error(
            "Recover the saved application before applying other findings.",
          );
        }
        try {
          const result: FillRun = await executeReviewAction(
            api,
            clientId,
            review,
            action,
            guard,
            controller.signal,
            async (attempt) => {
              if (attempt) {
                const saved = await journal.reserve(attempt);
                guard();
                setPending(saved);
              } else setLegacyUnknown(review);
              dispatched = true;
              setUncertainReview(review);
              setReceipt(undefined);
              setApplication(undefined);
            },
            journal.received,
          );
          guard();
          await settle(
            result,
            controller,
            result.application
              ? () => journal.acknowledge(result.application!.requestId)
              : undefined,
          );
          setReceipt(
            result.application
              ? undefined
              : action.kind === "cancel"
                ? `Run is ${result.status}. Previously accepted changes remain saved.`
                : action.kind === "reject"
                  ? "Ignore acknowledged. The saved review has been refreshed."
                  : "Restore acknowledged. The saved review has been refreshed.",
          );
          return result;
        } finally {
          if (dispatched && !controller.signal.aborted)
            await refreshAppliedSurfaces(cache, clientId);
        }
      });
    },
  });
  const recovery = useMutation({
    retry: false,
    onSuccess: () => mutation.reset(),
    mutationFn: async () => {
      const controller = lifetime.current;
      if (!controller) throw new Error("Reopen the review before continuing.");
      const guard = currentGuard(controller, true);
      const journal = reviewRecovery(clientId, actor, guard);
      return journal.lock(async () => {
        const saved = await journal.load();
        guard();
        if (!saved) {
          setPending(null);
          setLoadedSession(session);
          // Another tab may have acknowledged it. Read current state; never invent a result.
          await cache.invalidateQueries({
            queryKey: latestReviewKey(clientId, actor),
          });
          return;
        }
        setPending(saved);
        const outcome =
          saved.outcome ??
          (await sendApplication(
            api,
            clientId,
            saved.attempt,
            guard,
            controller.signal,
            journal.received,
          ));
        guard();
        const run = await loadRun(
          api,
          clientId,
          saved.attempt.runId,
          controller.signal,
        );
        guard();
        await settle({ ...run, application: outcome }, controller, () =>
          journal.acknowledge(outcome.requestId),
        );
        await refreshAppliedSurfaces(cache, clientId);
      });
    },
  });
  function createUploadGuard() {
    const controller = lifetime.current;
    return () => {
      if (!controller) throw new Error("Reopen the review before uploading.");
      currentGuard(controller, true)();
    };
  }
  async function refreshUncertainReview() {
    const controller = lifetime.current;
    const runId = pending?.attempt.runId ?? legacyUnknown?.id;
    if (!runId || !controller) return;
    const guard = currentGuard(controller, false);
    try {
      guard();
      const saved = await loadRun(api, clientId, runId, controller.signal);
      guard();
      setUncertainReview(saved);
      setReadError(undefined);
    } catch (error) {
      if (!controller.signal.aborted) setReadError(asError(error));
    }
  }
  return {
    mutation,
    recovery,
    checkingRecovery: !ready,
    uncertain: Boolean(pending || legacyUnknown),
    recoverable: Boolean(pending),
    uncertainReview,
    readError,
    refreshUncertainReview,
    receipt,
    application,
    createUploadGuard,
  };
}
function asError(error: unknown) {
  return error instanceof Error
    ? error
    : new Error("The saved review could not be loaded.", { cause: error });
}
