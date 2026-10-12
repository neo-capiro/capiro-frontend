import { notifyManager, type QueryClient } from "@tanstack/react-query";
import { ApiError } from "@/shared/portfolio/api/http";
import { ambiguousClientWrite } from "@/shared/portfolio/auth/client-writer";
import {
  assertWatchlistView,
  watchlistSources,
  type WatchlistView,
} from "./watchlist-source";
import type { WatchlistDraft } from "./watchlist-contracts";

// Neither owner returns an idempotency receipt. In particular, a Core lost
// acknowledgement must not be resent by reopening the same QueryClient session.
const unconfirmed = new WeakMap<QueryClient, Map<string, WatchlistDraft>>();
const mutationKey = (view: WatchlistView) =>
  JSON.stringify([
    view.reader.actor.tenantId,
    view.reader.actor.userId,
    view.backend,
    view.clientId,
  ]);
export const watchlistUnconfirmed = (cache: QueryClient, view: WatchlistView) =>
  Boolean(unconfirmed.get(cache)?.has(mutationKey(view)));
export const unconfirmedWatchlistDraft = (
  cache: QueryClient,
  view: WatchlistView,
) => unconfirmed.get(cache)?.get(mutationKey(view));

/** One reviewed source snapshot and one save/reload lifetime, with a synchronous interruption latch. */
export function createWatchlistSession(
  cache: QueryClient,
  view: WatchlistView,
  editing: boolean,
  onInterrupted: () => void,
) {
  const controller = new AbortController();
  let closed = false;
  let sent = false;
  const current = () => {
    controller.signal.throwIfAborted();
    if (closed) throw new Error("This targeting review has closed.");
    return assertWatchlistView(cache, view, editing);
  };
  current();
  const keys = new Set(
    watchlistSources(view).map((source) => JSON.stringify(source.key)),
  );
  const notify = notifyManager.batchCalls(onInterrupted);
  const unsubscribe = cache.getQueryCache().subscribe((event) => {
    if (
      event.query.queryKey[0] !== "identity" &&
      !keys.has(JSON.stringify(event.query.queryKey))
    )
      return;
    try {
      current();
    } catch {
      controller.abort();
      notify();
    }
  });
  controller.signal.addEventListener("abort", unsubscribe, { once: true });
  return {
    view,
    signal: controller.signal,
    current,
    dispatched: () => sent,
    dispatch: (draft: WatchlistDraft) => {
      current();
      const entries =
        unconfirmed.get(cache) ?? new Map<string, WatchlistDraft>();
      if (entries.has(mutationKey(view)))
        throw new ApiError(
          409,
          "The previous save is unconfirmed and will not be resent.",
        );
      entries.set(mutationKey(view), structuredClone(draft));
      unconfirmed.set(cache, entries);
      sent = true;
    },
    review: (draft: WatchlistDraft) => {
      current();
      const entries = unconfirmed.get(cache);
      if (entries?.has(mutationKey(view)))
        entries.set(mutationKey(view), structuredClone(draft));
    },
    confirm: () => {
      current();
      unconfirmed.get(cache)?.delete(mutationKey(view));
    },
    reject: (error: unknown) => {
      current();
      if (
        !ambiguousClientWrite(error) ||
        (error instanceof ApiError && error.status === 428)
      )
        unconfirmed.get(cache)?.delete(mutationKey(view));
    },
    close: () => {
      closed = true;
      controller.abort();
    },
  };
}
