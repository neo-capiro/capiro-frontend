"use client";
import { useLayoutEffect, useRef, useState } from "react";
import {
  notifyManager,
  useQueryClient,
  type QueryClient,
} from "@tanstack/react-query";
import { useApi } from "@/shared/portfolio/api/provider";
import { ApiError } from "@/shared/portfolio/api/http";
import { ambiguousClientWrite } from "@/shared/portfolio/auth/client-writer";
import { removeSubmission } from "./actions";
import { assertSubmissionView, type SubmissionView } from "./submission-view";

// A native DELETE has no version/idempotency receipt. Keep an unconfirmed dispatch
// fenced across closing/reopening this view for the lifetime of this QueryClient.
const uncertainRemovals = new WeakMap<QueryClient, Set<string>>();

/** One selected row, its saved client/history revisions, and its native dispatch. */
export function createRemovalReview(
  cache: QueryClient,
  view: SubmissionView,
  id: string,
  onInvalidated: () => void = () => {},
) {
  const controller = new AbortController();
  const key = JSON.stringify([
    view.actor.tenantId,
    view.actor.userId,
    view.clientId,
    id,
  ]);
  const uncertain = uncertainRemovals.get(cache) ?? new Set<string>();
  uncertainRemovals.set(cache, uncertain);
  const current = () => {
    controller.signal.throwIfAborted();
    const saved = assertSubmissionView(cache, view);
    const item = saved.rows.find((row) => row.id === id);
    if (!item)
      throw new ApiError(
        409,
        "This submission is no longer visible. Refresh the saved history.",
      );
    return { item, clientName: saved.clientName };
  };
  current();
  const sourceKeys = new Set([
    JSON.stringify(view.clientSource.key),
    JSON.stringify(view.historySource.key),
  ]);
  const notifyInvalidated = notifyManager.batchCalls(onInvalidated);
  const unsubscribe = cache.getQueryCache().subscribe((event) => {
    if (
      event.query.queryKey[0] !== "identity" &&
      !sourceKeys.has(JSON.stringify(event.query.queryKey))
    )
      return;
    try {
      current();
    } catch {
      controller.abort();
      notifyInvalidated();
    }
  });
  controller.signal.addEventListener("abort", unsubscribe, { once: true });
  return {
    historyKey: view.historySource.key,
    signal: controller.signal,
    current,
    uncertain: () => uncertain.has(key),
    dispatch: () => {
      current();
      if (uncertain.has(key))
        throw new ApiError(
          409,
          "This removal has an uncertain result and will not be resent.",
        );
      uncertain.add(key);
    },
    reject: (error: unknown) => {
      current();
      if (!ambiguousClientWrite(error)) uncertain.delete(key);
    },
    confirm: () => {
      current();
      uncertain.delete(key);
    },
    close: () => controller.abort(),
  };
}

type RemovalReview = ReturnType<typeof createRemovalReview>;
type RemovalState = {
  review?: RemovalReview;
  pending?: boolean;
  error?: Error;
  receipt?: string;
};

/** React feedback and native completion belong to this one selected review lifetime. */
export function useSubmissionRemoval(clientId: string, view?: SubmissionView) {
  const api = useApi();
  const cache = useQueryClient();
  const selected = useRef<RemovalReview | null>(null);
  const running = useRef<RemovalReview | null>(null);
  const [state, setState] = useState<RemovalState>({});
  useLayoutEffect(
    () => () => {
      selected.current?.close();
      selected.current = null;
    },
    [cache, clientId],
  );

  function close() {
    selected.current?.close();
    selected.current = null;
    setState({});
  }
  function select(id: string) {
    if (!view) return;
    selected.current?.close();
    try {
      const review = createRemovalReview(cache, view, id, () => {
        if (selected.current === review) close();
      });
      selected.current = review;
      setState({ review });
    } catch {
      selected.current = null;
      setState({});
    }
  }
  async function confirm() {
    const review = selected.current;
    if (
      !review ||
      review.signal.aborted ||
      running.current === review ||
      review.uncertain()
    )
      return;
    running.current = review;
    const guard = () => {
      if (selected.current !== review)
        throw new Error("This submission review has closed.");
      return review.current();
    };
    let sent = false;
    try {
      const { item } = guard();
      setState({ review, pending: true });
      await removeSubmission(api, item, guard, review.signal, () => {
        guard();
        review.dispatch();
        sent = true;
      });
      guard();
      review.confirm();
      // No await separates the current-view check from these synchronous effects.
      selected.current = null;
      review.close();
      setState({
        receipt:
          "Saved submission removed. Its capability and documents remain.",
      });
      void cache.invalidateQueries({
        queryKey: review.historyKey,
        exact: true,
      });
    } catch (error) {
      if (selected.current === review && !review.signal.aborted) {
        try {
          guard();
          if (
            !sent &&
            error instanceof ApiError &&
            [403, 404].includes(error.status)
          ) {
            // A current authorization/visibility refusal during preflight cannot
            // leave the older history actionable. Reconcile through its query owner.
            selected.current = null;
            review.close();
            setState({});
            void cache.invalidateQueries({
              queryKey: review.historyKey,
              exact: true,
            });
            return;
          }
          if (sent) review.reject(error);
          setState({
            review,
            error:
              error instanceof Error
                ? error
                : new Error("The saved submission could not be removed."),
          });
        } catch {
          // Obsolete dispatches retain their uncertainty fence and have no UI/cache effects.
        }
      }
    } finally {
      if (running.current === review) running.current = null;
    }
  }
  let record: ReturnType<RemovalReview["current"]> | undefined;
  try {
    if (state.review) record = state.review.current();
  } catch {
    // The synchronous review guard withholds content before the queued render notification.
  }
  return {
    ...record,
    pending: Boolean(state.pending && record),
    error: record ? state.error : undefined,
    frozen: Boolean(!state.pending && record && state.review?.uncertain()),
    receipt: state.receipt,
    select,
    close,
    confirm: () => void confirm(),
  };
}
