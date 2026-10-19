"use client";
import { z } from "zod";
import { useQuery } from "@tanstack/react-query";
import { useApi } from "@/shared/portfolio/api/provider";
import { ApiError, type ApiClient } from "@/shared/portfolio/api/http";
import { useAdvocacyAccess } from "./access";
import {
  currentAdvocacyActor,
  currentAdvocacyRead,
  useAdvocacyRevision,
} from "./read-state";
import {
  matterSchema,
  matterDetailSchema,
  timelineEntrySchema,
} from "./contracts";
export const advocacyPath = (clientId: string) =>
  `clients/${encodeURIComponent(clientId)}/advocacy-matters`;
export const matterKey = (clientId: string, id: string | null) =>
  ["advocacy", clientId, "matter", id] as const;
export const timelineKey = (clientId: string) =>
  ["advocacy", clientId, "timeline"] as const;
export async function loadMatters(
  api: ApiClient,
  clientId: string,
  signal?: AbortSignal,
) {
  const rows = await api.request(
    "core",
    advocacyPath(clientId),
    z.array(matterSchema),
    { signal },
  );
  if (new Set(rows.map((row) => row.id)).size !== rows.length)
    throw new ApiError(502, "The matter list returned duplicate identities.");
  return rows;
}
export async function loadMatter(
  api: ApiClient,
  clientId: string,
  id: string,
  signal?: AbortSignal,
) {
  const result = await api.request(
    "core",
    `${advocacyPath(clientId)}/${encodeURIComponent(id)}`,
    matterDetailSchema,
    { signal },
  );
  if (
    result.id !== id ||
    new Set(result.records.map((row) => row.id)).size !== result.records.length
  )
    throw new ApiError(
      502,
      "The service returned an unexpected matter identity.",
    );
  return result;
}
export async function loadTimeline(
  api: ApiClient,
  clientId: string,
  signal?: AbortSignal,
) {
  const rows = await api.request(
    "core",
    `${advocacyPath(clientId)}/timeline`,
    z.array(timelineEntrySchema).max(500),
    { signal },
  );
  if (new Set(rows.map((row) => `${row.kind}:${row.id}`)).size !== rows.length)
    throw new ApiError(
      502,
      "The timeline returned duplicate event identities.",
    );
  return rows;
}
export const mattersKey = (clientId: string) =>
  ["advocacy", clientId, "matters"] as const;
export function useMatters(clientId: string, enabled = true) {
  const api = useApi();
  const { identity, canRead } = useAdvocacyAccess();
  const cache = useAdvocacyRevision(clientId);
  const key = [
    ...mattersKey(clientId),
    identity.data?.tenant?.id,
    identity.data?.user.id,
  ];
  const query = useQuery({
    queryKey: key,
    enabled: enabled && canRead,
    queryFn: ({ signal }) => loadMatters(api, clientId, signal),
  });
  const isCurrent =
    Boolean(currentAdvocacyActor(cache)) && currentAdvocacyRead(cache, key);
  return { ...query, data: isCurrent ? query.data : undefined, isCurrent };
}
export function useMatter(clientId: string, id: string | null, enabled = true) {
  const api = useApi();
  const { identity, canRead } = useAdvocacyAccess();
  const cache = useAdvocacyRevision(clientId);
  const key = [
    ...matterKey(clientId, id),
    identity.data?.tenant?.id,
    identity.data?.user.id,
  ];
  const query = useQuery({
    queryKey: key,
    enabled: Boolean(id) && enabled && canRead,
    queryFn: ({ signal }) => {
      if (!id) throw new ApiError(400, "Select a matter.");
      return loadMatter(api, clientId, id, signal);
    },
  });
  const isCurrent =
    Boolean(currentAdvocacyActor(cache)) && currentAdvocacyRead(cache, key);
  return { ...query, data: isCurrent ? query.data : undefined, isCurrent };
}
export function useAdvocacyTimeline(clientId: string, enabled: boolean) {
  const api = useApi();
  const { identity, canRead } = useAdvocacyAccess();
  const cache = useAdvocacyRevision(clientId);
  const key = [
    ...timelineKey(clientId),
    identity.data?.tenant?.id,
    identity.data?.user.id,
  ];
  const query = useQuery({
    queryKey: key,
    enabled: enabled && canRead,
    queryFn: ({ signal }) => loadTimeline(api, clientId, signal),
  });
  const isCurrent =
    Boolean(currentAdvocacyActor(cache)) && currentAdvocacyRead(cache, key);
  return { ...query, data: isCurrent ? query.data : undefined, isCurrent };
}
