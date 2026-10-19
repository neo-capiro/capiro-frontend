"use client";
import { useLayoutEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useApi } from "@/shared/portfolio/api/provider";
import { ApiError } from "@/shared/portfolio/api/http";
import { boardKey } from "./queries";
import { trackerReaderKey } from "./current-data";
import {
  retainWatchlistDraft,
  sameWatchlistTargeting,
  watchlistDraft,
  watchlistRejections,
  type Watchlist,
  type WatchlistDraft,
} from "./watchlist-contracts";
import { assertWatchlistView, type WatchlistView } from "./watchlist-source";
import {
  createWatchlistSession,
  unconfirmedWatchlistDraft,
  watchlistUnconfirmed,
} from "./watchlist-session";
import { reloadWatchlist, writeWatchlist } from "./watchlist-writer";

type EditorState = {
  base?: Watchlist;
  draft?: WatchlistDraft;
  rejections: string[];
  pending?: "save" | "reload";
  operation?: number;
  error?: Error;
};

/** One retained draft and one save/readback lifetime; native transport and source proofs have separate owners. */
export function useWatchlistEditor(
  view: WatchlistView | undefined,
  onClose: () => void,
) {
  const cache = useQueryClient();
  const api = useApi();
  const [state, setState] = useState<EditorState>({ rejections: [] });
  const active = useRef<ReturnType<typeof createWatchlistSession> | null>(null);
  const operation = useRef(0);
  const mounted = useRef(true);
  if (!state.base && view)
    setState({
      base: view.record,
      draft:
        unconfirmedWatchlistDraft(cache, view) ?? watchlistDraft(view.record),
      rejections: [],
    });
  useLayoutEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      active.current?.close();
      active.current = null;
    };
  }, []);
  const unconfirmed = Boolean(view && watchlistUnconfirmed(cache, view));
  const changed = Boolean(
    view && state.base && !sameWatchlistTargeting(state.base, view.record),
  );

  async function execute(kind: "save" | "reload", onReloaded?: () => void) {
    if (!view || !state.draft || active.current) return;
    if (kind === "save" && (unconfirmed || changed)) return;
    const draft = state.draft;
    const id = ++operation.current;
    let session: ReturnType<typeof createWatchlistSession>;
    try {
      session = createWatchlistSession(cache, view, kind === "save", () => {
        if (mounted.current)
          setState((previous) =>
            previous.operation === id
              ? {
                  ...previous,
                  pending: undefined,
                  error: new ApiError(
                    409,
                    "The current review was interrupted. Your local edits are retained. Refresh current data before continuing.",
                  ),
                }
              : previous,
          );
      });
    } catch (error) {
      setState((previous) => ({
        ...previous,
        error:
          error instanceof Error
            ? error
            : new Error("Targeting is unavailable."),
      }));
      return;
    }
    active.current = session;
    const current = () => {
      if (!mounted.current || active.current !== session)
        throw new Error("This targeting editor has closed.");
      session.current();
    };
    setState((previous) => ({
      ...previous,
      operation: id,
      pending: kind,
      error: undefined,
    }));
    try {
      const result =
        kind === "save"
          ? await writeWatchlist(
              api,
              view,
              draft,
              current,
              session.signal,
              () => session.dispatch(draft),
            )
          : await reloadWatchlist(api, view, current, session.signal);
      current();
      const nextDraft =
        kind === "reload"
          ? watchlistDraft(result)
          : retainWatchlistDraft(draft, result);
      if (kind === "save") session.confirm();
      else session.review(nextDraft);
      // Our own publication replaces the captured source. Verify exactly that
      // next revision before each subsequent cache/UI effect.
      session.close();
      const committedView = {
        ...view,
        record: result,
        targetingSource: {
          ...view.targetingSource,
          revision: view.targetingSource.revision + 1,
        },
      };
      const effectsCurrent = () => {
        if (!mounted.current || active.current !== session)
          throw new Error("This targeting editor has closed.");
        assertWatchlistView(cache, committedView);
      };
      cache.setQueryData(view.targetingSource.key, result);
      effectsCurrent();
      const rejections = watchlistRejections(result);
      setState({ base: result, draft: nextDraft, rejections, operation: id });
      if (kind === "save") {
        effectsCurrent();
        void cache.invalidateQueries({
          queryKey: [
            ...boardKey(view.clientId, view.backend),
            trackerReaderKey(cache),
          ],
          exact: true,
        });
        effectsCurrent();
        if (!rejections.length) onClose();
      } else {
        effectsCurrent();
        onReloaded?.();
      }
    } catch (error) {
      if (active.current === session && !session.signal.aborted) {
        try {
          current();
          if (session.dispatched()) session.reject(error);
          setState((previous) => ({
            ...previous,
            pending: undefined,
            error:
              error instanceof Error
                ? error
                : new Error("The targeting request could not be completed."),
          }));
          if (
            !session.dispatched() &&
            error instanceof ApiError &&
            [403, 404].includes(error.status)
          ) {
            session.close();
            void cache.invalidateQueries({
              queryKey: view.clientSource.key,
              exact: true,
              refetchType: "none",
            });
          }
        } catch {
          /* An obsolete lifetime cannot publish response effects. */
        }
      }
    } finally {
      session.close();
      if (active.current === session) active.current = null;
    }
  }
  return {
    ...state,
    pending:
      active.current && !active.current.signal.aborted
        ? state.pending
        : undefined,
    unconfirmed,
    changed,
    setDraft: (update: (draft: WatchlistDraft) => WatchlistDraft) =>
      setState((previous) =>
        previous.draft
          ? { ...previous, draft: update(previous.draft) }
          : previous,
      ),
    save: () => {
      void execute("save");
    },
    reload: (onReloaded: () => void) => {
      void execute("reload", onReloaded);
    },
  };
}
