"use client";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useApi } from "@/shared/portfolio/api/provider";
import { identitySchema } from "@/shared/portfolio/auth/identity";
import { useRetainedIntent } from "@/shared/session/recovery/useRetainedIntent";
import { refreshRecoveryContract } from "./contracts";
import {
  runRefresh,
  refreshJournalScope,
  type RefreshAction,
} from "./recovery";
import type { RefreshScope, readRefreshResult } from "./api";
import { briefKey } from "../hooks";
export function useBriefRefresh(scope: RefreshScope) {
  const api = useApi(),
    cache = useQueryClient();
  const [result, setResult] = useState<Awaited<
    ReturnType<typeof readRefreshResult>
  > | null>(null);
  const [error, setError] = useState<string>(),
    [busy, setBusy] = useState(false);
  const retained = useRetainedIntent(
    refreshJournalScope(scope),
    refreshRecoveryContract,
    async (signal, guard) => {
      const me = await api.request("core", "me", identitySchema, { signal });
      guard();
      if (me.tenant?.id !== scope.tenantId || me.user.id !== scope.userId)
        throw Error("The signed-in account changed.");
    },
  );
  const run = async (action: RefreshAction) => {
    if (busy) return;
    setBusy(true);
    setError(undefined);
    try {
      await retained.verify();
      const value = await runRefresh(
        api,
        scope,
        action,
        retained.guard,
        retained.signal(),
        retained.install,
      );
      retained.guard();
      setResult(value);
      if (value?.acceptedVersion)
        await Promise.all([
          cache.invalidateQueries({ queryKey: briefKey(scope) }),
          cache.invalidateQueries({
            queryKey: [
              "prospect-brief-history",
              scope.tenantId,
              scope.prospectId,
            ],
          }),
          cache.invalidateQueries({
            queryKey: ["prospect-history", scope.prospectId],
          }),
        ]);
    } catch (cause) {
      try {
        retained.guard();
        setResult(null);
        setError(
          cause instanceof Error
            ? cause.message
            : "Refresh status is unknown. Check the original request.",
        );
      } catch {
        /* context closed */
      }
    } finally {
      try {
        retained.guard();
        setBusy(false);
      } catch {
        /* context closed */
      }
    }
  };
  return {
    run,
    result,
    error: error ?? retained.error,
    busy,
    ready: retained.ready,
    attempt: retained.record,
    retryRecovery: retained.retry,
  };
}
