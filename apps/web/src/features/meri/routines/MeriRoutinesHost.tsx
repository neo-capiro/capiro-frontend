"use client";
import {
  useEffect,
  useLayoutEffect,
  useState,
  useSyncExternalStore,
} from "react";
import { Button } from "@capiro/ui/button";
import { useSelectedClient } from "../../../shared/session/SelectedClient";
import { useIdentity } from "../../../shared/portfolio/auth/identity";
import { useApi } from "../../../shared/portfolio/api/provider";
import { useCapiro } from "../../../shared/capiro/CapiroBoundary";
import {
  firstChatCoreOperationKey,
  firstChatV2OperationKey,
} from "../../../shared/capiro/operations/meri-first-chat";
import { resolveFirstChatConversation } from "../../../shared/meri-conversations/first-chat-bootstrap";
import { SessionLifetimeController } from "../../../shared/meri-actions/opaque-session-controller";
import { bootstrapRoutineSession } from "../../../shared/meri-routines/session";
import { createRoutinesAccess } from "../../../shared/meri-routines/access";
import { RoutineWorkflow } from "../../../shared/meri-routines/workflow";
import type { RoutineOwner } from "../../../shared/meri-routines/recovery";
import { RoutinesWorkspace } from "./RoutinesWorkspace";

export function MeriRoutinesHost({
  enabled,
  generalEnabled,
}: {
  enabled: boolean;
  generalEnabled: boolean;
}) {
  const selected = useSelectedClient();
  const identity = useIdentity();
  if (!enabled)
    return (
      <section role="status">
        <h1>Routines unavailable</h1>
        <p>The current Meri connection is not enabled.</p>
      </section>
    );
  if (!identity.data?.tenant?.id || identity.error)
    return <p role="status">Verifying the current routine account…</p>;
  const owner: RoutineOwner = {
    tenantId: identity.data.tenant.id,
    actorId: identity.data.user.id,
    selectedClientId:
      selected.state === "no-selection" ? null : selected.requestedId,
  };
  return (
    <Connected
      key={JSON.stringify(owner)}
      owner={owner}
      generalEnabled={generalEnabled}
      name={
        selected.state === "authorized-client"
          ? selected.client.name
          : owner.selectedClientId
            ? "Selected client"
            : "General"
      }
      available={
        !identity.isFetching &&
        (selected.state === "authorized-client" ||
          selected.state === "no-selection")
      }
      denied={selected.state === "unavailable"}
    />
  );
}

function Connected({
  owner,
  name,
  available,
  denied,
  generalEnabled,
}: {
  owner: RoutineOwner;
  name: string;
  available: boolean;
  denied: boolean;
  generalEnabled: boolean;
}) {
  const api = useApi();
  const capiro = useCapiro();
  const [host] = useState(
    () =>
      new SessionLifetimeController({
        issue: (signal) =>
          bootstrapRoutineSession({
            api,
            owner,
            signal,
            resolveConversation: async (signal) => {
              if (owner.selectedClientId === null && !generalEnabled)
                throw new Error("General routine context is not enabled.");
              const result = await resolveFirstChatConversation({
                scope:
                  owner.selectedClientId === null
                    ? {
                        tenantId: owner.tenantId,
                        actorId: owner.actorId,
                        clientId: null,
                        scopeKind: "general",
                      }
                    : {
                        tenantId: owner.tenantId,
                        actorId: owner.actorId,
                        clientId: owner.selectedClientId,
                      },
                storage: window.sessionStorage,
                signal,
                createOrReuse: (body, signal) => {
                  return body.schemaVersion === 1
                    ? capiro.request(
                        firstChatCoreOperationKey,
                        { body },
                        { signal },
                      )
                    : capiro.request(
                        firstChatV2OperationKey,
                        { body },
                        { signal },
                      );
                },
              });
              return result.conversationId;
            },
          }),
        createPort: ({ session, signal, isCurrent, onAccessLost }) =>
          new RoutineWorkflow({
            context: {
              tenantId: session.context.tenantId,
              actorId: session.context.actorId,
              conversationId: session.context.conversationId,
              runId: session.context.runId,
              selectedClientId: session.context.selectedClientId,
            },
            access: createRoutinesAccess(session.credential, signal),
            signal,
            isCurrent,
            onAccessLost,
          }),
      }),
  );
  useEffect(() => host.attach(), [host]);
  useLayoutEffect(() => {
    host.setClientAvailable(available);
    if (denied) host.revoke();
  }, [host, available, denied]);
  const state = useSyncExternalStore(
    host.subscribe,
    host.getSnapshot,
    host.getSnapshot,
  );
  const accessLost = denied || host.getExpirationReason() === "access-lost";
  useEffect(() => {
    // Recheck current Core identity through the existing issuer. No routine command is replayed.
    if (
      available &&
      !denied &&
      state.status === "expired" &&
      host.getExpirationReason() === "expiry"
    )
      void host.connect();
  }, [available, denied, host, state.status]);
  const [lastReady, setLastReady] = useState<RoutineWorkflow | null>(null);
  if (!accessLost && state.status === "ready" && lastReady !== state.port)
    setLastReady(state.port);
  if (accessLost && lastReady) setLastReady(null);
  return (
    <section style={{ padding: 24 }}>
      <p>
        Routine scope: {name}. Current account, scope and schedule authority are
        checked by the service.
      </p>
      {state.status !== "ready" && (
        <section aria-label="Routine connection">
          <p role="status">
            {accessLost
              ? "Routine access was denied. Connect to check current access."
              : state.status === "connecting"
                ? "Connecting to the current routine context…"
                : lastReady
                  ? "Routine connection unavailable. Connect again to continue. Connecting does not prepare or approve a routine."
                  : "Connect to review routines and recover saved requests. Connecting does not approve or run a routine."}
          </p>
          <Button
            disabled={!available || state.status === "connecting"}
            onClick={() => void host.connect()}
          >
            Connect routines
          </Button>
        </section>
      )}
      {!available && (
        <p role="status">Verifying current account and client access…</p>
      )}
      {lastReady && (
        <div hidden={!available || state.status !== "ready"}>
          <RoutinesWorkspace port={lastReady} preserveNewDraft />
        </div>
      )}
    </section>
  );
}
