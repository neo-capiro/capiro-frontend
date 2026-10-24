"use client";

import { useEffect } from "react";
import { useCapiro } from "../../shared/capiro/CapiroBoundary";
import { useCapiroQuery } from "../../shared/capiro/queries";
import { BroadcastRecipientPanel } from "./BroadcastRecipientPanel";

const refreshKey = "capiro:broadcast-acknowledgment";

/** Mounted only in the authenticated data lifetime; identity replacement disposes reads and actions. */
export function BroadcastRecipient() {
  const api = useCapiro();
  const pending = useCapiroQuery("me.broadcasts.pending", {});
  const reload = pending.reload;
  useEffect(() => {
    const changed = (event: StorageEvent) => {
      if (event.key === refreshKey) reload();
    };
    const visible = () => {
      if (document.visibilityState === "visible") reload();
    };
    window.addEventListener("focus", reload);
    window.addEventListener("storage", changed);
    document.addEventListener("visibilitychange", visible);
    return () => {
      window.removeEventListener("focus", reload);
      window.removeEventListener("storage", changed);
      document.removeEventListener("visibilitychange", visible);
    };
  }, [reload]);
  return (
    <BroadcastRecipientPanel
      scope={api}
      items={pending.data ?? []}
      loading={pending.loading}
      error={pending.error}
      refresh={reload}
      acknowledge={(id, signal) =>
        api.request("me.broadcasts.acknowledge", { params: { id } }, { signal })
      }
      onAcknowledged={() => {
        reload();
        try {
          localStorage.setItem(refreshKey, String(Date.now()));
        } catch {
          // Storage may be disabled. Focus/visibility refresh still reconciles other tabs.
        }
      }}
    />
  );
}
