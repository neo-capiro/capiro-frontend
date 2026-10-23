"use client";
import { useMemo } from "react";
import { useAuth } from "@clerk/nextjs";
import { useCapiro } from "../../shared/capiro/CapiroBoundary";
import type { CapiroApi } from "../../shared/capiro/http";
import { capiroOperations } from "../../shared/capiro/registry";
import { reconcileSettingsWrite } from "./security-write-reconciliation";
import { uncertainSettingsWrite } from "./security-writes";
import { executeSettingsWrite } from "./settings-write-execution";
import { useSettingsAction } from "./useSettingsAction";
import { useSettingsWriteJournal } from "./useSettingsWriteJournal";

type Api = CapiroApi<typeof capiroOperations>;
/** Compose current authority, the scoped journal and the one-dispatch Settings owner. */
export function useSettingsMutation(section: string, subjectId?: string) {
  const raw = useCapiro();
  const { userId, sessionId, orgId } = useAuth();
  const storageKey = `capiro:settings-write:v1:${JSON.stringify([userId, sessionId, orgId, section])}`;
  const scope = useMemo(
    () => ({ raw, section, storageKey }),
    [raw, section, storageKey],
  );
  const action = useSettingsAction(scope);
  const { journal, pending } = useSettingsWriteJournal(storageKey);
  const api = useMemo<Api>(
    () => ({
      ...raw,
      request: (operation, input, options) => {
        if (capiroOperations[operation].method === "GET")
          return raw.request(operation, input, options);
        return executeSettingsWrite(
          { api: raw, journal, verified: !!userId && !!sessionId, subjectId },
          operation,
          input,
          options?.signal,
          (captured) => raw.request(operation, captured, options),
        );
      },
    }),
    [raw, journal, userId, sessionId, subjectId],
  );
  const reconcile = () =>
    action.run(async (signal) => {
      const write = journal.current();
      if (!write || !(await reconcileSettingsWrite(raw, write, signal)))
        throw new Error(uncertainSettingsWrite);
      signal.throwIfAborted();
      journal.clear(write);
    }, "The recorded target now has the requested state. Review it before making another change.");
  return { api, action, pending, reconcile, locked: action.busy || !!pending };
}
