"use client";
import { useEffect, useMemo, useRef, useSyncExternalStore } from "react";
import type { MemoryNotificationsClient } from "../../../shared/meri-notifications/memory-client";
import type { createRunsClient } from "../../../shared/meri-runs/client";
import {
  createUpdatesFeed,
  runScope,
  scopeKey,
  updatesLifetimeKey,
} from "./updates-feed";

/**
 * One feed per account lifetime, one explicit read per feed instance and scope.
 *
 * The feed is rebuilt only from the owner key (a primitive) and stable client
 * callbacks. A preference save, a status message or any other local re-render
 * therefore neither recreates the feed nor re-reads it. A scope change re-reads
 * through the same instance, so previously authorized rows stay visible until the
 * new scope is verified; they are released only when the account lifetime ends.
 */
export function useUpdatesFeed(input: {
  ownerKey: string;
  clientId: string | null;
  notificationsClient: MemoryNotificationsClient;
  runsClient: ReturnType<typeof createRunsClient>;
  isCurrent: () => boolean;
  onAccessLost: () => void;
}) {
  const lifetime = updatesLifetimeKey(input.ownerKey);
  const scopeId = scopeKey(runScope(input.clientId));
  const feed = useMemo(
    () =>
      createUpdatesFeed({
        scope: runScope(input.clientId),
        notificationsClient: input.notificationsClient,
        runsClient: input.runsClient,
        isCurrent: input.isCurrent,
        onAccessLost: input.onAccessLost,
      }),
    // Rebuild only for a new account lifetime or new stable client callbacks.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [
      lifetime,
      input.notificationsClient,
      input.runsClient,
      input.isCurrent,
      input.onAccessLost,
    ],
  );
  const readFor = useRef<string | null>(null);
  const snapshot = useSyncExternalStore(
    feed.subscribe,
    feed.snapshot,
    feed.snapshot,
  );
  useEffect(() => {
    const key = `${lifetime}|${scopeId}`;
    if (readFor.current === key) return;
    readFor.current = key;
    void feed.read(runScope(input.clientId));
  }, [feed, lifetime, scopeId, input.clientId]);
  useEffect(() => () => feed.dispose(), [feed]);
  return {
    snapshot,
    loadMore: feed.loadMore,
    refresh: feed.read,
    release: feed.lose,
    scope: feed.scope,
  };
}
