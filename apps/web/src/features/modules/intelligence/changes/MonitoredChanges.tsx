"use client";
import Link from "next/link";
import { useCapiroQuery } from "../../../../shared/capiro/queries";
import { useSelectedClient } from "../../../../shared/session/SelectedClient";
import {
  ActionButton,
  DataTable,
  Panel,
  StatusPanel,
} from "../../../../shared/module-ui";
import { useResearchLocation } from "../research/ResearchNavigation";
import styles from "../intelligence.module.css";
export function MonitoredChanges() {
  const selected = useSelectedClient();
  if (selected.state === "no-selection")
    return (
      <Panel title="Client monitoring">
        <p className={styles.content}>
          Choose a client in the shared client selector to see its defense
          watches. General has no client watch feed.
        </p>
        <Link href="/">Open Portfolio</Link>
      </Panel>
    );
  if (selected.state === "loading") return <StatusPanel loading />;
  if (selected.state === "unavailable" || selected.client.status === "archived")
    return (
      <StatusPanel error="The selected client is unavailable. Choose a permitted active client." />
    );
  return (
    <ClientWatchList
      key={selected.client.id}
      clientId={selected.client.id}
      name={selected.client.name}
    />
  );
}
function ClientWatchList({
  clientId,
  name,
}: {
  clientId: string;
  name: string;
}) {
  const { params, update } = useResearchLocation();
  const query = useCapiroQuery("defenseChanges.monitored", {
    params: { clientId },
  });
  const verified = query.data?.every(
    (watch) =>
      watch.clientId === clientId &&
      watch.events.every(
        (event) => event.clientId === clientId && event.watchId === watch.id,
      ),
  );
  const rows = verified ? query.data! : [];
  const watch = rows.find((row) => row.id === params.get("changesWatchId"));
  return (
    <Panel
      title={`Monitored · ${name}`}
      description="Recorded defense watch subscriptions and material updates for this client."
    >
      <ActionButton onClick={query.reload}>Refresh monitored</ActionButton>
      <StatusPanel
        loading={query.loading}
        error={
          query.error ||
          (query.data && !verified
            ? "Watch records do not match the selected client."
            : undefined)
        }
        onRetry={query.reload}
      >
        <p className={styles.content}>
          {rows.length} watches returned. Showing the first 100; this owner does
          not provide paging. No recorded updates does not establish that
          sources have not changed.
        </p>
        <DataTable
          rows={rows.slice(0, 100)}
          rowKey={(r) => r.id}
          caption="Client defense watches"
          columns={[
            {
              key: "target",
              label: "Target",
              render: (r) => `${r.targetType} · ${r.targetKey}`,
            },
            {
              key: "reason",
              label: "Client reason",
              render: (r) => r.clientReason,
            },
            {
              key: "state",
              label: "Subscription",
              render: (r) =>
                [...r.events]
                  .reverse()
                  .find((event) =>
                    ["subscribed", "unsubscribed", "resubscribed"].includes(
                      event.eventType,
                    ),
                  )?.eventType || "Unavailable",
            },
            {
              key: "open",
              label: "Updates",
              render: (r) => (
                <ActionButton onClick={() => update({ changesWatchId: r.id })}>
                  View {r.targetKey}
                </ActionButton>
              ),
            },
          ]}
        />
        {watch && (
          <Panel
            title={`Recorded events · ${watch.targetKey}`}
            description="Latest 100 recorded events. Decisions remain separate from material source updates."
          >
            <DataTable
              rows={watch.events.slice(-100).reverse()}
              rowKey={(r) => r.id}
              caption="Watch event history"
              columns={[
                { key: "date", label: "Recorded", render: (r) => r.createdAt },
                { key: "type", label: "Event", render: (r) => r.eventType },
                {
                  key: "reason",
                  label: "Material change",
                  render: (r) => r.materialReason || "Not supplied",
                },
              ]}
            />
          </Panel>
        )}
      </StatusPanel>
    </Panel>
  );
}
