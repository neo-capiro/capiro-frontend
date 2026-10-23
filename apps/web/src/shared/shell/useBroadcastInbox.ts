"use client";
import { useAuth } from "@clerk/nextjs";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { useCapiro } from "../capiro/CapiroBoundary";
import { useCapiroQuery } from "../capiro/queries";
import { CapiroApiError } from "../capiro/http";
import {
  clearBroadcastAttempt,
  readBroadcastAttempt,
  requireBroadcastReceipt,
  retainBroadcastAttempt,
} from "./broadcast-receipts";

/** Recipient state is scoped by the signed-in shell; dismissal never dispatches. */
export function useBroadcastInbox() {
  const api = useCapiro();
  const { userId, sessionId, orgId } = useAuth();
  const key = `capiro:broadcast-ack:v1:${JSON.stringify([userId, sessionId, orgId])}`;
  const refreshKey = `capiro:broadcast-refresh:v1:${JSON.stringify([userId, orgId])}`;
  const query = useCapiroQuery("me.broadcasts.pending", {});
  const [pendingId, setPendingId] = useState<string>();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const [message, setMessage] = useState<string>();
  const active = useRef<AbortController | null>(null);
  const [scope, setScope] = useState({ api, key });
  if (scope.api !== api || scope.key !== key) {
    setScope({ api, key });
    setPendingId(undefined);
    setBusy(false);
    setError(undefined);
    setMessage(undefined);
  }
  const { reload } = query;
  const restored = useSyncExternalStore(
    () => () => {},
    () => {
      try {
        return readBroadcastAttempt(sessionStorage, key)?.broadcastId ?? "";
      } catch {
        return "unreadable";
      }
    },
    () => undefined,
  );
  useEffect(() => {
    const onStorage = (event: StorageEvent) => {
      if (event.key === refreshKey) reload();
    };
    const onVisible = () => {
      if (document.visibilityState === "visible") reload();
    };
    window.addEventListener("focus", reload);
    window.addEventListener("storage", onStorage);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      active.current?.abort();
      active.current = null;
      window.removeEventListener("focus", reload);
      window.removeEventListener("storage", onStorage);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [api, key, refreshKey, reload]);

  async function acknowledge(id: string) {
    if (active.current || !userId || !sessionId) return;
    const controller = new AbortController();
    active.current = controller;
    setBusy(true);
    setError(undefined);
    setMessage(undefined);
    let dispatched = false;
    try {
      const retained = readBroadcastAttempt(sessionStorage, key);
      if (retained && retained.broadcastId !== id)
        throw new Error(
          "Resolve the retained notice before acknowledging another.",
        );
      retainBroadcastAttempt(sessionStorage, key, id);
      setPendingId(id);
      controller.signal.throwIfAborted();
      dispatched = true;
      const result = await api.request(
        "me.broadcasts.acknowledge",
        { params: { id } },
        { signal: controller.signal },
      );
      const receipt = requireBroadcastReceipt(id, result);
      controller.signal.throwIfAborted();
      clearBroadcastAttempt(sessionStorage, key, id);
      setPendingId(undefined);
      setMessage(
        `Acknowledged ${new Date(receipt.acknowledgedAt).toLocaleString()}.`,
      );
      reload();
      try {
        localStorage.setItem(refreshKey, crypto.randomUUID());
      } catch {
        /* Focus refresh remains available. */
      }
    } catch (cause) {
      if (controller.signal.aborted) return;
      if (
        dispatched &&
        cause instanceof CapiroApiError &&
        [400, 401, 403, 404, 409, 422].includes(cause.status)
      ) {
        try {
          clearBroadcastAttempt(sessionStorage, key, id);
          setPendingId(undefined);
        } catch {
          setError(
            "The acknowledgement was rejected, but its recovery record could not be cleared. Refresh this view before taking further action.",
          );
          reload();
          return;
        }
        reload();
      }
      setError(
        cause instanceof Error
          ? cause.message
          : "Acknowledgement could not be confirmed.",
      );
    } finally {
      if (active.current === controller) active.current = null;
      if (!controller.signal.aborted) setBusy(false);
    }
  }
  return {
    query,
    pendingId:
      pendingId ??
      (restored && restored !== "unreadable" ? restored : undefined),
    busy: busy || restored === undefined,
    error:
      error ??
      (restored === "unreadable"
        ? "The retained acknowledgement could not be read. No acknowledgement will be sent from this view."
        : undefined),
    message,
    acknowledge,
  };
}
