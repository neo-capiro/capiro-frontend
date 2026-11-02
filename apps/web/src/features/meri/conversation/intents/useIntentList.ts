"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import type { IntentsItem } from "@capiro/meri-client/intents";
import {
  intentAccessLost,
  type IntentsAccess,
} from "../../../../shared/meri-intents/access";

export type ListState =
  | { status: "loading" }
  | {
      status: "ready";
      items: readonly IntentsItem[];
      next: string | null;
      loadingMore: boolean;
    }
  | { status: "disabled" }
  | { status: "unavailable"; accessLost?: boolean };
const loading: ListState = { status: "loading" };

/**
 * The conversation's durable intent list: read on open and whenever `refreshKey` changes, then
 * page by page. A list already shown stays on screen while it is read again.
 */
export function useIntentList(
  access: IntentsAccess,
  conversationId: string,
  refreshKey: string | undefined,
) {
  const [stored, setStored] = useState({
    access,
    conversationId,
    value: { status: "loading" } as ListState,
  });
  const list: ListState =
    stored.access === access && stored.conversationId === conversationId
      ? stored.value
      : loading;
  const setList = useCallback(
    (next: ListState | ((current: ListState) => ListState)) => {
      setStored((previous) => ({
        access,
        conversationId,
        value:
          typeof next === "function"
            ? next(
                previous.access === access &&
                  previous.conversationId === conversationId
                  ? previous.value
                  : { status: "loading" },
              )
            : next,
      }));
    },
    [access, conversationId],
  );
  const work = useRef<AbortController | null>(null);
  const alive = useRef(true);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
      work.current?.abort();
    };
  }, []);
  const read = useCallback(
    async (after: string | null) => {
      work.current?.abort();
      const controller = (work.current = new AbortController());
      const reply = await access.list(
        { conversationId, limit: 50, ...(after ? { after } : {}) },
        controller.signal,
      );
      if (!alive.current || controller.signal.aborted) return;
      if (reply.kind === "ok")
        setList((current) => ({
          status: "ready",
          items:
            after && current.status === "ready"
              ? [...current.items, ...reply.value.intents]
              : reply.value.intents,
          next: reply.value.next,
          loadingMore: false,
        }));
      else if (
        reply.kind === "refused" &&
        reply.code === "INTENT_APPROVALS_DISABLED"
      )
        setList({ status: "disabled" });
      else if (intentAccessLost(reply))
        setList({ status: "unavailable", accessLost: true });
      else
        setList((current) =>
          after && current.status === "ready"
            ? { ...current, loadingMore: false }
            : { status: "unavailable" },
        );
    },
    [access, conversationId, setList],
  );
  useEffect(() => {
    void read(null);
  }, [read, refreshKey]);
  const refresh = useCallback(() => read(null), [read]);
  const loadMore = useCallback(() => {
    if (list.status !== "ready" || !list.next) return;
    setList({ ...list, loadingMore: true });
    void read(list.next);
  }, [list, read, setList]);
  return { list, refresh, loadMore, alive };
}
