"use client";
import { useCapiro } from "../../../shared/capiro/CapiroBoundary";
import { useCapiroQuery } from "../../../shared/capiro/queries";
import { DataTable, StatusPanel } from "../../../shared/module-ui";
import { SettingsButton, SettingsDialog, SettingsNotice } from "../components";
import styles from "../styles";
import { useSettingsAction } from "../useSettingsAction";

export function BroadcastDetail({
  id,
  onClose,
  refresh,
}: {
  id: string;
  onClose: () => void;
  refresh: () => void;
}) {
  const api = useCapiro();
  const query = useCapiroQuery("settings.hq.broadcasts.detail", {
    params: { id },
  });
  const action = useSettingsAction();
  return (
    <SettingsDialog
      open
      onClose={onClose}
      title={query.data?.title ?? "Broadcast detail"}
      footer={
        <>
          {query.data && !query.data.archivedAt && (
            <SettingsButton
              disabled={action.busy}
              onClick={() =>
                void action.run(
                  () =>
                    api.request("settings.hq.broadcasts.archive", {
                      params: { id },
                    }),
                  "Broadcast was archived.",
                  () => {
                    query.reload();
                    refresh();
                  },
                )
              }
            >
              Archive
            </SettingsButton>
          )}
          <SettingsButton onClick={onClose}>Close</SettingsButton>
        </>
      }
    >
      <StatusPanel
        loading={query.loading}
        error={query.error}
        onRetry={query.reload}
      >
        {query.data && (
          <>
            <p className={styles.description}>
              Sent {new Date(query.data.createdAt).toLocaleString()} by{" "}
              {[query.data.createdBy.firstName, query.data.createdBy.lastName]
                .filter(Boolean)
                .join(" ") || query.data.createdBy.email}
            </p>
            <p style={{ whiteSpace: "pre-wrap" }}>{query.data.body}</p>
            <h3>
              Recipients · {query.data.acknowledgedCount} of{" "}
              {query.data.recipientCount} acknowledged
            </h3>
            <DataTable
              rows={query.data.recipients}
              rowKey={(row) => row.userId}
              caption="Broadcast acknowledgements"
              columns={[
                {
                  key: "name",
                  label: "Name",
                  render: (row) =>
                    [row.firstName, row.lastName].filter(Boolean).join(" ") ||
                    row.email,
                },
                { key: "email", label: "Email", render: (row) => row.email },
                {
                  key: "status",
                  label: "Status",
                  render: (row) =>
                    row.acknowledgedAt ? "Acknowledged" : "Pending",
                },
                {
                  key: "ack",
                  label: "Acknowledged",
                  render: (row) =>
                    row.acknowledgedAt
                      ? new Date(row.acknowledgedAt).toLocaleString()
                      : "—",
                },
              ]}
            />
          </>
        )}
      </StatusPanel>
      {action.error && (
        <SettingsNotice title="Archive failed" error>
          {action.error}
        </SettingsNotice>
      )}
      {action.message && <SettingsNotice title={action.message} />}
    </SettingsDialog>
  );
}
