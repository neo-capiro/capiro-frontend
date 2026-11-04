"use client";
import { z } from "zod";
import {
  useQuery,
  useMutation,
  useQueryClient,
  useIsMutating,
} from "@tanstack/react-query";
import { useLayoutEffect, useRef } from "react";
import { useApi } from "@/shared/portfolio/api/provider";
import { useIdentity } from "@/shared/portfolio/auth/identity";
import { ApiError } from "@/shared/portfolio/api/http";
import { targetSchema, type GovernmentTarget } from "./target-contracts";
export const targetsKey = (clientId: string) => ["client-targets", clientId];
const base = (clientId: string) =>
  `clients/${encodeURIComponent(clientId)}/targets`;
export function useGovernmentTargets(clientId: string) {
  const api = useApi();
  return useQuery({
    queryKey: targetsKey(clientId),
    queryFn: ({ signal }) =>
      api.request(
        "core",
        base(clientId),
        z
          .array(targetSchema)
          .refine(
            (rows) => rows.every((row) => row.clientId === clientId),
            "Target client mismatch",
          ),
        { signal },
      ),
  });
}
type TargetWrite =
  | {
      kind: "add";
      memberId: string;
      sourceDirectory: GovernmentTarget["sourceDirectory"];
      source: "manual" | "meri";
    }
  | { kind: "tier"; memberId: string; targetId: string; tier: number | null }
  | { kind: "remove"; memberId: string; targetId: string };
const targetWriteIdentity = (write: TargetWrite | undefined) =>
  !write
    ? undefined
    : write.kind === "add"
      ? `${write.sourceDirectory}:${write.memberId}`
      : write.targetId;
export function useTargetMutation(
  clientId: string,
  onSaved?: () => void,
  targetId?: string,
) {
  const api = useApi();
  const cache = useQueryClient();
  const identity = useIdentity();
  const tenantId = identity.data?.tenant?.id ?? "";
  const userId = identity.data?.user.id ?? "";
  const mutationKey = ["client-target-write", clientId, tenantId, userId];
  const pendingTarget = useIsMutating({
    mutationKey,
    predicate: (entry) =>
      Boolean(targetId) &&
      targetWriteIdentity(entry.state.variables as TargetWrite | undefined) ===
        targetId,
  });
  const lifetime = useRef({ active: false });
  useLayoutEffect(() => {
    const scope = { active: true };
    lifetime.current = scope;
    return () => {
      scope.active = false;
    };
  }, [clientId, tenantId, userId, targetId]);
  const mutation = useMutation({
    mutationKey,
    retry: false,
    onMutate: () => lifetime.current,
    mutationFn: async (write: TargetWrite) => {
      if (!lifetime.current.active)
        throw new ApiError(409, "This target view is no longer current.");
      const targets = cache.getQueryState(targetsKey(clientId));
      if (
        targets?.status !== "success" ||
        targets.error ||
        targets.fetchStatus !== "idle"
      )
        throw new ApiError(
          409,
          "Read the current target list before changing it.",
        );
      if (
        cache.isMutating({
          mutationKey,
          predicate: (entry) =>
            targetWriteIdentity(
              entry.state.variables as TargetWrite | undefined,
            ) === targetWriteIdentity(write),
        }) > 1
      )
        throw new ApiError(
          409,
          "Wait for the current change to this target to finish.",
        );
      if (write.kind === "remove") {
        await api.request(
          "core",
          `${base(clientId)}/${encodeURIComponent(write.targetId)}`,
          z.object({ deleted: z.literal(true) }),
          { method: "DELETE" },
        );
        return;
      }
      const schema = targetSchema.refine(
        (row) =>
          row.clientId === clientId &&
          row.memberId === write.memberId &&
          (write.kind === "add" || row.id === write.targetId) &&
          (write.kind !== "add" ||
            row.sourceDirectory === write.sourceDirectory),
        "Target association mismatch",
      );
      if (write.kind === "tier")
        await api.request(
          "core",
          `${base(clientId)}/${encodeURIComponent(write.targetId)}/tier`,
          schema,
          {
            method: "PATCH",
            body: { tier: write.tier },
          },
        );
      else
        await api.request("core", base(clientId), schema, {
          method: "POST",
          body: {
            memberId: write.memberId,
            sourceDirectory: write.sourceDirectory,
            source: write.source,
          },
        });
    },
    onSuccess: async (_result, _write, scope) => {
      await cache.invalidateQueries({ queryKey: targetsKey(clientId) });
      await cache.invalidateQueries({
        queryKey: ["portfolio-depth", "client", clientId],
      });
      if (scope?.active) onSaved?.();
    },
  });
  return { ...mutation, isPending: mutation.isPending || pendingTarget > 0 };
}
