"use client";
import { useCallback, useSyncExternalStore } from "react";
import {
  notifyManager,
  useQueryClient,
  type QueryClient,
  type QueryKey,
} from "@tanstack/react-query";
import { ApiError } from "@/shared/portfolio/api/http";
import {
  assertProfileActor,
  currentProfileActor,
  profileActorKey,
  useProfileActor,
  type ProfileActor,
} from "../profile-access";
import { profileReadKey } from "../profile-keys";
import { useProfileClient } from "../profile-read-queries";
import { profileClientSchema } from "../profile-receipts";
import {
  assertProfileSource,
  currentProfileSource,
  type ProfileSource,
} from "../profile-source";
import { submissionKey, submissionListSchema, useSubmissions } from "./queries";
import type { SavedSubmission } from "./contracts";

export type SubmissionView = {
  clientId: string;
  actor: ProfileActor;
  clientName: string;
  rows: SavedSubmission[];
  clientSource: ProfileSource;
  historySource: ProfileSource;
};

/** Both saved records must belong to the current actor's successful reads. */
export function currentSubmissionView(
  cache: QueryClient,
  clientId: string,
): SubmissionView | undefined {
  const actor = currentProfileActor(cache);
  if (!actor) return;
  const clientSource = currentProfileSource(
    cache,
    profileReadKey(clientId, "saved-client", actor),
  );
  const historySource = currentProfileSource(
    cache,
    submissionKey(clientId, actor),
  );
  if (!clientSource || !historySource) return;
  const client = profileClientSchema(clientId, actor.tenantId).safeParse(
    cache.getQueryData(clientSource.key),
  );
  const history = submissionListSchema(clientId, actor.tenantId).safeParse(
    cache.getQueryData(historySource.key),
  );
  if (
    !client.success ||
    client.data.status.toLowerCase() === "archived" ||
    !history.success
  )
    return;
  return {
    clientId,
    actor,
    clientName: client.data.name,
    rows: history.data,
    clientSource,
    historySource,
  };
}

export function assertSubmissionView(cache: QueryClient, view: SubmissionView) {
  assertProfileActor(cache, view.actor);
  assertProfileSource(cache, view.clientSource);
  assertProfileSource(cache, view.historySource);
  const current = currentSubmissionView(cache, view.clientId);
  if (!current)
    throw new ApiError(
      409,
      "Refresh the current client and saved history before continuing.",
    );
  return current;
}

function sourceState(cache: QueryClient, key: QueryKey) {
  const state = cache.getQueryState(key);
  return [
    state?.status,
    state?.fetchStatus,
    state?.isInvalidated,
    state?.dataUpdateCount,
    state?.errorUpdateCount,
    Boolean(state?.error),
  ];
}

/** Query results do not expose invalidation; this subscription also withholds those cached rows. */
export function useSubmissionView(clientId: string) {
  const cache = useQueryClient();
  const actor = useProfileActor();
  const client = useProfileClient(clientId);
  const history = useSubmissions(clientId);
  const subscribe = useCallback(
    (notify: () => void) =>
      cache.getQueryCache().subscribe(
        notifyManager.batchCalls((event) => {
          const key = event.query.queryKey;
          if (
            key[0] === "identity" ||
            (key[0] === "client-submissions" && key[1] === clientId) ||
            (key[0] === "client-profile" &&
              key[1] === clientId &&
              key[2] === "saved-client")
          )
            notify();
        }),
      ),
    [cache, clientId],
  );
  useSyncExternalStore(
    subscribe,
    () =>
      JSON.stringify([
        profileActorKey(currentProfileActor(cache)),
        sourceState(cache, profileReadKey(clientId, "saved-client", actor)),
        sourceState(cache, submissionKey(clientId, actor)),
      ]),
    () => "",
  );
  return {
    actor,
    view: currentSubmissionView(cache, clientId),
    pending:
      Boolean(actor) &&
      (client.isPending ||
        history.isPending ||
        client.isFetching ||
        history.isFetching),
    error: client.error ?? history.error,
    refresh: () => {
      if (currentProfileActor(cache))
        return Promise.all([client.refetch(), history.refetch()]);
    },
  };
}
