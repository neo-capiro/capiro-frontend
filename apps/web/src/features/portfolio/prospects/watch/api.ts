"use client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
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
 *   GET    prospects/:id/watch                 current watch + per-source health
 *   POST   prospects/:id/watch                 activate / re-activate ({ categories?, ownerUserId? })
 *   PATCH  prospects/:id/watch                 status / mute / categories / owner
 *   GET    prospects/:id/alerts                prospect-local inbox (keyset cursor)
 *   POST   prospects/:id/alerts/:alertId/read
 *   POST   prospects/:id/alerts/:alertId/dismiss
 *
 * Every route is behind Core's `BusinessDevelopmentWatchFlagGuard` on top of the class role guard, so a
 * disabled feature answers 404 and a missing delivery answers 403; both are surfaced, never hidden.
 */
const base = (prospectId: string) =>
  `business-development/prospects/${encodeURIComponent(prospectId)}`;

export const watchKey = (prospectId: string) =>
  ["prospect-watch", prospectId] as const;
export const alertsKey = (prospectId: string) =>
  ["prospect-alerts", prospectId] as const;

/** True when the feature is off (404) or this user has no access (403). */
export const refusalOf = (error: unknown) =>
  error instanceof ApiError && (error.status === 404 || error.status === 403)
    ? (error.status as 403 | 404)
    : null;

/** Plain transports: the hooks below are thin wrappers, and tests exercise these directly. */
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
  signal?: AbortSignal,
) {
  const page = await api.request(
    "core",
    `${base(prospectId)}/alerts?limit=25`,
    alertsPageSchema,
    { signal },
  );
  // Core returns only this prospect's alerts; a row for another prospect means the wrong inbox
  // answered, so nothing from that page is displayed.
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

export function useProspectWatch(prospectId: string) {
  const api = useApi();
  return useQuery({
    queryKey: watchKey(prospectId),
    retry: false,
    staleTime: 0,
    queryFn: ({ signal }) =>
      readWatch(api, prospectId, signal),
  });
}

export function useProspectAlerts(prospectId: string) {
  const api = useApi();
  return useQuery({
    queryKey: alertsKey(prospectId),
    retry: false,
    staleTime: 0,
    queryFn: ({ signal }) => readAlerts(api, prospectId, signal),
  });
}

export function useWatchActions(prospectId: string) {
  const api = useApi();
  const cache = useQueryClient();
  const refresh = async () => {
    await Promise.all([
      cache.invalidateQueries({ queryKey: watchKey(prospectId) }),
      cache.invalidateQueries({ queryKey: alertsKey(prospectId) }),
    ]);
  };
  const onSuccess = async (value: WatchResponse | AlertsPage) => {
    // Read back through the existing queries: no optimistic local watch/alert state is invented.
    void value;
    await refresh();
  };
  const activate = useMutation({
    mutationFn: (input: { categories?: string[] }) => activateWatch(api, prospectId, input),
    onSuccess,
  });
  const update = useMutation({
    mutationFn: (input: { status?: "active" | "paused" | "ended" }) =>
      updateWatch(api, prospectId, input),
    onSuccess,
  });
  const readAlert = useMutation({
    mutationFn: (alertId: string) => sendAlertRead(api, prospectId, alertId),
    onSuccess: () => refresh(),
  });
  const dismissAlert = useMutation({
    mutationFn: (alertId: string) => sendAlertDismiss(api, prospectId, alertId),
    onSuccess: () => refresh(),
  });
  return { activate, update, readAlert, dismissAlert, refresh };
}
