"use client";
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { QueryClient } from "@tanstack/react-query";
import { useApi } from "@/shared/portfolio/api/provider";
import { ApiError, type ApiClient } from "@/shared/portfolio/api/http";
import {
  alertsPageSchema,
  dismissReceiptSchema,
  readReceiptSchema,
  watchResponseSchema,
  type AlertsPage,
  type WatchResponse,
} from "./contracts";

/**
 * Prospect watch transport — the existing Core owner, no new endpoint.
 *
 *   GET    prospects/:id/watch?                 current watch + per-source health
 *   POST   prospects/:id/watch                  activate / re-activate ({ categories?, ownerUserId? })
 *   PATCH  prospects/:id/watch                  status / mute / categories / owner
 *   GET    prospects/:id/alerts?limit&cursor    prospect inbox, keyset paginated by Core
 *   POST   prospects/:id/alerts/:alertId/read
 *   POST   prospects/:id/alerts/:alertId/dismiss
 *
 * Every route is behind Core's `BusinessDevelopmentWatchFlagGuard` on top of the class role guard, so the
 * feature can answer 404 (guard off, missing/foreign prospect, or no such route) and a missing in-app
 * delivery answers 403. Both are surfaced exactly as received; the client never invents a cause.
 *
 * Mutations are idempotent on Core's side (activate/update no-op on their own state, read/dismiss are
 * timestamp writes). A lost acknowledgement is therefore recoverable by re-reading: `runWatchAction` always
 * re-reads after the attempt and reports what the server now says instead of claiming a refusal.
 */
const base = (prospectId: string) =>
  `business-development/prospects/${encodeURIComponent(prospectId)}`;

export const watchKey = (prospectId: string) => ["prospect-watch", prospectId] as const;
export const alertsKey = (prospectId: string) => ["prospect-alerts", prospectId] as const;

/** Feature/access refusal (definitive) versus an outcome we could not observe. */
export const refusalOf = (error: unknown) =>
  error instanceof ApiError && (error.status === 403 || error.status === 404)
    ? (error.status as 403 | 404)
    : null;

export type Outcome =
  | { kind: "committed"; readback: WatchResponse | AlertsPage }
  | { kind: "refused"; status: 403 | 404 }
  | { kind: "unconfirmed"; readback: WatchResponse | AlertsPage | null };

/* ------------------------------------------------------------------ transports */

export const readWatch = (api: ApiClient, prospectId: string, signal?: AbortSignal) =>
  api.request("core", `${base(prospectId)}/watch`, watchResponseSchema, { signal });

export const activateWatch = (
  api: ApiClient,
  prospectId: string,
  input: { categories?: string[] } = {},
) =>
  api.request("core", `${base(prospectId)}/watch`, watchResponseSchema, {
    method: "POST",
    body: input,
  });

export const updateWatch = (
  api: ApiClient,
  prospectId: string,
  input: { status?: "active" | "paused" | "ended" },
) =>
  api.request("core", `${base(prospectId)}/watch`, watchResponseSchema, {
    method: "PATCH",
    body: input,
  });

export async function readAlerts(
  api: ApiClient,
  prospectId: string,
  cursor?: string | null,
  signal?: AbortSignal,
) {
  const query = new URLSearchParams({ limit: "25" });
  if (cursor) query.set("cursor", cursor);
  const page = await api.request(
    "core",
    `${base(prospectId)}/alerts?${query.toString()}`,
    alertsPageSchema,
    { signal },
  );
  // Core pages only this prospect's alerts; a row for another prospect means the wrong inbox
  // answered, so that page is refused rather than displayed.
  if (page.items.some((item) => item.prospectId && item.prospectId !== prospectId))
    throw new ApiError(502, "The alert service returned another prospect's inbox.");
  return page;
}

export const sendAlertRead = (api: ApiClient, prospectId: string, alertId: string) =>
  api.request(
    "core",
    `${base(prospectId)}/alerts/${encodeURIComponent(alertId)}/read`,
    readReceiptSchema,
    { method: "POST" },
  );

export const sendAlertDismiss = (api: ApiClient, prospectId: string, alertId: string) =>
  api.request(
    "core",
    `${base(prospectId)}/alerts/${encodeURIComponent(alertId)}/dismiss`,
    dismissReceiptSchema,
    { method: "POST" },
  );

/* ------------------------------------------------------- query/mutation options */

/** The watch query, as a factory so the same request feeds hooks and bounded reconciliation reads. */
export const watchQueryOptions = (api: ApiClient, prospectId: string) => ({
  queryKey: watchKey(prospectId),
  retry: false as const,
  staleTime: 0,
  queryFn: ({ signal }: { signal?: AbortSignal }) => readWatch(api, prospectId, signal),
});

/** One alert page; the cursor is part of the page identity, so pages cannot be reused across prospects. */
export const alertsQueryOptions = (
  api: ApiClient,
  prospectId: string,
  cursor: string | null,
) => ({
  queryKey: [...alertsKey(prospectId), cursor ?? "first"] as const,
  retry: false as const,
  staleTime: 0,
  queryFn: ({ signal }: { signal?: AbortSignal }) =>
    readAlerts(api, prospectId, cursor, signal),
});

/** The paged inbox as react-query infinite options — one definition for the hook and the tests. */
export const alertsInfiniteOptions = (api: ApiClient, prospectId: string) => ({
  queryKey: alertsKey(prospectId),
  initialPageParam: null as string | null,
  queryFn: ({ pageParam, signal }: { pageParam: string | null; signal?: AbortSignal }) =>
    readAlerts(api, prospectId, pageParam, signal),
  getNextPageParam: (last: AlertsPage) => last.nextCursor ?? undefined,
  retry: false as const,
  staleTime: 0,
});

export type WatchAction =
  | { type: "start" }
  | { type: "status"; status: "active" | "paused" | "ended" }
  | { type: "read"; alertId: string }
  | { type: "dismiss"; alertId: string };

const perform = (api: ApiClient, prospectId: string, action: WatchAction) => {
  switch (action.type) {
    case "start":
      return activateWatch(api, prospectId, {});
    case "status":
      return updateWatch(api, prospectId, { status: action.status });
    case "read":
      return sendAlertRead(api, prospectId, action.alertId);
    case "dismiss":
      return sendAlertDismiss(api, prospectId, action.alertId);
  }
};

/**
 * Run one watch action and reconcile the outcome against current server state.
 *
 * `committed`  — the response arrived and the re-read confirms it.
 * `refused`    — Core answered 403/404: a definitive refusal, nothing changed.
 * `unconfirmed`— the response was lost or unreadable. The re-read decides: if it succeeds the cache now
 *                holds the committed state (`readback` set, displayed as fact); if the re-read also fails
 *                the caller must offer Retry instead of re-sending blindly.
 *
 * Only one bounded re-read per action; no journal, no exactly-once claim.
 */
export async function runWatchAction(
  api: ApiClient,
  cache: QueryClient,
  prospectId: string,
  action: WatchAction,
): Promise<Outcome> {
  try {
    await perform(api, prospectId, action);
  } catch (error) {
    const status = refusalOf(error);
    if (status) return { kind: "refused", status };
    // Unknown transport/server/parse outcome: re-read before saying anything about the change.
    return { kind: "unconfirmed", readback: await readback(api, cache, prospectId) };
  }
  const readbackValue = await readback(api, cache, prospectId);
  return { kind: "committed", readback: readbackValue ?? (await readWatch(api, prospectId)) };
}

/** Re-read watch and the first alert page into the cache; null when either read fails. */
async function readback(api: ApiClient, cache: QueryClient, prospectId: string) {
  try {
    const [watch, alerts] = await Promise.all([
      cache.fetchQuery(watchQueryOptions(api, prospectId)),
      cache.fetchQuery(alertsQueryOptions(api, prospectId, null)),
    ]);
    await cache.invalidateQueries({ queryKey: alertsKey(prospectId) });
    void alerts;
    return watch;
  } catch {
    return null;
  }
}

/* ----------------------------------------------------------------------- hooks */

export function useProspectWatch(prospectId: string) {
  const api = useApi();
  return useQuery(watchQueryOptions(api, prospectId));
}

/** Cursor-paged prospect inbox: the next page comes from the cursor Core returned. */
export function useProspectAlerts(prospectId: string) {
  const api = useApi();
  return useInfiniteQuery(alertsInfiniteOptions(api, prospectId));
}

export function useWatchActions(prospectId: string, onOutcome: (outcome: Outcome) => void) {
  const api = useApi();
  const cache = useQueryClient();
  const mutation = useMutation({
    mutationFn: (action: WatchAction) => runWatchAction(api, cache, prospectId, action),
    onSuccess: async (outcome) => {
      onOutcome(outcome);
      // A refused action changes nothing; every other outcome has already been re-read.
      if (outcome.kind === "refused")
        await cache.invalidateQueries({ queryKey: alertsKey(prospectId) });
    },
  });
  const retryReadback = async () => {
    const value = await readback(api, cache, prospectId);
    onOutcome({ kind: "unconfirmed", readback: value });
    return value !== null;
  };
  return { run: mutation.mutate, reset: mutation.reset, isPending: mutation.isPending, retryReadback };
}
