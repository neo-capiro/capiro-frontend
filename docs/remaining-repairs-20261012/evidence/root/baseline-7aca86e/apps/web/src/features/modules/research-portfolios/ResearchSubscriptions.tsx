"use client";
import { useState } from "react";
import { useCapiro } from "../../../shared/capiro/CapiroBoundary";
import { useCapiroQuery } from "../../../shared/capiro/queries";
import {
  ActionButton,
  DataTable,
  Panel,
  StatusPanel,
} from "../../../shared/module-ui";
import styles from "./research.module.css";
export function ResearchSubscriptions({ id }: { id: string }) {
  const api = useCapiro();
  const [channel, setChannel] = useState<"in_app" | "email">("in_app");
  const [cadence, setCadence] = useState<"immediate" | "daily" | "weekly">(
    "daily",
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const query = useCapiroQuery("research.subscriptions", { params: { id } });
  async function run(action: () => Promise<unknown>) {
    setBusy(true);
    setError(undefined);
    try {
      await action();
      query.reload();
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Could not update subscription",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <Panel title="Subscriptions">
      <StatusPanel
        loading={query.loading}
        error={query.error || error}
        onRetry={query.reload}
      >
        <DataTable
          rows={query.data || []}
          rowKey={(r) => r.id}
          caption="Research subscriptions"
          columns={[
            { key: "target", label: "Target", render: (r) => r.targetKind },
            { key: "channel", label: "Channel", render: (r) => r.channel },
            { key: "cadence", label: "Cadence", render: (r) => r.cadence },
            {
              key: "state",
              label: "State",
              render: (r) => (r.active ? "Active" : "Paused"),
            },
            {
              key: "action",
              label: "Action",
              render: (r) => (
                <ActionButton
                  disabled={busy}
                  onClick={() =>
                    run(() =>
                      api.request("research.subscriptions.update", {
                        params: { id, subscriptionId: r.id },
                        body: { active: !r.active },
                      }),
                    )
                  }
                >
                  {r.active ? "Pause" : "Resume"}
                </ActionButton>
              ),
            },
          ]}
        />
        <div className={styles.actions}>
          <select
            className={styles.select}
            aria-label="Subscription channel"
            value={channel}
            onChange={(e) => setChannel(e.target.value as typeof channel)}
          >
            <option value="in_app">In app</option>
            <option value="email">Email</option>
          </select>
          <select
            className={styles.select}
            aria-label="Subscription cadence"
            value={cadence}
            onChange={(e) => setCadence(e.target.value as typeof cadence)}
          >
            {["immediate", "daily", "weekly"].map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
          <ActionButton
            primary
            disabled={busy}
            onClick={() =>
              run(() =>
                api.request("research.subscriptions.create", {
                  params: { id },
                  body: {
                    targetKind: "portfolio",
                    targetId: id,
                    channel,
                    cadence,
                  },
                }),
              )
            }
          >
            Subscribe to portfolio
          </ActionButton>
        </div>
      </StatusPanel>
    </Panel>
  );
}
