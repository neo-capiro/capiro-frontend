"use client";
import { useEffect } from "react";
import { useQueryClient, type QueryClient } from "@tanstack/react-query";

type Account = { tenantId: string; actorId: string };
const channelName = "meri-conversation-management-v1";
const eventName = "meri:conversation-management-changed";
function sameAccount(value: unknown, account: Account): boolean {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  return (
    Object.keys(v).length === 2 &&
    v.tenantId === account.tenantId &&
    v.actorId === account.actorId
  );
}
function invalidate(cache: QueryClient, account: Account) {
  void cache.invalidateQueries({
    queryKey: ["meri-owned-titles", account.tenantId, account.actorId],
  });
}
/** Invalidation carries no content and proves no outcome; every receiver fetches its own current Core receipt. */
export function useManagementRefresh(
  account: Account | undefined,
  enabled: boolean,
) {
  const cache = useQueryClient(),
    tenantId = account?.tenantId,
    actorId = account?.actorId;
  useEffect(() => {
    if (!enabled || !tenantId || !actorId) return;
    const scope = { tenantId, actorId };
    const local = (event: Event) => {
      if (event instanceof CustomEvent && sameAccount(event.detail, scope))
        invalidate(cache, scope);
    };
    const remote = (event: MessageEvent) => {
      if (sameAccount(event.data, scope)) invalidate(cache, scope);
    };
    let channel: BroadcastChannel | undefined;
    try {
      if (typeof BroadcastChannel !== "undefined") {
        channel = new BroadcastChannel(channelName);
        channel.addEventListener("message", remote);
      }
    } catch {
      /* Focus refresh remains available. */
    }
    window.addEventListener(eventName, local);
    return () => {
      window.removeEventListener(eventName, local);
      channel?.close();
    };
  }, [cache, tenantId, actorId, enabled]);
}
/** Called only after exact mutation receipt validation and successful journal retirement. */
export function announceManagementReceipt(account: Account) {
  window.dispatchEvent(new CustomEvent(eventName, { detail: account }));
  try {
    if (typeof BroadcastChannel !== "undefined") {
      const channel = new BroadcastChannel(channelName);
      channel.postMessage(account);
      channel.close();
    }
  } catch {
    /* Current tab and next focus still refresh. */
  }
}
