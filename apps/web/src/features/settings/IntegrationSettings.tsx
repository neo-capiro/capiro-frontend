"use client";

import { useState } from "react";
import type { z } from "zod";
import { useCapiro } from "../../shared/capiro/CapiroBoundary";
import type {
  integrationProviderSchema,
  integrationSchema,
} from "../../shared/capiro/operations/settings-schemas";
import { useCapiroQuery } from "../../shared/capiro/queries";
import { Badge, StatusPanel } from "../../shared/module-ui";
import { RegisterAccount } from "./RegisterAccount";
import {
  SettingsButton,
  SettingsCard,
  SettingsDialog,
  SettingsNotice,
} from "./components";
import { settingsDestination } from "./externalNavigation";
import { integrationProviders } from "./integrationProviders";
import styles from "./styles";
import { useSettingsAction } from "./useSettingsAction";

type Provider = z.infer<typeof integrationProviderSchema>;
type Connection = z.infer<typeof integrationSchema>;
const providers = integrationProviders;

export function IntegrationSettings() {
  const api = useCapiro();
  const connections = useCapiroQuery("settings.integrations.list", {});
  const microsoft = useCapiroQuery(
    "settings.integrations.microsoftCapabilities",
    {},
  );
  const google = useCapiroQuery("settings.integrations.googleCapabilities", {});
  const [register, setRegister] = useState<Provider>();
  const [disconnect, setDisconnect] = useState<Connection>();
  const [detail, setDetail] = useState<Connection>();
  const action = useSettingsAction(api);
  async function connect(
    provider: Provider,
    connectionId: string | undefined,
    signal: AbortSignal,
  ) {
    if (provider === "imap_caldav")
      throw new Error(
        "OAuth is unavailable for IMAP / CalDAV. Ask your administrator to configure the server connection.",
      );
    const result = await api.request(
      provider === "microsoft_365"
        ? "settings.integrations.startMicrosoft"
        : "settings.integrations.startGoogle",
      { body: connectionId ? { connectionId } : {} },
      { signal },
    );
    signal.throwIfAborted();
    if (connectionId && result.connectionId !== connectionId)
      throw new Error(
        "The sign-in response did not match this account. Reload integrations to confirm the result.",
      );
    window.location.assign(
      settingsDestination(
        result.authUrl,
        provider === "microsoft_365" ? "microsoft" : "google",
      ),
    );
  }
  async function sync(connection: Connection) {
    if (connection.provider === "imap_caldav")
      throw new Error("Manual IMAP / CalDAV sync is unavailable.");
    const result = await api.request(
      connection.provider === "microsoft_365"
        ? "settings.integrations.syncMicrosoft"
        : "settings.integrations.syncGoogle",
      { params: { connectionId: connection.id } },
    );
    if (result.connectionId !== connection.id)
      throw new Error(
        "The sync response did not match this account. Reload integrations to confirm the result.",
      );
    const stats = [result.calendar, ...Object.values(result.mail ?? {})].filter(
      (value) => !!value,
    );
    if (stats.some((value) => value.failed > 0))
      throw new Error(
        "The sync completed with failed records. Check the connection details and retry.",
      );
    return result;
  }
  async function disconnectAccount(connection: Connection) {
    if (connection.provider === "imap_caldav")
      throw new Error("IMAP / CalDAV disconnection is unavailable here.");
    const result = await api.request(
      connection.provider === "microsoft_365"
        ? "settings.integrations.disconnectMicrosoft"
        : "settings.integrations.disconnectGoogle",
      { params: { connectionId: connection.id } },
    );
    if (result.connectionId !== connection.id || !result.disconnected)
      throw new Error(
        "The disconnect response did not confirm this account. Reload integrations to confirm the result.",
      );
    return result;
  }
  return (
    <div className={styles.stack} data-design-target="411:68885">
      <div>
        <h2 style={{ fontSize: 16 }}>
          Engagement integrations <Badge>normalized engagement store</Badge>
        </h2>
        <p className={styles.description}>
          Provider records, scopes, sync state and connection health.
        </p>
      </div>
      <StatusPanel
        loading={connections.loading}
        error={connections.error}
        onRetry={connections.reload}
      >
        <div className={styles.grid}>
          {providers.map((provider) => {
            const rows = (connections.data ?? []).filter(
              (connection) => connection.provider === provider.id,
            );
            const capability =
              provider.id === "microsoft_365"
                ? microsoft
                : provider.id === "google_workspace"
                  ? google
                  : undefined;
            return (
              <SettingsCard
                key={provider.id}
                title={provider.title}
                description={provider.description}
              >
                {rows.length ? (
                  rows.map((connection) => (
                    <div className={styles.stack} key={connection.id}>
                      <div className={styles.row}>
                        <div className={styles.grow}>
                          <h3>
                            {connection.displayName ||
                              connection.accountEmail ||
                              provider.title}
                          </h3>
                          <p className={styles.description}>
                            {connection.accountEmail ?? "No account email"} ·{" "}
                            {connection.lastSyncAt
                              ? `Synced ${new Date(connection.lastSyncAt).toLocaleString()}`
                              : "Not synced yet"}
                          </p>
                        </div>
                        <Badge
                          tone={
                            connection.status === "connected"
                              ? "success"
                              : connection.status === "error"
                                ? "danger"
                                : "neutral"
                          }
                        >
                          {connection.status.replaceAll("_", " ")}
                        </Badge>
                      </div>
                      {connection.lastError && (
                        <SettingsNotice
                          title="Connection needs attention"
                          error
                        >
                          {connection.lastError}
                        </SettingsNotice>
                      )}
                      <div className={`${styles.row} ${styles.wrap}`}>
                        <SettingsButton
                          small
                          disabled={
                            action.busy ||
                            connection.status !== "connected" ||
                            provider.id === "imap_caldav"
                          }
                          onClick={() =>
                            void action.run(
                              () => sync(connection),
                              "Connection sync completed.",
                              connections.reload,
                            )
                          }
                        >
                          Sync now
                        </SettingsButton>
                        <SettingsButton
                          small
                          onClick={() => setDetail(connection)}
                        >
                          Permissions
                        </SettingsButton>
                        {connection.status === "connected" && (
                          <SettingsButton
                            danger
                            small
                            disabled={
                              action.busy || provider.id === "imap_caldav"
                            }
                            onClick={() => setDisconnect(connection)}
                          >
                            Disconnect
                          </SettingsButton>
                        )}
                        {connection.status !== "connected" &&
                          provider.id !== "imap_caldav" && (
                            <SettingsButton
                              small
                              disabled={
                                action.busy || !capability?.data?.configured
                              }
                              onClick={() =>
                                void action.run(
                                  (signal) =>
                                    connect(provider.id, connection.id, signal),
                                  "Opening provider sign-in…",
                                )
                              }
                            >
                              Connect account
                            </SettingsButton>
                          )}
                      </div>
                    </div>
                  ))
                ) : (
                  <p className={styles.description}>No accounts registered.</p>
                )}
                {capability?.loading && (
                  <p role="status" className={styles.description}>
                    Checking provider configuration…
                  </p>
                )}
                {capability?.error && (
                  <SettingsNotice
                    title="Provider status unavailable"
                    error
                    retry={capability.reload}
                  >
                    {capability.error.message}
                  </SettingsNotice>
                )}
                {capability?.data && !capability.data.configured && (
                  <p className={styles.description}>
                    This provider is not configured on the server. A Capiro
                    administrator must add the OAuth credentials before accounts
                    can be connected.
                  </p>
                )}
                <div className={`${styles.row} ${styles.wrap}`}>
                  <SettingsButton
                    small
                    onClick={() => setRegister(provider.id)}
                  >
                    + Register account
                  </SettingsButton>
                  <SettingsButton
                    primary
                    small
                    disabled={action.busy || !capability?.data?.configured}
                    onClick={() =>
                      void action.run(
                        (signal) => connect(provider.id, undefined, signal),
                        "Opening provider sign-in…",
                      )
                    }
                  >
                    {provider.id === "imap_caldav"
                      ? "Connect OAuth"
                      : capability?.data?.configured
                        ? `Connect ${provider.title}`
                        : "Administrator setup required"}
                  </SettingsButton>
                </div>
                {provider.id === "imap_caldav" && (
                  <p className={styles.description}>
                    Server configuration is required for IMAP / CalDAV
                    ingestion. OAuth, manual sync and disconnection are
                    unavailable here.
                  </p>
                )}
              </SettingsCard>
            );
          })}
        </div>
      </StatusPanel>
      {action.error && (
        <SettingsNotice title="Integration action failed" error>
          {action.error}
        </SettingsNotice>
      )}
      {action.message && <SettingsNotice title={action.message} />}
      <RegisterAccount
        provider={register}
        onClose={() => setRegister(undefined)}
        refresh={connections.reload}
      />
      <SettingsDialog
        open={!!disconnect}
        onClose={() => {
          if (!action.busy) setDisconnect(undefined);
        }}
        title={`Disconnect ${disconnect?.provider === "microsoft_365" ? "Microsoft 365" : "Google Workspace"}?`}
        description="Calendar and mail syncing will stop. Existing records are kept."
        footer={
          <>
            <SettingsButton
              disabled={action.busy}
              onClick={() => setDisconnect(undefined)}
            >
              Keep connected
            </SettingsButton>
            <SettingsButton
              danger
              disabled={action.busy}
              onClick={() => {
                if (disconnect && disconnect.provider !== "imap_caldav")
                  void action.run(
                    () => disconnectAccount(disconnect),
                    "Account was disconnected.",
                    () => {
                      setDisconnect(undefined);
                      connections.reload();
                    },
                  );
              }}
            >
              Disconnect
            </SettingsButton>
          </>
        }
      >
        <p>{disconnect?.accountEmail}</p>
        {action.error && (
          <SettingsNotice title="Disconnect failed" error>
            {action.error}
          </SettingsNotice>
        )}
      </SettingsDialog>
      <SettingsDialog
        open={!!detail}
        onClose={() => setDetail(undefined)}
        title="Account permissions"
      >
        <p>{detail?.accountEmail}</p>
        <ul>
          {detail?.scopes.map((scope) => (
            <li key={scope}>{scope}</li>
          ))}
        </ul>
        {!detail?.scopes.length && <p>No granted scopes were returned.</p>}
      </SettingsDialog>
    </div>
  );
}
