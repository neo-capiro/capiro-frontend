"use client";
import {
  useEffect,
  useLayoutEffect,
  useState,
  useSyncExternalStore,
} from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@capiro/ui/button";
import { MeriFilesWorkflow } from "../../../features/meri/files/MeriFilesWorkflow";
import { useSelectedClient } from "../../../shared/session/SelectedClient";
import { OpaqueSessionController } from "../../../shared/meri-actions/opaque-session-controller";
import { DocumentWorkflow } from "../../../shared/meri-documents/workflow-adapter";
import { documentTransport } from "../../../shared/meri-documents/workflow-transport";
import { documentQueryJournal } from "../../../shared/meri-documents/query-journal";

type Operation = "create_word" | "create_excel";
export function MeriFilesHost({
  enabled,
  operation,
}: {
  enabled: boolean;
  operation: Operation;
}) {
  const selected = useSelectedClient();
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
  return (
    <ConnectedFiles
      key={`${operation}:${selected.requestedId}`}
      operation={operation}
      clientId={selected.requestedId}
      clientName={
        selected.state === "authorized-client"
          ? selected.client.name
          : "Selected client"
      }
      availability={selected.state}
    />
  );
}

function ConnectedFiles({
  clientId,
  clientName,
  availability,
  operation,
}: {
  clientId: string;
  clientName: string;
  operation: Operation;
  availability: "authorized-client" | "loading" | "unavailable";
}) {
  const queryClient = useQueryClient();
  const [host] = useState(
    () =>
      new OpaqueSessionController({
        hints: { clientId },
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
    <section aria-label="Document connection">
      <h1>Files</h1>
      <p>
        Client: {clientName}. A currently admitted document context is required.
      </p>
      <p role="status">
        {state.status === "connecting"
          ? "Checking the current document context…"
          : state.status === "expired"
            ? "Current document access is unavailable. Former file details have been cleared."
            : state.status === "unavailable"
              ? "The current document context could not be verified."
              : "Connect to check the current document context. No file is created or revised automatically."}
      </p>
      <Button
        type="button"
        disabled={state.status === "connecting"}
        onClick={() => void host.connect()}
      >
        Connect document service
      </Button>
    </section>
  );
}
