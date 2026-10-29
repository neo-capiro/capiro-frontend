"use client";
import { useEffect } from "react";
import {
  useCapiroMutation,
  useCapiroQuery,
} from "../../../shared/capiro/queries";
import { CapiroApiError } from "../../../shared/capiro/http";

/** Acknowledgements never optimistically alter unread rows. Both owner reads refresh after success. */
export function useMemoryNotificationActions(
  refresh: () => Promise<unknown>,
  onAccessLost: () => void,
) {
  const unread = useCapiroQuery("memory.notifications.unread", {});
  const one = useCapiroMutation("memory.notifications.read");
  const all = useCapiroMutation("memory.notifications.readAll");
  const refreshCount = unread.reload;
  const error = one.error ?? all.error ?? unread.error;
  useEffect(() => {
    if (error instanceof CapiroApiError && [401, 403].includes(error.status))
      onAccessLost();
  }, [error, onAccessLost]);
  async function markRead(id: string | null) {
    if (one.pending || all.pending || !unread.data?.enabled) return;
    try {
      if (id === null) await all.run({});
      else await one.run({ params: { id } });
      refreshCount();
      await refresh();
    } catch {
      /* The shared mutation retains the error; observed unread rows stay unchanged. */
    }
  }
  return {
    unread,
    pending: one.pending || all.pending,
    error: one.error ?? all.error,
    markRead,
    refreshCount,
  };
}
