"use client";
/**
 * Connected-services host — the composition owner for the connector library surface.
 *
 * It reads the current Core account (`useIdentity`) and keys the mounted scope by it, so a result
 * that settles after the account changed is never rendered under the new one. It owns only the
 * request lifetime and the view state; Core owns scope, ownership, OAuth state, token custody,
 * revocation and every provider call.
 *
 * The shared registry spread and the Settings slot stay with the central composition; until the
 * leaf operations join `capiroOperations`, the scoped client below is the only way to call them.
 */
import { useCallback, useMemo, useState } from "react";
import { useIdentity } from "../../../../shared/portfolio/auth/identity";
import { useCapiro } from "../../../../shared/capiro/CapiroBoundary";
import {
  createConnectorClient,
  type ConnectorApi,
  type ConnectOutcome,
} from "../../../../shared/meri-connectors/client";
import {
  connectedServiceRows,
  groupedCards,
  libraryCards,
  libraryNotice,
  type ConnectedServiceRow,
  type ConnectDraft,
  type ConnectorReadState,
} from "../../../../shared/meri-connectors/view";
import type {
  ConnectorLibrary,
  ConnectorRow,
  McpCatalogEntry,
} from "../../../../shared/capiro/operations/meri-connectors";
import { useCurrentRead } from "../../conversation/evidence/useCurrentRead";
import { ConnectorLibraryScreen } from "./ConnectorLibraryScreen";
import type { SettingsChrome, SettingsOutcome } from "./settings-view";

export function ConnectorLibraryHost({ chrome }: { chrome: SettingsChrome }) {
  const identity = useIdentity();
  const current = identity.data;
  const userId = current?.user?.id ?? "";
  const tenantId = current?.tenant?.id ?? "";
  if (identity.error)
    return (
      <p role="alert">
        The current Core account could not be verified, so connected services
        are unavailable.
      </p>
    );
  if (!tenantId || identity.isFetching)
    return <p role="status">Verifying the current Core account…</p>;
  return <Connected key={`${tenantId}/${userId}`} chrome={chrome} />;
}

function Connected({ chrome }: { chrome: SettingsChrome }) {
  const api = useCapiro();
  const client = useMemo(
    () => createConnectorClient(api as unknown as ConnectorApi),
    [api],
  );
  // The existing current-read hook owns the request lifetime: it aborts a superseded read and never
  // renders a value from a previous account or generation.
  const read = useCurrentRead(
    "connected-services",
    useCallback(
      (signal: AbortSignal) =>
        Promise.all([client.library(signal), client.servers(signal)]).then(
          ([library, servers]) => ({ library, servers }),
        ),
      [client],
    ),
  );
  const library: ConnectorLibrary | undefined = read.value?.library;
  const servers: readonly ConnectorRow[] = read.value?.servers ?? [];
  const [failure, setFailure] = useState<string | undefined>();
  const [outcome, setOutcome] = useState<SettingsOutcome | undefined>();
  const [openCardId, setOpenCardId] = useState<string | undefined>();
  const [busyId, setBusyId] = useState<string | undefined>();
  // Bumped after a settled request so the screen remounts and drops any drafted secret.
  const [settled, setSettled] = useState(0);
  const readState: ConnectorReadState = read.error
    ? "unavailable"
    : read.loading
      ? "loading"
      : "ready";

  const settle = useCallback(
    (result: ConnectOutcome, name: string) => {
      if (result.kind === "authorization_required") {
        // Core built the URL and holds the signed state; this is only navigation.
        window.location.assign(result.authUrl);
        return;
      }
      if (result.kind === "unknown_create") {
        // The add may have written a row. Reconcile from Core before offering anything else.
        setFailure(
          `${result.reason} The creation outcome is unknown, so the current connections were re-read; check them before trying again.`,
        );
        read.reload();
        return;
      }
      if (result.kind === "refused") {
        setFailure(result.reason);
        return;
      }
      if (result.kind === "authorization_pending") {
        setFailure(result.reason);
        setOpenCardId(undefined);
        setSettled((value) => value + 1);
        read.reload();
        return;
      }
      setFailure(undefined);
      const stored = result.connector;
      setOutcome({
        title:
          result.kind === "already_connected"
            ? `${name} is already authorized`
            : `${name} saved`,
        detail:
          result.kind === "already_connected"
            ? "Core reports an existing authorization for this connection."
            : stored.lastError
              ? `Core stored the connection but reported: ${stored.lastError} Meri can only use the tools Core actually discovered.`
              : "Core stored the connection and accepted its first tool discovery. Meri still re-checks the connection on every call.",
      });
      setOpenCardId(undefined);
      setSettled((value) => value + 1);
      read.reload();
    },
    [read],
  );

  const entryFor = (cardId: string): McpCatalogEntry | undefined =>
    library?.connectors.find((entry) => entry.id === cardId);

  const onConnect = (cardId: string, draft: ConnectDraft) => {
    const entry = entryFor(cardId);
    if (!entry) return;
    setBusyId(cardId);
    setFailure(undefined);
    void client
      .connect(entry, draft)
      .then((result) => settle(result, entry.name))
      .catch((error: unknown) =>
        setFailure(
          error instanceof Error && error.message
            ? error.message
            : "The connection request failed.",
        ),
      )
      .finally(() => setBusyId(undefined));
  };

  const onReauthorize = (connectorId: string) => {
    setBusyId(connectorId);
    setFailure(undefined);
    void client
      .reauthorize(connectorId)
      .then((started) => {
        if (started.authUrl) {
          window.location.assign(started.authUrl);
          return;
        }
        setOutcome({
          title: started.alreadyConnected
            ? "This connection is already authorized"
            : "No authorization page was returned",
          detail: started.alreadyConnected
            ? "Core reports a current authorization for this connection."
            : "Try again, or disconnect and connect the service afresh.",
        });
      })
      .catch((error: unknown) =>
        setFailure(
          error instanceof Error && error.message
            ? error.message
            : "Authorization could not be started.",
        ),
      )
      .finally(() => setBusyId(undefined));
  };

  const onDisconnect = (row: ConnectedServiceRow) => {
    setBusyId(row.id);
    setFailure(undefined);
    void client
      .disconnect({ id: row.id, authType: row.authType })
      .then((result) => {
        setOutcome(
          result.kind === "authorization_revoked"
            ? {
                title: "Authorization revoked",
                detail:
                  "Core cleared the stored OAuth authorization. The connection is listed as disconnected and Meri cannot call its tools until you authorize it again.",
              }
            : {
                title: "Connection removed",
                detail:
                  "Core deleted the stored connection and its API key, so Meri can no longer call this service's tools.",
              },
        );
        setSettled((value) => value + 1);
        read.reload();
      })
      .catch((error: unknown) =>
        setFailure(
          error instanceof Error && error.message
            ? error.message
            : "The connection could not be ended.",
        ),
      )
      .finally(() => setBusyId(undefined));
  };

  const onRefresh = () => {
    setBusyId("refresh");
    setFailure(undefined);
    void client
      .refresh()
      .then((refreshed) => {
        setOutcome({
          title: "Tool lists refreshed",
          detail: `${refreshed.tools.length} tool${refreshed.tools.length === 1 ? "" : "s"} are registered for this account.`,
        });
        read.reload();
      })
      .catch((error: unknown) =>
        setFailure(
          error instanceof Error && error.message
            ? error.message
            : "Tool lists could not be refreshed.",
        ),
      )
      .finally(() => setBusyId(undefined));
  };

  const cards = libraryCards(library?.connectors ?? [], servers);
  return (
    <ConnectorLibraryScreen
      key={settled}
      chrome={{
        ...chrome,
        notice: failure
          ? { title: "Connected services", detail: failure, tone: "danger" }
          : libraryNotice(library),
      }}
      view={{
        heading: {
          title: "Connected services",
          description:
            "Browse the external services Capiro can reach, connect one under your own identity, and review or revoke what is connected.",
        },
        notice: libraryNotice(library),
        state: readState,
        groups: groupedCards(cards),
        connected: {
          title: "Connected",
          description:
            "Stored authorizations Core reports for this account. A stored row is not a health claim; Meri still checks the connection on every call.",
          rows: connectedServiceRows(servers),
        },
        openCardId,
        busyId,
      }}
      outcome={outcome}
      onOpenCard={setOpenCardId}
      onConnect={onConnect}
      onReauthorize={onReauthorize}
      onDisconnect={onDisconnect}
      onRefresh={onRefresh}
      onRetry={read.reload}
    />
  );
}
