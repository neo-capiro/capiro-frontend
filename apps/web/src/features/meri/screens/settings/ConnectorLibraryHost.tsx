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
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { connectorRecoveryStore } from "../../../../shared/meri-connectors/recovery-store";
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
  markReconciling,
  noCreateRecovery,
  pendingOutcome,
  reconcileCreate,
  reduceRecovery,
  savedOutcome,
  unknownCreateMessage,
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
  if (!tenantId || !userId || identity.isFetching)
    return <p role="status">Verifying the current Core account…</p>;
  return (
    <Connected
      key={`${tenantId}/${userId}`}
      tenantId={tenantId}
      actorId={userId}
      chrome={chrome}
    />
  );
}

function Connected({
  chrome,
  tenantId,
  actorId,
}: {
  chrome: SettingsChrome;
  tenantId: string;
  actorId: string;
}) {
  const api = useCapiro();
  const client = useMemo(
    () => createConnectorClient(api as unknown as ConnectorApi),
    [api],
  );
  const recoveryStore = useMemo(
    () =>
      connectorRecoveryStore(tenantId, actorId, () => window.sessionStorage),
    [tenantId, actorId],
  );
  const creating = useRef(false);
  const lifetime = useRef<AbortController | null>(null);
  useEffect(() => {
    const controller = new AbortController();
    lifetime.current = controller;
    return () => controller.abort();
  }, []);
  // Row details stay in memory; unresolved catalog IDs survive navigation/reload in this tab.
  const [recovery, setRecovery] = useState(noCreateRecovery);
  // The existing current-read hook owns the request lifetime: it aborts a superseded read and never
  // renders a value from a previous account or generation.
  const read = useCurrentRead(
    "connected-services",
    useCallback(
      async (signal: AbortSignal) => {
        try {
          const unresolvedCatalogIds = recoveryStore.read();
          if (!signal.aborted)
            setRecovery((previous) => ({ ...previous, unresolvedCatalogIds }));
        } catch {
          /* Inventory remains readable; begin() refuses creates without recovery storage. */
        }
        const [library, servers] = await Promise.all([
          client.library(signal),
          client.servers(signal),
        ]);
        // A read that actually completed is the only authority that retires recovery state: it
        // drops unresolved entries whose row it now lists and known rows it can see itself. A
        // failed, aborted or in-flight read never reaches here, so ids are kept across those.
        if (!signal.aborted) {
          try {
            recoveryStore.reconcile(
              servers.flatMap((row) => (row.catalogId ? [row.catalogId] : [])),
            );
          } catch {
            /* A failed storage update keeps the persisted create unresolved. */
          }
          setRecovery((previous) =>
            reduceRecovery(previous, { type: "read", servers }),
          );
        }
        return { library, servers };
      },
      [client, recoveryStore],
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
  const reconciled = reconcileCreate(recovery, servers);
  // Rows this view created stay listed (and retryable) until a current read lists them itself.
  const rows = reconciled.rows;

  const settle = useCallback(
    (result: ConnectOutcome, entry: McpCatalogEntry) => {
      setRecovery((previous) =>
        reduceRecovery(previous, {
          type: "connect",
          catalogId: entry.id,
          result,
        }),
      );
      if (result.kind === "authorization_required") {
        // Core built the URL and holds the signed state; this is only navigation.
        window.location.assign(result.authUrl);
        return;
      }
      if (result.kind === "unknown_create") {
        // One list response cannot prove the write did not happen: block this entry until a
        // current read shows its row, and never offer a second ordinary add here.
        setFailure(unknownCreateMessage(entry));
        setSettled((value) => value + 1);
        read.reload();
        return;
      }
      if (result.kind === "refused") {
        recoveryStore.refused(entry.id);
        setFailure(result.reason);
        return;
      }
      if (result.kind === "authorization_pending") {
        setOutcome(pendingOutcome(entry, result.reason));
        setFailure(undefined);
        setOpenCardId(undefined);
        setSettled((value) => value + 1);
        read.reload();
        return;
      }
      setFailure(undefined);
      setOutcome(
        result.kind === "already_connected"
          ? {
              title: `${entry.name} is already authorized`,
              detail:
                "Core reports an existing authorization for this connection.",
            }
          : // The add response precedes discovery, so only "saved" is supportable here.
            savedOutcome(entry),
      );
      setOpenCardId(undefined);
      setSettled((value) => value + 1);
      read.reload();
    },
    [read, recoveryStore],
  );

  const entryFor = (cardId: string): McpCatalogEntry | undefined =>
    library?.connectors.find((entry) => entry.id === cardId);

  const onConnect = (cardId: string, draft: ConnectDraft) => {
    const entry = entryFor(cardId);
    const operation = lifetime.current;
    if (
      !entry ||
      !operation ||
      operation.signal.aborted ||
      creating.current ||
      readState !== "ready"
    )
      return;
    try {
      recoveryStore.begin(cardId);
    } catch (error) {
      setFailure(
        error instanceof Error
          ? error.message
          : "Connection recovery is unavailable.",
      );
      return;
    }
    creating.current = true;
    setBusyId(cardId);
    setFailure(undefined);
    void client
      .connect(entry, draft, operation.signal)
      .then((result) => {
        if (!operation.signal.aborted) settle(result, entry);
      })
      .catch((error: unknown) =>
        setFailure(
          error instanceof Error && error.message
            ? error.message
            : "The connection request failed.",
        ),
      )
      .finally(() => {
        creating.current = false;
        setBusyId(undefined);
      });
  };

  const onReauthorize = (connectorId: string) => {
    const operation = lifetime.current;
    if (!operation || operation.signal.aborted) return;
    setBusyId(connectorId);
    setFailure(undefined);
    void client
      .reauthorize(connectorId, operation.signal)
      .then((started) => {
        if (operation.signal.aborted) return;
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
            : "Refresh the connection list and retry authorization on this connection.",
        });
        read.reload();
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
    const operation = lifetime.current;
    if (!operation || operation.signal.aborted) return;
    setBusyId(row.id);
    setFailure(undefined);
    void client
      .disconnect({ id: row.id, authType: row.authType }, operation.signal)
      .then((result) => {
        if (operation.signal.aborted) return;
        // An acknowledged end of the connection also retires the remembered row, so a later empty
        // read cannot resurrect it from this view's own state.
        setRecovery((previous) =>
          reduceRecovery(previous, { type: "removal", rowId: row.id }),
        );
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
    const operation = lifetime.current;
    if (!operation || operation.signal.aborted) return;
    setBusyId("refresh");
    setFailure(undefined);
    void client
      .refresh(operation.signal)
      .then((refreshed) => {
        if (operation.signal.aborted) return;
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

  const cards = markReconciling(
    libraryCards(library?.connectors ?? [], rows),
    reconciled.recovery.unresolvedCatalogIds,
  );
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
          rows: connectedServiceRows(rows, library?.connectors ?? []),
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
