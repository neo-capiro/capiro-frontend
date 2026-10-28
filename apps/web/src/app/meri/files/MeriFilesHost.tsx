"use client";
import Link from "next/link";
import {
  useEffect,
  useLayoutEffect,
  useState,
  useSyncExternalStore,
} from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@capiro/ui/button";
import ui from "../../../features/meri/ui/meri-ui.module.css";
import { MeriPageHeading } from "../../../features/meri/ui/MeriPageHeading";
import { MeriFilesWorkflow } from "../../../features/meri/files/MeriFilesWorkflow";
import { DocumentLibrary } from "../../../features/meri/files/DocumentLibrary";
import { LegacyReportLibrary } from "../../../features/meri/files/LegacyReportLibrary";
import { useSelectedClient } from "../../../shared/session/SelectedClient";
import { scopedHref } from "../../../shared/session/client-route";
import { useMeriCapabilities } from "../../../shared/meri-resources/CapabilityContext";
import { SessionLifetimeController } from "../../../shared/meri-actions/opaque-session-controller";
import { bootstrapActionSession } from "../../../shared/meri-actions/session-bootstrap";
import { createMeriConversation } from "@capiro/meri-client/conversation";
import {
  useIdentity,
  identitySchema,
} from "../../../shared/portfolio/auth/identity";
import { useApi } from "../../../shared/portfolio/api/provider";
import type { ApiClient } from "../../../shared/portfolio/api/http";
import { useCapiro } from "../../../shared/capiro/CapiroBoundary";
import { firstChatCoreOperationKey } from "../../../shared/capiro/operations/meri-first-chat";
import { resolveFirstChatConversation } from "../../../shared/meri-conversations/first-chat-bootstrap";
import { DocumentWorkflow } from "../../../shared/meri-documents/workflow-adapter";
import { documentTransport } from "../../../shared/meri-documents/workflow-transport";
import { documentQueryJournal } from "../../../shared/meri-documents/query-journal";
import { documentSessionContext } from "../../../shared/meri-documents/session-context";

type Operation = "create_word" | "create_excel";
export function MeriFilesHost({
  enabled,
  readEnabled = enabled,
  operation,
}: {
  enabled: boolean;
  readEnabled?: boolean;
  operation: Operation;
}) {
  const selected = useSelectedClient();
  const identity = useIdentity();
  const account =
    identity.data?.tenant?.id && !identity.error && !identity.isFetching
      ? { tenantId: identity.data.tenant.id, actorId: identity.data.user.id }
      : null;
  const clientId =
    selected.state === "authorized-client" ? selected.requestedId : undefined;
  const available =
    selected.state === "no-selection" || selected.state === "authorized-client";
  return (
    <>
      {account && available && (
        <LegacyReportLibrary
          key={JSON.stringify([account.tenantId, account.actorId, clientId])}
          {...(clientId ? { clientId } : {})}
        />
      )}
      {readEnabled &&
        (account && available ? (
          <DocumentLibrary
            key={JSON.stringify([account.tenantId, account.actorId, clientId])}
            account={account}
            {...(clientId ? { clientId } : {})}
          />
        ) : (
          <p role="status">
            Current account and client access must be verified before loading
            saved files.
          </p>
        ))}
      <DocumentCreationHost enabled={enabled} operation={operation} />
    </>
  );
}

function DocumentCreationHost({
  enabled,
  operation,
}: {
  enabled: boolean;
  operation: Operation;
}) {
  const selected = useSelectedClient();
  const identity = useIdentity();
  if (!enabled)
    return (
      <MeriFilesWorkflow
        port={null}
        lifetimeKey="unavailable"
        operation={operation}
        contextLabel="The governed document connection is not enabled."
      />
    );
  if (selected.state === "no-selection")
    return (
      <section role="status">
        <h1>Choose a client</h1>
        <p>
          Select a currently available client in Portfolio to open document
          files.
        </p>
      </section>
    );
  if (!identity.data?.tenant?.id || identity.error)
    return <p role="status">Verifying the current document account…</p>;
  const account = {
    tenantId: identity.data.tenant.id,
    actorId: identity.data.user.id,
  };
  return (
    <ConnectedFiles
      key={JSON.stringify([
        operation,
        account.tenantId,
        account.actorId,
        selected.requestedId,
      ])}
      account={account}
      operation={operation}
      clientId={selected.requestedId}
      clientName={
        selected.state === "authorized-client"
          ? selected.client.name
          : "Selected client"
      }
      availability={identity.isFetching ? "loading" : selected.state}
    />
  );
}

function ConnectedFiles({
  clientId,
  clientName,
  availability,
  operation,
  account,
}: {
  clientId: string;
  clientName: string;
  operation: Operation;
  availability: "authorized-client" | "loading" | "unavailable";
  account: { tenantId: string; actorId: string };
}) {
  const queryClient = useQueryClient();
  const api = useApi();
  const capiro = useCapiro();
  const capabilities = useMeriCapabilities();
  const [host] = useState(
    () =>
      new SessionLifetimeController({
        issue: (signal) =>
          bootstrapFileSession({
            api,
            account,
            clientId,
            signal,
            firstChat: {
              storage: window.sessionStorage,
              createOrReuse: (body, signal) => {
                if (body.schemaVersion !== 1)
                  throw new Error(
                    "A selected-client conversation is required.",
                  );
                return capiro.request(
                  firstChatCoreOperationKey,
                  { body },
                  { signal },
                );
              },
            },
          }),
        createPort: ({ session, signal, ...lifetime }) =>
          new DocumentWorkflow({
            session,
            operation,
            transport: documentTransport(session.credential, signal),
            journal: documentQueryJournal(queryClient, session.context),
            ...lifetime,
          }),
      }),
  );
  useEffect(() => host.attach(), [host]);
  useLayoutEffect(() => {
    host.setClientAvailable(availability === "authorized-client");
    if (availability === "unavailable") host.revoke();
  }, [host, availability]);
  const state = useSyncExternalStore(
    host.subscribe,
    host.getSnapshot,
    host.getSnapshot,
  );
  if (state.status === "ready")
    return (
      <>
        <p role="status" hidden={availability === "authorized-client"}>
          Verifying the current selected client…
        </p>
        <div hidden={availability !== "authorized-client"}>
          <MeriFilesWorkflow
            port={state.port}
            lifetimeKey={state.lifetimeKey}
            operation={operation}
            contextLabel={`Client: ${clientName}. The service checks current authority for every request.`}
          />
        </div>
      </>
    );
  if (availability !== "authorized-client")
    return (
      <section role="status">
        <h1>
          {availability === "loading"
            ? "Verifying selected client…"
            : "Selected client unavailable"}
        </h1>
        <p>Current client access must be verified before continuing.</p>
      </section>
    );
  return (
    <section className={ui.page} aria-label="Document connection">
      <MeriPageHeading title="Files" description={`Client: ${clientName}.`} />
      <p className={ui.muted}>
        Document creation uses a saved request from this tab’s current client
        chat. Connecting checks that context; it does not start a request.
      </p>
      <p className={ui.muted} role="status">
        {state.status === "connecting"
          ? "Checking the current document context…"
          : state.status === "expired"
            ? "Current document access is unavailable. Former file details have been cleared."
            : state.status === "unavailable"
              ? "The current document context could not be verified."
              : "Connect to check the current document context. No file is created or revised automatically."}
      </p>
      <div className={ui.row}>
        <Button
          type="button"
          className={ui.outline}
          disabled={state.status === "connecting"}
          onClick={() => void host.connect()}
        >
          Connect document service
        </Button>
        {capabilities.newConversation.status === "on" && (
          <p>
            <Link
              href={scopedHref("/meri", clientId)}
              prefetch={false}
              className="underline"
            >
              Open client chat
            </Link>
          </p>
        )}
      </div>
    </section>
  );
}

/** A Core conversation and an initial session alone do not establish an artifact run. */
export async function bootstrapFileSession({
  api,
  account,
  clientId,
  signal,
  firstChat,
  fetcher = fetch,
  now = Date.now,
}: {
  api: ApiClient;
  account: { tenantId: string; actorId: string };
  clientId: string;
  signal: AbortSignal;
  firstChat: Pick<
    Parameters<typeof resolveFirstChatConversation>[0],
    "storage" | "createOrReuse"
  >;
  fetcher?: typeof fetch;
  now?: () => number;
}) {
  const identity = await api.request("core", "me", identitySchema, { signal });
  if (
    identity.tenant?.id !== account.tenantId ||
    identity.user.id !== account.actorId
  )
    throw new Error("The current document account changed.");
  const resolved = await resolveFirstChatConversation({
    ...firstChat,
    scope: { ...account, clientId },
    signal,
  });
  const session = await bootstrapActionSession(
    await documentSessionContext({
      account,
      clientId,
      conversationId: resolved.conversationId,
      signal,
      fetcher,
    }),
    signal,
    fetcher,
    now,
  );
  if (
    session.context.tenantId !== account.tenantId ||
    session.context.actorId !== account.actorId
  )
    throw new Error("The current document account changed.");
  const reader = createMeriConversation({
    ...session,
    signal,
    now,
    fetchImpl: fetcher,
    credentialHeader: "x-meri-action-session",
    isCurrent: () => !signal.aborted,
    onAccessLost: () => undefined,
  });
  try {
    await reader.history({ limit: 1 });
    signal.throwIfAborted();
    const snapshot = reader.getSnapshot();
    if (
      snapshot.status !== "ready" ||
      !snapshot.acceptedRequest ||
      !snapshot.observation ||
      snapshot.observation.runState === "cancelled"
    )
      throw new Error(
        "The current document conversation has no available saved run.",
      );
    return session;
  } finally {
    reader.dispose();
  }
}
