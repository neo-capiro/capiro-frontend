/**
 * Connected-services client — the existing Core owner, called through the existing ordinary Capiro
 * operation transport. It adds no transport, mints no authority and holds no credential: the
 * gateway attaches the reviewed capiro-template session token and Core resolves tenant/member scope,
 * ownership, OAuth state and token custody itself.
 *
 * Two sequencing rules live here because a person cannot express them by clicking:
 *
 * 1. A catalog add is NOT idempotent — `MeriMcpService.addFromCatalog` always creates a new row with
 *    a disambiguated name. So an add that succeeded but could not start authorization returns the
 *    created row and is retried against that row id, never re-added. An add whose outcome is unknown
 *    (transport failure, 5xx) is reported as unknown so the surface reconciles before offering
 *    another add.
 * 2. `POST …/oauth/disconnect` only clears OAuth state (`connectionStatus: 'disconnected'` plus the
 *    credential rows). For a token/none connector that would leave `enabled` true and the encrypted
 *    key in place, and Core's execution guard consults `connectionStatus` only for OAuth rows — so a
 *    non-OAuth connection is ended through the existing delete owner, not by the OAuth route.
 */
import { CapiroApiError, type CapiroApi } from "../capiro/http";
import {
  meriConnectorOperations,
  type AddConnectorBody,
  type ConnectorLibrary,
  type ConnectorRow,
  type McpCatalogEntry,
} from "../capiro/operations/meri-connectors";
import { connectGate, type ConnectDraft } from "./view";

export type ConnectorApi = CapiroApi<typeof meriConnectorOperations>;

export type ConnectOutcome =
  /** Stored; Core discovery may still have failed — check `connector.lastError`. */
  | { kind: "saved"; connector: ConnectorRow }
  /** Stored and waiting for the provider; follow Core's URL. */
  | { kind: "authorization_required"; connector: ConnectorRow; authUrl: string }
  /** Stored, but authorization did not start. Retry against `connector.id`, never by re-adding. */
  | { kind: "authorization_pending"; connector: ConnectorRow; reason: string }
  | { kind: "already_connected"; connector: ConnectorRow }
  /** Core refused before creating anything. */
  | { kind: "refused"; reason: string }
  /** The add may or may not have created a row. Reconcile from the current read; do not re-add. */
  | { kind: "unknown_create"; reason: string };

export type DisconnectOutcome =
  /** OAuth authorization cleared. Core keeps the row, now disconnected. */
  | { kind: "authorization_revoked" }
  /** The stored connection and its key were deleted through the existing remove owner. */
  | { kind: "connection_removed" };

export type ConnectorClient = {
  library(signal?: AbortSignal): Promise<ConnectorLibrary>;
  servers(signal?: AbortSignal): Promise<ConnectorRow[]>;
  connect(
    entry: McpCatalogEntry,
    draft: ConnectDraft,
    signal?: AbortSignal,
  ): Promise<ConnectOutcome>;
  /** Re-run authorization for an existing OAuth connector (reconnect / repair), by row id. */
  reauthorize(
    id: string,
    signal?: AbortSignal,
  ): Promise<{ authUrl: string | null; alreadyConnected: boolean }>;
  /** End a stored connection through the owner that actually governs it. */
  disconnect(
    connector: Pick<ConnectorRow, "id" | "authType">,
    signal?: AbortSignal,
  ): Promise<DisconnectOutcome>;
  refresh(
    signal?: AbortSignal,
  ): Promise<{ tools: string[]; refreshedAt: string }>;
};

function messageOf(error: unknown, fallback: string): string {
  return error instanceof Error && error.message ? error.message : fallback;
}

/**
 * A 4xx is Core refusing the add before it wrote anything; anything else (transport failure, 5xx,
 * timeout) could have created the row, so it must not be retried blindly.
 */
function createFailure(error: unknown): ConnectOutcome {
  const reason = messageOf(error, "The connection request failed.");
  if (
    error instanceof CapiroApiError &&
    error.status >= 400 &&
    error.status < 500
  )
    return { kind: "refused", reason };
  return { kind: "unknown_create", reason };
}

export function createConnectorClient(api: ConnectorApi): ConnectorClient {
  return {
    library: (signal) => api.request("meri.connectors.catalog", {}, { signal }),
    servers: (signal) => api.request("meri.connectors.servers", {}, { signal }),

    async connect(entry, draft, signal) {
      const gate = connectGate(entry, draft);
      if (!gate.ok) return { kind: "refused", reason: gate.reason };
      const body: AddConnectorBody = gate.body;
      let added: ConnectorRow & { oauthRequired: boolean };
      try {
        added = await api.request("meri.connectors.add", { body }, { signal });
      } catch (error) {
        return createFailure(error);
      }
      if (!added.oauthRequired) return { kind: "saved", connector: added };
      try {
        const started = await api.request(
          "meri.connectors.oauthStart",
          { params: { id: added.id } },
          { signal },
        );
        if (started.authUrl)
          return {
            kind: "authorization_required",
            connector: added,
            authUrl: started.authUrl,
          };
        if (started.alreadyConnected)
          return { kind: "already_connected", connector: added };
        return {
          kind: "authorization_pending",
          connector: added,
          reason:
            "The service did not return an authorization page. The connection was created and is listed below as authorization pending; retry it there instead of connecting again.",
        };
      } catch (error) {
        // The row exists. Losing its id here is what used to create a duplicate row per retry.
        return {
          kind: "authorization_pending",
          connector: added,
          reason: messageOf(
            error,
            "Authorization could not be started. The connection was created and is listed below as authorization pending.",
          ),
        };
      }
    },

    async reauthorize(id, signal) {
      const started = await api.request(
        "meri.connectors.oauthStart",
        { params: { id } },
        { signal },
      );
      return {
        authUrl: started.authUrl,
        alreadyConnected: started.alreadyConnected === true,
      };
    },

    async disconnect(connector, signal) {
      if (connector.authType === "oauth") {
        await api.request(
          "meri.connectors.oauthDisconnect",
          { params: { id: connector.id } },
          { signal },
        );
        return { kind: "authorization_revoked" };
      }
      // token / none: the delete owner is the only path that also clears `enabled` and the stored
      // key, so Meri's execution guard can no longer reach the service.
      await api.request(
        "meri.connectors.remove",
        { params: { id: connector.id } },
        { signal },
      );
      return { kind: "connection_removed" };
    },

    refresh: (signal) => api.request("meri.connectors.refresh", {}, { signal }),
  };
}
