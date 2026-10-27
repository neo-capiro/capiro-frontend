"use client";

import { useState } from "react";
import { useCapiro } from "../../shared/capiro/CapiroBoundary";
import { useCapiroQuery } from "../../shared/capiro/queries";
import { Badge, DataTable, StatusPanel } from "../../shared/module-ui";
import {
  SettingsButton,
  SettingsCard,
  SettingsDialog,
  SettingsNotice,
} from "./components";
import styles from "./styles";

function when(value: string | null | undefined): string {
  return value ? new Date(value).toLocaleString() : "—";
}

/**
 * Workspace administration of Research Portfolio client links (FR-16.41, FR-16.42):
 * the workspace-wide switch, and every link that is still live, with revoke.
 */
export function ClientSharingSettings() {
  const api = useCapiro();
  const sharing = useCapiroQuery("research.tenantSharing", {});
  const links = useCapiroQuery("research.shareLinks.tenant", {});
  const [confirmOff, setConfirmOff] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  async function run(action: () => Promise<unknown>) {
    setBusy(true);
    setError(undefined);
    try {
      await action();
      sharing.reload();
      links.reload();
      return true;
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "The change could not be saved.",
      );
      return false;
    } finally {
      setBusy(false);
    }
  }
  const enabled = sharing.data?.enabled ?? true;
  const activeCount = sharing.data?.activeLinkCount ?? 0;
  return (
    <div className={styles.stack}>
      {error && (
        <SettingsNotice title="Something went wrong" error>
          {error}
        </SettingsNotice>
      )}
      <SettingsCard
        title="Workspace switch"
        description="When off, no portfolio can publish a client link and every existing link stops answering until it is on again. Portfolio PINs and designs are kept."
        action={
          enabled ? (
            <Badge tone="success">On</Badge>
          ) : (
            <Badge tone="danger">Off</Badge>
          )
        }
      >
        <StatusPanel
          loading={sharing.loading}
          error={sharing.error}
          onRetry={sharing.reload}
        >
          <p className={styles.description}>
            {sharing.data?.updatedAt
              ? `Last changed ${when(sharing.data.updatedAt)}.`
              : "Never changed; client sharing is on by default."}
          </p>
          <div className={styles.row}>
            {enabled ? (
              <SettingsButton
                danger
                disabled={busy}
                onClick={() => setConfirmOff(true)}
              >
                Turn off client sharing
              </SettingsButton>
            ) : (
              <SettingsButton
                primary
                disabled={busy}
                onClick={() =>
                  run(() =>
                    api.request("research.tenantSharing.set", {
                      body: { enabled: true },
                    }),
                  )
                }
              >
                Turn on client sharing
              </SettingsButton>
            )}
          </div>
        </StatusPanel>
      </SettingsCard>
      <SettingsCard
        title="Active client links"
        description="Every Research Portfolio link in this workspace that has not expired or been revoked. Revoking takes effect immediately."
      >
        <StatusPanel
          loading={links.loading}
          error={links.error}
          onRetry={links.reload}
        >
          <DataTable
            rows={links.data ?? []}
            rowKey={(l) => l.id}
            caption="Active client links"
            emptyMessage="No active client links."
            columns={[
              { key: "client", label: "Client", render: (l) => l.clientName },
              {
                key: "snapshot",
                label: "Snapshot",
                render: (l) => l.snapshotName,
              },
              {
                key: "published",
                label: "Published",
                render: (l) => when(l.publishedAt),
              },
              {
                key: "expires",
                label: "Expires",
                render: (l) => when(l.expiresAt),
              },
              { key: "opens", label: "Opens", render: (l) => l.openCount },
              {
                key: "pinFailures",
                label: "Wrong PINs",
                render: (l) => l.failedPinAttempts,
              },
              {
                key: "actions",
                label: "Actions",
                render: (l) => (
                  <SettingsButton
                    small
                    danger
                    disabled={busy}
                    onClick={() =>
                      run(() =>
                        api.request("research.shareLinks.tenantRevoke", {
                          params: { linkId: l.id },
                          body: {},
                        }),
                      )
                    }
                  >
                    Revoke
                  </SettingsButton>
                ),
              },
            ]}
          />
        </StatusPanel>
      </SettingsCard>
      <SettingsDialog
        title="Turn off client sharing for the whole workspace?"
        description={`${activeCount} active link${activeCount === 1 ? "" : "s"} will stop working immediately. Links come back when sharing is turned on again, unless they expire first.`}
        open={confirmOff}
        onClose={() => setConfirmOff(false)}
        busy={busy}
        footer={
          <>
            <SettingsButton
              disabled={busy}
              onClick={() => setConfirmOff(false)}
            >
              Keep sharing on
            </SettingsButton>
            <SettingsButton
              danger
              disabled={busy}
              onClick={async () => {
                if (
                  await run(() =>
                    api.request("research.tenantSharing.set", {
                      body: { enabled: false },
                    }),
                  )
                )
                  setConfirmOff(false);
              }}
            >
              Turn off
            </SettingsButton>
          </>
        }
      >
        <p>
          Recipients who open a link while sharing is off see only that the link
          is not available.
        </p>
      </SettingsDialog>
    </div>
  );
}
