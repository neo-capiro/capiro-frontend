"use client";
import { useCallback, useEffect, useState } from "react";
import { createCapiroApi } from "../../../shared/capiro/http";
import { capiroOperations } from "../../../shared/capiro/registry";
import { quickActionGate, type QuickActionGate } from "./quick-action-gate";

const api = createCapiroApi(capiroOperations);

/**
 * One rollout read, bound to the tenant it was requested for.
 *
 * There is deliberately NO cross-mount cache: a cached "on" would keep admitting gated skills while
 * a fresh read was pending, which is the defect this hook had. Every answer is also stamped with its
 * key, so a render for a different tenant (or for no tenant) can never derive admission from the
 * previous tenant's answer, even before the effect for the new key has run.
 */
export type QuickActionCatalogState =
  | { key: null; status: "idle" }
  | { key: string; status: "loading" }
  | { key: string; status: "loaded"; enabled: boolean; ids: readonly string[] }
  | { key: string; status: "failed" };

export const initialCatalogState: QuickActionCatalogState = {
  key: null,
  status: "idle",
};

/** Admission derived synchronously from the current key; a mismatch is always "loading". */
export function catalogGate(
  state: QuickActionCatalogState,
  key: string | null,
): QuickActionGate {
  if (!key || state.key !== key) return quickActionGate({ pending: true, failed: false });
  if (state.status === "loaded")
    return quickActionGate({
      pending: false,
      failed: false,
      enabled: state.enabled,
      ids: state.ids,
    });
  if (state.status === "failed") return quickActionGate({ pending: false, failed: true });
  return quickActionGate({ pending: true, failed: false });
}

/**
 * Apply one response only when it still belongs to the current key. A late answer for a previous
 * tenant (or for a request already superseded) returns null and must be dropped.
 */
export function applyCatalogAnswer(
  state: QuickActionCatalogState,
  key: string | null,
  answer: { ok: true; enabled: boolean; ids: readonly string[] } | { ok: false },
): QuickActionCatalogState | null {
  if (!key || state.key !== key || state.status !== "loading") return null;
  return answer.ok
    ? { key, status: "loaded", enabled: answer.enabled, ids: answer.ids }
    : { key, status: "failed" };
}

/**
 * Current Core QuickActions rollout for this tenant.
 *
 * The read rides the existing same-origin `/api/capiro/<operation>` gateway, so the reviewed capiro
 * session token and Core's `standard_user` guard are unchanged. It does not use the shared
 * react-query client because the composer also renders in hosts that mount no provider; the hook
 * owns its own abort/lifetime instead. Each mount, key change and explicit refresh marks the read
 * pending immediately, so nothing cached can grant admission while a new answer is outstanding.
 */
export function useQuickActionCatalog(tenantId: string | null | undefined): {
  gate: QuickActionGate;
  refresh: () => void;
} {
  const key = tenantId ?? null;
  const [state, setState] = useState<QuickActionCatalogState>(initialCatalogState);
  const [nonce, setNonce] = useState(0);

  useEffect(() => {
    if (!key) {
      setState(initialCatalogState);
      return;
    }
    setState({ key, status: "loading" });
    const controller = new AbortController();
    void (async () => {
      try {
        const response = await api.request(
          "meri.quickActions.list",
          {},
          { signal: controller.signal },
        );
        if (controller.signal.aborted) return;
        setState((current) =>
          applyCatalogAnswer(current, key, {
            ok: true,
            enabled: response.enabled,
            ids: response.skills.map((row) => row.id),
          }) ?? current,
        );
      } catch {
        if (controller.signal.aborted) return;
        setState(
          (current) => applyCatalogAnswer(current, key, { ok: false }) ?? current,
        );
      }
    })();
    return () => controller.abort();
  }, [key, nonce]);

  const refresh = useCallback(() => {
    if (!key) return;
    // An explicit refresh re-enters the pending state; the old answer cannot admit in the meantime.
    setState({ key, status: "loading" });
    setNonce((value) => value + 1);
  }, [key]);

  return { gate: catalogGate(state, key), refresh };
}
