"use client";
import { useState } from "react";
import { useCapiro } from "../capiro/CapiroBoundary";
import { startImpersonationSchema } from "../capiro/operations/settings-admin/impersonation";
import {
  acknowledgeRecovery,
  reserveRecovery,
} from "../session/recovery/journal";
import { useRetainedIntent } from "../session/recovery/useRetainedIntent";
import { notifyImpersonationChange } from "./context";

const contract = {
  schema: startImpersonationSchema,
  requestId: (value: { requestId: string }) => value.requestId,
};
export function useImpersonationStart(identity: string) {
  const api = useCapiro();
  const scope = `hq-impersonation:${identity}`;
  const retained = useRetainedIntent(scope, contract, async (signal, guard) => {
    const me = await api.request("me.read", {}, { signal });
    guard();
    if (me.role !== "capiro_admin")
      throw Error("Current HQ access is required.");
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const start = async (tenantId: string, reason: string) => {
    if (busy || !retained.ready) return;
    setBusy(true);
    setError(undefined);
    try {
      await retained.verify();
      const requestId = crypto.randomUUID();
      const saved = await reserveRecovery(
        scope,
        requestId,
        { requestId, tenantId, reason: reason.trim() },
        contract,
        retained.guard,
      );
      retained.install(saved);
      if (saved.tenantId !== tenantId || saved.reason !== reason.trim())
        throw Error(
          "Recover the original support request before choosing another tenant or reason.",
        );
      const result = await api.request(
        "settings.hq.impersonation.start",
        { body: saved },
        { signal: retained.signal() },
      );
      retained.guard();
      if (
        result.sessionId !== saved.requestId ||
        result.tenantId !== saved.tenantId ||
        result.reason !== saved.reason.trim()
      )
        throw Error("The response did not match the original support session.");
      await acknowledgeRecovery(scope, saved.requestId, retained.guard);
      retained.install(null);
      notifyImpersonationChange();
    } catch (cause) {
      try {
        retained.guard();
        setError(
          cause instanceof Error
            ? cause.message
            : "Support session could not be started. Retry the original request.",
        );
      } catch {
        /* retired scope */
      }
    } finally {
      setBusy(false);
    }
  };
  return {
    start,
    busy,
    ready: retained.ready && !retained.record,
    error: error ?? retained.error,
    pending: retained.record,
    retryRecovery: retained.retry,
  };
}
