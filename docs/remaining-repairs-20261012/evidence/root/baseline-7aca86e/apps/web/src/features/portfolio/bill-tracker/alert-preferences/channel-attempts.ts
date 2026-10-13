"use client";
import { useMemo, useSyncExternalStore } from "react";
import {
  notifyManager,
  useQueryClient,
  type QueryClient,
  type QueryKey,
} from "@tanstack/react-query";
import { preferenceActorKey, type PreferenceActor } from "./personal-access";
export type ChannelGroup = "phone" | "test";
export type ChannelAttempt = {
  token: number;
  status: "pending" | "unknown";
  action: "start" | "confirm" | "test";
};
let nextToken = 0;
export const channelAttemptKey = (
  clientId: string,
  owner: PreferenceActor,
  group: ChannelGroup,
) =>
  [
    "bill-alert-channel-attempt",
    preferenceActorKey(owner),
    clientId,
    group,
  ] as const;
export function beginChannelAttempt(
  cache: QueryClient,
  key: QueryKey,
  action: ChannelAttempt["action"],
) {
  if (cache.getQueryData(key))
    throw new Error(
      "Review the previous channel attempt before another request.",
    );
  if (
    cache
      .getQueryCache()
      .findAll({ queryKey: key.slice(0, -1) })
      .some(
        (query) =>
          (query.state.data as ChannelAttempt | undefined)?.status ===
          "pending",
      )
  )
    throw new Error(
      "Wait for the current channel action before starting another.",
    );
  const attempt: ChannelAttempt = {
    token: ++nextToken,
    status: "pending",
    action,
  };
  // This is an in-browser uncertainty record, not a native operation receipt.
  cache.setQueryDefaults(key, { gcTime: Infinity });
  cache.setQueryData(key, attempt);
  return attempt;
}
export function finishChannelAttempt(
  cache: QueryClient,
  key: QueryKey,
  token: number,
  unknown: boolean,
) {
  const current = cache.getQueryData<ChannelAttempt>(key);
  if (current?.token !== token) return;
  if (unknown) cache.setQueryData(key, { ...current, status: "unknown" });
  else cache.removeQueries({ queryKey: key, exact: true });
}
export function useChannelAttempt(
  clientId: string,
  owner: PreferenceActor,
  group: ChannelGroup,
) {
  const cache = useQueryClient();
  const key = useMemo(
    () => channelAttemptKey(clientId, owner, group),
    [owner, clientId, group],
  );
  const attempt = useSyncExternalStore(
    (notify) =>
      cache.getQueryCache().subscribe(
        notifyManager.batchCalls((event) => {
          if (JSON.stringify(event.query.queryKey) === JSON.stringify(key))
            notify();
        }),
      ),
    () => cache.getQueryData<ChannelAttempt>(key),
    () => undefined,
  );
  return { key, attempt };
}
