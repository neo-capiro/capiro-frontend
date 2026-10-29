/**
 * Connected-services client — the existing Core owner, called through the existing ordinary Capiro
 * operation transport. It adds no transport, mints no authority and holds no credential: the
 * gateway attaches the reviewed capiro-template session token and Core resolves tenant/member scope,
 * ownership, OAuth state and token custody itself.
 *
 * What it does add is the one sequencing decision a person cannot make for us: a catalog add for an
 * OAuth entry is not finished until the provider authorizes it, so `connect` reports whether the
 * caller must now follow a returned authorization URL. The URL is Core's; this module never builds
 * one, never stores the verifier and never sees a token.
 */
import type { CapiroApi } from "../capiro/http";
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
  | { kind: "connected"; connector: ConnectorRow }
  | { kind: "authorization_required"; authUrl: string }
  | { kind: "already_connected" }
  | { kind: "refused"; reason: string };

export type ConnectorClient = {
  library(signal?: AbortSignal): Promise<ConnectorLibrary>;
  servers(signal?: AbortSignal): Promise<ConnectorRow[]>;
  connect(
    entry: McpCatalogEntry,
    draft: ConnectDraft,
    signal?: AbortSignal,
  ): Promise<ConnectOutcome>;
  /** Re-run authorization for an existing OAuth connector (reconnect / repair). */
  reauthorize(
    id: string,
    signal?: AbortSignal,
  ): Promise<{ authUrl: string | null; alreadyConnected: boolean }>;
  disconnect(id: string, signal?: AbortSignal): Promise<void>;
  remove(id: string, signal?: AbortSignal): Promise<void>;
  refresh(
    signal?: AbortSignal,
  ): Promise<{ tools: string[]; refreshedAt: string }>;
};

export function createConnectorClient(api: ConnectorApi): ConnectorClient {
  return {
    library: (signal) => api.request("meri.connectors.catalog", {}, { signal }),
    servers: (signal) => api.request("meri.connectors.servers", {}, { signal }),

    async connect(entry, draft, signal) {
      const gate = connectGate(entry, draft);
      if (!gate.ok) return { kind: "refused", reason: gate.reason };
      const body: AddConnectorBody = gate.body;
      const added = await api.request(
        "meri.connectors.add",
        { body },
        { signal },
      );
      if (!added.oauthRequired) return { kind: "connected", connector: added };
      const started = await api.request(
        "meri.connectors.oauthStart",
        { params: { id: added.id } },
        { signal },
      );
      if (started.authUrl)
        return { kind: "authorization_required", authUrl: started.authUrl };
      if (started.alreadyConnected) return { kind: "already_connected" };
      return {
        kind: "refused",
        reason:
          "The service did not return an authorization page. Try connecting again from Connected services.",
      };
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

    async disconnect(id, signal) {
      await api.request(
        "meri.connectors.oauthDisconnect",
        { params: { id } },
        { signal },
      );
    },

    async remove(id, signal) {
      await api.request(
        "meri.connectors.remove",
        { params: { id } },
        { signal },
      );
    },

    refresh: (signal) => api.request("meri.connectors.refresh", {}, { signal }),
  };
}
