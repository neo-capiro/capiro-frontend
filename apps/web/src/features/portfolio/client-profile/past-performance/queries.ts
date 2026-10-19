"use client";
import { z } from "zod";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useApi } from "@/shared/portfolio/api/provider";
import type { ApiClient } from "@/shared/portfolio/api/http";
import type { ClientWriter } from "@/shared/portfolio/auth/client-writer";
import { assertProfileActor, useProfileActor } from "../profile-access";
import { submissionSchema } from "./contracts";
export const submissionKey = (
  clientId: string,
  actor?: ClientWriter & { role?: string },
) =>
  [
    "client-submissions",
    clientId,
    actor?.tenantId ?? "",
    actor?.userId ?? "",
    actor?.role ?? "",
  ] as const;
export const submissionListSchema = (clientId: string, tenantId: string) =>
  z
    .array(submissionSchema)
    .max(200)
    .refine(
      (rows) =>
        rows.every(
          (row) => row.clientId === clientId && row.tenantId === tenantId,
        ) && new Set(rows.map((row) => row.id)).size === rows.length,
    );
export function loadSubmissions(
  api: ApiClient,
  clientId: string,
  tenantId: string,
  signal?: AbortSignal,
) {
  return api.request(
    "core",
    `clients/${encodeURIComponent(clientId)}/submission-history`,
    submissionListSchema(clientId, tenantId),
    { signal },
  );
}
export function useSubmissions(clientId: string) {
  const cache = useQueryClient();
  const api = useApi();
  const actor = useProfileActor();
  return useQuery({
    queryKey: submissionKey(clientId, actor),
    enabled: Boolean(actor),
    retry: false,
    refetchOnMount: "always",
    queryFn: async ({ signal }) => {
      if (!actor) throw new Error("Sign in to view saved submissions.");
      assertProfileActor(cache, actor);
      const rows = await loadSubmissions(api, clientId, actor.tenantId, signal);
      signal.throwIfAborted();
      assertProfileActor(cache, actor);
      return rows;
    },
  });
}
