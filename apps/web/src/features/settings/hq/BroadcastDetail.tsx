"use client";
import { useCapiroQuery } from "../../../shared/capiro/queries";
import { DataTable, StatusPanel } from "../../../shared/module-ui";
import { SettingsButton, SettingsDialog, SettingsNotice } from "../components";
import styles from "../styles";
import { useSettingsMutation } from "../useSettingsMutation";
import { SettingsMutationNotice } from "../SettingsMutationNotice";

export function BroadcastDetail({
  id,
  onClose,
  refresh,
}: {
  id: string;
  onClose: () => void;
  refresh: () => void;
}) {
  const { api, action, pending, reconcile, locked } = useSettingsMutation(
    "hq-broadcast-detail",
  );
  const query = useCapiroQuery("settings.hq.broadcasts.detail", {
    params: { id },
  });
  return (
    <SettingsDialog
      busy={action.busy}
      open
      onClose={onClose}
      title={query.data?.title ?? "Broadcast detail"}
      footer={
        <>
          {query.data && !query.data.archivedAt && (
            <SettingsButton
              disabled={locked}
              onClick={() =>
                void action.run(
                  (signal) =>
                    api.request(
                      "settings.hq.broadcasts.archive",
                      {
                        params: { id },
                      },
                      { signal },
                    ),
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
          <SettingsButton disabled={locked} onClick={onClose}>
            Close
          </SettingsButton>
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
      <SettingsMutationNotice
        pending={pending}
        busy={action.busy}
        reconcile={reconcile}
      />
      {action.error && (
        <SettingsNotice title="Archive failed" error>
          {action.error}
        </SettingsNotice>
      )}
      {action.message && <SettingsNotice title={action.message} />}
    </SettingsDialog>
  );
}
