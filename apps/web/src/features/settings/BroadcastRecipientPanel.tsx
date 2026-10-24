"use client";

import type { OperationResponse } from "../../shared/capiro/contracts";
import type { broadcastOperations } from "../../shared/capiro/operations/settings-admin/broadcasts";
import { SettingsButton, SettingsCard, SettingsNotice } from "./components";
import { requireBroadcastAcknowledgment } from "./broadcast-receipt";
import { useSettingsAction } from "./useSettingsAction";

export type RecipientBroadcast = OperationResponse<
  (typeof broadcastOperations)["me.broadcasts.pending"]
>[number];

/** The host supplies the current authenticated pending read in Core's policy order. */
export function BroadcastRecipientPanel({
  items,
  loading,
  error,
  refresh,
  acknowledge,
  scope,
  onAcknowledged,
}: {
  items: readonly RecipientBroadcast[];
  loading: boolean;
  error?: Error;
  refresh: () => void;
  acknowledge: (id: string, signal: AbortSignal) => Promise<unknown>;
  scope: object;
  onAcknowledged?: () => void;
}) {
  const action = useSettingsAction(scope);
  const message = items[0];
  if (error)
    return (
      <SettingsNotice
        title="Workspace updates could not be loaded"
        error
        retry={refresh}
      >
        {error.message}
      </SettingsNotice>
    );
  if (loading || !message) return null;
  return (
    <section aria-label="Workspace updates">
      <SettingsCard title={message.title} description="Message from Capiro HQ">
        <p style={{ whiteSpace: "pre-wrap" }}>{message.body}</p>
        <p>
          {items.length > 1
            ? `${items.length} updates are waiting in this batch.`
            : "This update stays pending until you acknowledge it."}
        </p>
        <SettingsButton
          disabled={action.busy}
          onClick={() =>
            void action.run(
              async (signal) => {
                const receipt = await acknowledge(message.id, signal);
                signal.throwIfAborted();
                requireBroadcastAcknowledgment(message.id, receipt);
              },
              "Acknowledgment saved.",
              onAcknowledged ?? refresh,
            )
          }
        >
          {action.busy ? "Acknowledging…" : "Acknowledge update"}
        </SettingsButton>
        {action.error && (
          <SettingsNotice
            title="Acknowledgment not confirmed"
            error
            retry={refresh}
          >
            {action.error}
          </SettingsNotice>
        )}
      </SettingsCard>
    </section>
  );
}
