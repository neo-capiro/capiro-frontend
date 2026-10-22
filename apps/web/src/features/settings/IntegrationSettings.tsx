"use client";

import { useState } from "react";
import type { z } from "zod";
import { useCapiro } from "../../shared/capiro/CapiroBoundary";
import type {
  integrationProviderSchema,
  integrationSchema,
} from "../../shared/capiro/operations/settings-schemas";
import { useCapiroQuery } from "../../shared/capiro/queries";
import { StatusPanel } from "../../shared/module-ui";
import { RegisterAccount } from "./RegisterAccount";
import {
  SettingsButton,
  SettingsBadge,
  SettingsCard,
  SettingsDialog,
  SettingsNotice,
} from "./components";
import { settingsDestination } from "./externalNavigation";
import { integrationProviders } from "./integrationProviders";
import styles from "./styles";
import { useSettingsMutation } from "./useSettingsMutation";
import { SettingsMutationNotice } from "./SettingsMutationNotice";

type Provider = z.infer<typeof integrationProviderSchema>;
type Connection = z.infer<typeof integrationSchema>;
const providers = integrationProviders;

function syncAge(value: string | null) {
  if (!value) return "Not synced yet";
  const minutes = Math.max(
    0,
    Math.round((Date.now() - Date.parse(value)) / 60000),
  );
  if (!Number.isFinite(minutes)) return "Sync time unavailable";
  if (minutes < 1) return "Synced just now";
  if (minutes < 60) return `Synced ${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `Synced ${hours} hr ago`;
  const days = Math.round(hours / 24);
  if (days < 7) return `Synced ${days} days ago`;
  return `Synced ${new Date(value).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  })}`;
}

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
  const {
    api: mutationApi,
    action,
    pending,
    reconcile,
    locked,
  } = useSettingsMutation("integration-disconnect");
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
  async function disconnectAccount(
    connection: Connection,
    signal: AbortSignal,
  ) {
    if (connection.provider === "imap_caldav")
      throw new Error("IMAP / CalDAV disconnection is unavailable here.");
    const result = await mutationApi.request(
      connection.provider === "microsoft_365"
        ? "settings.integrations.disconnectMicrosoft"
        : "settings.integrations.disconnectGoogle",
      { params: { connectionId: connection.id } },
      { signal },
    );
    if (result.connectionId !== connection.id || !result.disconnected)
      throw new Error(
        "The disconnect response did not confirm this account. Reload integrations to confirm the result.",
      );
    return result;
  }
  return (
    <div className={styles.stack} data-design-target="1064:244275">
      <div className={styles.integrationIntro}>
        <h2 className={styles.integrationHeading}>
          Engagement integrations{" "}
          <SettingsBadge assetName="settings-integrations-imgEllipse">
            normalized engagement store
          </SettingsBadge>
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
        <div className={`${styles.grid} ${styles.integrationGrid}`}>
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
                    <div
                      className={`${styles.stack} ${styles.integrationConnection}`}
                      key={connection.id}
                    >
                      <div
                        className={`${styles.row} ${styles.integrationAccountRow}`}
                      >
                        <div className={styles.grow}>
                          <div className={styles.integrationAccountHeading}>
                            <h3
                              title={
                                connection.displayName ||
                                connection.accountEmail ||
                                provider.title
                              }
                            >
                              {connection.displayName ||
                                connection.accountEmail ||
                                provider.title}
                            </h3>
                            <SettingsButton
                              small
                              className={styles.integrationPermissions}
                              onClick={() => setDetail(connection)}
                            >
                              Permissions
                            </SettingsButton>
                          </div>
                          <div className={styles.integrationMeta}>
                            <p className={styles.description}>
                              {connection.accountEmail ?? "No account email"} ·{" "}
                              {syncAge(connection.lastSyncAt)}
                            </p>
                          </div>
                        </div>
                        <SettingsBadge
                          {...(connection.status === "connected"
                            ? {
                                assetName:
                                  "settings-integrations-imgEllipse1" as const,
                              }
                            : {})}
                          tone={
                            connection.status === "connected"
                              ? "success"
                              : connection.status === "error"
                                ? "danger"
                                : "neutral"
                          }
                        >
                          {connection.status.replaceAll("_", " ")}
                        </SettingsBadge>
                      </div>
                      {connection.lastError && (
                        <SettingsNotice
                          title="Connection needs attention"
                          error
                        >
                          {connection.lastError}
                        </SettingsNotice>
                      )}
                      <div
                        className={`${styles.row} ${styles.wrap} ${styles.integrationActions}`}
                      >
                        <SettingsButton
                          small
                          disabled={
                            locked ||
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
                        {connection.provider === "microsoft_365" &&
                          connection.status === "connected" && (
                            <SettingsButton
                              small
                              disabled={locked}
                              onClick={() =>
                                void action.run(
                                  (signal) =>
                                    api.request(
                                      "settings.integrations.configureMicrosoftSubscriptions",
                                      {
                                        params: { connectionId: connection.id },
                                      },
                                      { signal },
                                    ),
                                  "Realtime subscriptions are configured.",
                                  connections.reload,
                                )
                              }
                            >
                              Realtime
                            </SettingsButton>
                          )}
                        {connection.status === "connected" && (
                          <SettingsButton
                            danger
                            small
                            disabled={locked || provider.id === "imap_caldav"}
                            onClick={() => setDisconnect(connection)}
                          >
                            Disconnect
                          </SettingsButton>
                        )}
                        {connection.status !== "connected" &&
                          provider.id !== "imap_caldav" && (
                            <SettingsButton
                              small
                              disabled={locked || !capability?.data?.configured}
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
                    disabled={locked || !capability?.data?.configured}
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
      <SettingsMutationNotice
        pending={pending}
        busy={action.busy}
        reconcile={reconcile}
      />
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
              disabled={locked}
              onClick={() => setDisconnect(undefined)}
            >
              Keep connected
            </SettingsButton>
            <SettingsButton
              danger
              disabled={locked}
              onClick={() => {
                if (disconnect && disconnect.provider !== "imap_caldav")
                  void action.run(
                    (signal) => disconnectAccount(disconnect, signal),
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
        <SettingsMutationNotice
          pending={pending}
          busy={action.busy}
          reconcile={reconcile}
        />
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
        <ul>{detail?.scopes.map((scope) => <li key={scope}>{scope}</li>)}</ul>
        {!detail?.scopes.length && <p>No granted scopes were returned.</p>}
      </SettingsDialog>
    </div>
  );
}
