"use client";
import { useMemo } from "react";
import { useCapiroQuery } from "../../../../shared/capiro/queries";
import { scopedHref } from "../../../../shared/session/client-route";
import { useSelectedClient } from "../../../../shared/session/SelectedClient";
import { ConnectorAccountsScreen } from "./ConnectorAccountsScreen";
import { connectionView } from "./connections-view";
import { unavailablePreferences } from "./preferences-unavailable";
import type { SettingsChrome, SettingsNotice } from "./settings-view";

/** The surface that owns provider connect, reconnect, sync and disconnect. */
const integrationsRoute = "/settings/integrations";

const fallback = unavailablePreferences.connections;

/**
 * 09.02 Connections on the current Core owner.
 *
 * Connections are read with the existing fixed `settings.integrations.list`
 * operation, which Core scopes to the current verified tenant and actor. This
 * panel adds no provider flow, no grant of its own and no cached "connected"
 * state: actions hand off to Capiro Integrations with the current client
 * context preserved.
 */
export function ConnectorAccountsHost({ chrome }: { chrome: SettingsChrome }) {
  const identity = useCapiroQuery("me.read", {});
  if (!identity.data)
    return (
      <ConnectorAccountsScreen
        chrome={chrome}
        view={{
          ...fallback,
          unavailable: identity.error
            ? {
                title: "Current account could not be verified",
                detail:
                  "Connections are read for your current verified account. Sign in again or reload settings before reviewing them.",
                tone: "warning",
              }
            : {
                title: "Verifying your current account",
                detail:
                  "Connections are read for your current verified tenant and account, never from a cached page.",
                tone: "warning",
              },
        }}
      />
    );
  return (
    <OwnedConnections
      key={`${identity.data.tenant.id}:${identity.data.user.id}`}
      chrome={chrome}
    />
  );
}

/**
 * Re-reads on every current-account change: the key above remounts this view, so
 * a tenant or actor switch cannot keep another account's rows or selection.
 */
function OwnedConnections({ chrome }: { chrome: SettingsChrome }) {
  const connections = useCapiroQuery("settings.integrations.list", {});
  const selected = useSelectedClient();
  const clientId =
    selected.state === "authorized-client" ? selected.client.id : undefined;
  const ownerHref = scopedHref(integrationsRoute, clientId);
  const view = useMemo(
    () => connectionView(connections.data ?? [], ownerHref, fallback),
    [connections.data, ownerHref],
  );
  const status: SettingsNotice | undefined = connections.error
    ? {
        title: "Connection status unavailable",
        detail:
          "Your current account's connections could not be read. Reload settings to try again; this is not an empty account.",
        tone: "warning",
      }
    : connections.loading && !connections.data
      ? {
          title: "Reading current connections",
          detail:
            "Reading the provider connections Core reports for your current account.",
        }
      : undefined;
  if (status)
    return (
      <ConnectorAccountsScreen
        chrome={chrome}
        view={{ ...fallback, unavailable: status }}
      />
    );
  return <ConnectorAccountsScreen chrome={chrome} view={view} />;
}
