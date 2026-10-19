"use client";
import {
  useEffect,
  useLayoutEffect,
  useState,
  useSyncExternalStore,
} from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@capiro/ui/button";
import { MeriTaskUpdates } from "../../../features/meri/task-updates/MeriTaskUpdates";
import { useSelectedClient } from "../../../shared/session/SelectedClient";
import { OpaqueSessionController } from "../../../shared/meri-actions/opaque-session-controller";
import { TaskUpdateWorkflow } from "../../../shared/meri-task-commands/workflow-adapter";
import { taskCommandTransport } from "../../../shared/meri-task-commands/transport";
import { taskCommandJournal } from "../../../shared/meri-task-commands/query-journal";

export function MeriTaskUpdateHost({ enabled }: { enabled: boolean }) {
  const selected = useSelectedClient();
  if (!enabled)
    return (
      <section role="status">
        <h1>Task updates unavailable</h1>
        <p>The governed task-update connection is not enabled.</p>
      </section>
    );
  if (selected.state === "no-selection")
    return (
      <section role="status">
        <h1>Choose a client</h1>
        <p>
          Select a currently available client in Portfolio to open task updates.
        </p>
      </section>
    );
  return (
    <ConnectedHost
      key={selected.requestedId}
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

function ConnectedHost({
  clientId,
  clientName,
  availability,
}: {
  clientId: string;
  clientName: string;
  availability: "authorized-client" | "loading" | "unavailable";
}) {
  const queryClient = useQueryClient();
  const [host] = useState(
    () =>
      new OpaqueSessionController({
        hints: { clientId },
        createPort: ({ session, signal, ...lifetime }) =>
          new TaskUpdateWorkflow({
            session,
            transport: taskCommandTransport(
              session.credential,
              session.context,
              signal,
            ),
            journal: taskCommandJournal(queryClient, session.context),
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
  if (availability !== "authorized-client")
    return (
      <section role="status">
        <h1>
          {availability === "loading"
            ? "Verifying selected client"
            : "Selected client unavailable"}
        </h1>
        <p>Current client access must be verified before continuing.</p>
      </section>
    );
  return (
    <section style={{ padding: 24 }}>
      <h1>Task updates</h1>
      <p>
        Client selection: {clientName}. The service checks current task
        authority for every request.
      </p>
      {state.status === "ready" ? (
        <MeriTaskUpdates port={state.port} lifetimeKey={state.lifetimeKey} />
      ) : (
        <ConnectionState
          status={state.status}
          connect={() => void host.connect()}
        />
      )}
    </section>
  );
}

function ConnectionState({
  status,
  connect,
}: {
  status: "idle" | "connecting" | "unavailable" | "expired";
  connect: () => void;
}) {
  return (
    <section aria-label="Task update connection">
      <p role="status">
        {status === "connecting"
          ? "Checking the current task-update context."
          : status === "expired"
            ? "Current task-update access is unavailable. Former workflow details have been cleared."
            : status === "unavailable"
              ? "The current task-update context could not be verified."
              : "Connect to check the current task-update context. No task update starts automatically."}
      </p>
      <Button
        type="button"
        disabled={status === "connecting"}
        onClick={connect}
      >
        Connect task-update service
      </Button>
    </section>
  );
}
