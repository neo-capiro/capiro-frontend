"use client";
import { useCallback, useEffect, useState } from "react";
import { createCapiroApi } from "../../../shared/capiro/http";
import { capiroOperations } from "../../../shared/capiro/registry";
import { quickActionGate, type QuickActionGate } from "./quick-action-gate";

const api = createCapiroApi(capiroOperations);

type Read = { tenantId: string; enabled: boolean; ids: readonly string[] };
/**
 * Last confirmed read per tenant. The composer remounts with the conversation, so a remount
 * (including an ordinary reload) re-reads the rollout instead of carrying a stale answer; the cache
 * only avoids a flash of "loading" inside one tenant and is never shared across tenants.
 */
const confirmed = new Map<string, Read>();

/**
 * Current Core QuickActions rollout for this tenant.
 *
 * The read rides the existing same-origin `/api/capiro/<operation>` gateway, so the reviewed capiro
 * session token and Core's `standard_user` guard are unchanged. It deliberately does not use the
 * shared react-query client: the composer also renders in hosts that mount no provider (and in the
 * existing composer-lifetime seams), so this hook owns its own abort/refresh instead of changing
 * that mount contract.
 */
export function useQuickActionCatalog(tenantId: string | null | undefined): {
  gate: QuickActionGate;
  refresh: () => void;
} {
  const key = tenantId ?? null;
  const [read, setRead] = useState<Read | null>(() =>
    key ? (confirmed.get(key) ?? null) : null,
  );
  const [state, setState] = useState<"idle" | "loading" | "failed">(
    key && confirmed.has(key) ? "idle" : "loading",
  );
  const [nonce, setNonce] = useState(0);

  useEffect(() => {
    if (!key) {
      setRead(null);
      setState("loading");
      return;
    }
    const cached = confirmed.get(key);
    setRead(cached ?? null);
    setState(cached ? "idle" : "loading");
    const controller = new AbortController();
    void (async () => {
      try {
        const response = await api.request(
          "meri.quickActions.list",
          {},
          { signal: controller.signal },
        );
        if (controller.signal.aborted) return;
        const next: Read = {
          tenantId: key,
          enabled: response.enabled,
          ids: response.skills.map((row) => row.id),
        };
        confirmed.set(key, next);
        setRead(next);
        setState("idle");
      } catch {
        if (controller.signal.aborted) return;
        // A failed read must never leave an earlier tenant's answer live.
        confirmed.delete(key);
        setRead(null);
        setState("failed");
      }
    })();
    return () => controller.abort();
  }, [key, nonce]);

  const refresh = useCallback(() => setNonce((value) => value + 1), []);

  return {
    gate: quickActionGate({
      pending: Boolean(key) && state === "loading",
      failed: Boolean(key) && state === "failed",
      enabled: read?.enabled,
      ids: read?.ids,
    }),
    refresh,
  };
}
