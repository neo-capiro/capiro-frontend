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
import { OAuthOutcomeNotice } from "./integrations/OAuthOutcome";
import { canRetrySync, syncOutcomeMessage } from "./integrations/outcomes";
import {
  IntegrationHealth,
  IntegrationPermissions,
} from "./integrations/IntegrationHealth";

type Provider = z.infer<typeof integrationProviderSchema>;
type Connection = z.infer<typeof integrationSchema>;
const providers = integrationProviders;

function syncAge(value: string | null) {
  if (!value) return "No sync attempt recorded";
  const minutes = Math.max(
    0,
    Math.round((Date.now() - Date.parse(value)) / 60000),
  );
  if (!Number.isFinite(minutes)) return "Sync time unavailable";
  if (minutes < 1) return "Last sync attempt just now";
  if (minutes < 60) return `Last sync attempt ${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `Last sync attempt ${hours} hr ago`;
  const days = Math.round(hours / 24);
  if (days < 7) return `Last sync attempt ${days} days ago`;
  return `Last sync attempt ${new Date(value).toLocaleDateString("en-US", {
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
  const [resetId, setResetId] = useState<string>();
  const resetConnection = connections.data?.find((row) => row.id === resetId);
  const resetCapability =
    resetConnection?.provider === "microsoft_365"
      ? microsoft.data
      : google.data;
  const [detailId, setDetailId] = useState<string>();
  const detail = connections.data?.find(
    (connection) => connection.id === detailId,
  );
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
        "IMAP / CalDAV ingestion is not supported in this application.",
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
  async function sync(
    connection: Connection,
    signal: AbortSignal,
    reset = false,
  ) {
    if (connection.provider === "imap_caldav")
      throw new Error("Manual IMAP / CalDAV sync is unavailable.");
    try {
      const result = await api.request(
        connection.provider === "microsoft_365"
          ? "settings.integrations.syncMicrosoft"
          : "settings.integrations.syncGoogle",
        {
          params: { connectionId: connection.id },
          ...(reset ? { query: { reset: true } } : {}),
        },
        { signal },
      );
      if (result.connectionId !== connection.id)
        throw new Error(
          "The sync response did not match this account. Reload integrations to confirm the result.",
        );
      return result;
    } finally {
      if (!signal.aborted) connections.reload();
    }
  }
  async function configureSubscriptions(
    connection: Connection,
    signal: AbortSignal,
  ) {
    try {
      return await api.request(
        "settings.integrations.configureMicrosoftSubscriptions",
        { params: { connectionId: connection.id } },
        { signal },
      );
    } finally {
      if (!signal.aborted) connections.reload();
    }
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
      <OAuthOutcomeNotice currentConnections={connections.data} />
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
                              onClick={() => setDetailId(connection.id)}
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
                      <IntegrationHealth connection={connection} />
                      <div
                        className={`${styles.row} ${styles.wrap} ${styles.integrationActions}`}
                      >
                        <SettingsButton
                          small
                          disabled={
                            locked ||
                            !canRetrySync(connection) ||
                            !capability?.data?.configured ||
                            capability?.data?.actions?.sync.allowed === false
                          }
                          onClick={() =>
                            void action.run(
                              (signal) => sync(connection, signal),
                              syncOutcomeMessage,
                            )
                          }
                        >
                          {connection.status === "error"
                            ? "Retry sync"
                            : "Sync now"}
                        </SettingsButton>
                        {connection.provider === "microsoft_365" &&
                          connection.status === "connected" && (
                            <SettingsButton
                              small
                              disabled={
                                locked ||
                                microsoft.data?.subscriptionsConfigured !==
                                  true ||
                                microsoft.data?.actions?.subscriptions
                                  .allowed === false
                              }
                              onClick={() =>
                                void action.run(
                                  (signal) =>
                                    configureSubscriptions(connection, signal),
                                  "Realtime subscriptions are configured.",
                                )
                              }
                            >
                              Realtime
                            </SettingsButton>
                          )}
                        {provider.id !== "imap_caldav" && (
                          <SettingsButton
                            small
                            disabled={
                              locked ||
                              !canRetrySync(connection) ||
                              !capability?.data?.configured ||
                              capability.data.actions?.sync.allowed === false
                            }
                            onClick={() => setResetId(connection.id)}
                          >
                            Restart sync…
                          </SettingsButton>
                        )}
                        {provider.id !== "imap_caldav" && (
                          <SettingsButton
                            danger
                            small
                            disabled={
                              locked ||
                              capability?.data?.actions?.disconnect.allowed ===
                                false
                            }
                            onClick={() => setDisconnect(connection)}
                          >
                            Disconnect
                          </SettingsButton>
                        )}
                        {provider.id !== "imap_caldav" && (
                          <SettingsButton
                            small
                            disabled={
                              locked ||
                              !capability?.data?.configured ||
                              capability.data.actions?.connect.allowed === false
                            }
                            onClick={() =>
                              void action.run(
                                (signal) =>
                                  connect(provider.id, connection.id, signal),
                                "Opening provider sign-in…",
                              )
                            }
                          >
                            {connection.status === "connected" ||
                            connection.status === "error"
                              ? "Reconnect account"
                              : "Connect account"}
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
                    {rows.length > 0 &&
                      "Saved account records are shown above; they do not establish current provider availability. "}
                    Current server configuration for this provider is missing. A
                    Capiro administrator must add the OAuth credentials before
                    accounts can connect or reconnect.
                  </p>
                )}
                {capability?.data?.actions?.connect.reason ===
                  "runtime_held" && (
                  <SettingsNotice title="Provider actions are unavailable in this environment">
                    OAuth configuration is present, but the server currently
                    holds external integration actions.
                  </SettingsNotice>
                )}
                {provider.id === "microsoft_365" &&
                  capability?.data?.subscriptionsConfigured === false && (
                    <p className={styles.description}>
                      Realtime notifications are not configured. Periodic sync
                      remains separate.
                    </p>
                  )}
                {provider.id !== "imap_caldav" && (
                  <div className={`${styles.row} ${styles.wrap}`}>
                    <SettingsButton
                      small
                      disabled={locked}
                      onClick={() => setRegister(provider.id)}
                    >
                      + Register account
                    </SettingsButton>
                    <SettingsButton
                      primary
                      small
                      disabled={
                        locked ||
                        !capability?.data?.configured ||
                        capability.data.actions?.connect.allowed === false
                      }
                      onClick={() =>
                        void action.run(
                          (signal) => connect(provider.id, undefined, signal),
                          "Opening provider sign-in…",
                        )
                      }
                    >
                      {capability?.data?.configured
                        ? `Connect ${provider.title}`
                        : "Administrator setup required"}
                    </SettingsButton>
                  </div>
                )}
                {provider.id === "imap_caldav" && (
                  <p className={styles.description}>
                    IMAP / CalDAV ingestion is not supported. Registration,
                    connection and sync are unavailable. Existing records do not
                    establish a working provider connection.
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
        key={register ?? "closed"}
        provider={register}
        onClose={() => setRegister(undefined)}
        refresh={connections.reload}
      />
      <SettingsDialog
        open={!!resetId}
        onClose={() => setResetId(undefined)}
        title="Restart mail and calendar sync?"
        description="Advanced recovery: restart provider import within this account’s configured folders and history window. This can repeat work already completed and does not import unlimited history."
        footer={
          <>
            <SettingsButton onClick={() => setResetId(undefined)}>
              Keep current progress
            </SettingsButton>
            <SettingsButton
              disabled={
                locked ||
                !resetConnection ||
                !canRetrySync(resetConnection) ||
                !resetCapability?.configured ||
                resetCapability.actions?.sync.allowed === false
              }
              onClick={() => {
                if (!resetConnection) return;
                const connection = resetConnection;
                setResetId(undefined);
                void action.run(
                  (signal) => sync(connection, signal, true),
                  syncOutcomeMessage,
                );
              }}
            >
              Restart sync
            </SettingsButton>
          </>
        }
      >
        <p>
          {resetConnection?.accountEmail ??
            "This account is no longer available."}
        </p>
        <p>
          Only one bounded sync batch runs now. Review the refreshed health
          after it finishes or fails, then use Sync now or Retry sync to
          continue saved progress. Restart again only when you intend to begin a
          new import.
        </p>
      </SettingsDialog>
      <SettingsDialog
        busy={action.busy}
        open={!!disconnect}
        onClose={() => {
          if (!action.busy) setDisconnect(undefined);
        }}
        title={`Disconnect ${disconnect?.provider === "microsoft_365" ? "Microsoft 365" : "Google Workspace"}?`}
        description="Calendar and mail syncing will stop. Stored mail records are retained, but become unavailable in mail views when this connection is removed. Reconnecting does not restore access to that earlier history."
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
                    (result) =>
                      disconnect.provider === "microsoft_365"
                        ? "Account was disconnected in Capiro. Microsoft app consent remains."
                        : "providerRevocation" in result &&
                            result.providerRevocation === "confirmed"
                          ? "Account was disconnected in Capiro and Google token revocation was confirmed."
                          : "Account was disconnected in Capiro. Google token revocation was not confirmed; review Capiro access in your Google account.",
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
        <p>
          {disconnect?.provider === "microsoft_365"
            ? "This removes the connection in Capiro. Microsoft app consent remains; remove it in your Microsoft account or ask your administrator to revoke it."
            : "Google token revocation is best effort. If it cannot be confirmed, remove Capiro access from your Google account’s third-party connections."}
        </p>
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
        open={!!detailId}
        onClose={() => setDetailId(undefined)}
        title="Account scope record"
      >
        <p>{detail?.accountEmail}</p>
        {detail && <IntegrationPermissions connection={detail} />}
        {!detail && (
          <p>
            Current account details are unavailable. Reload integrations to
            verify this account.
          </p>
        )}
      </SettingsDialog>
    </div>
  );
}
