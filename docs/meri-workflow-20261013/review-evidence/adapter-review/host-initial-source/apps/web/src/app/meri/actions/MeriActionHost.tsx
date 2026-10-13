"use client";
import { useEffect, useLayoutEffect, useState, useSyncExternalStore } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@capiro/ui/button";
import { MeriActionWorkflow } from "../../../features/meri/actions/MeriActionWorkflow";
import { useSelectedClient } from "../../../shared/session/SelectedClient";
import { ActionHostController } from "../../../shared/meri-actions/host-controller";
import { actionQueryJournal } from "../../../shared/meri-actions/query-journal";

export function MeriActionHost({ enabled }: { enabled: boolean }) {
  const selected = useSelectedClient();
  if (!enabled)
    return (
      <><p role="status" hidden={availability === "authorized-client"}>Verifying the current selected client…</p><div hidden={availability !== "authorized-client"}>
      <MeriActionWorkflow
        port={null}
        lifetimeKey="unavailable"
        contextLabel="The governed action connection is not enabled."
      />
    );
  if (selected.state === "no-selection")
    return (
      <section role="status">
        <h1>Choose a client</h1>
        <p>
          Select a currently available client in Portfolio to open this
          workflow.
        </p>
      </section>
    );
  return (
    <ConnectedHost
      key={selected.requestedId}
      clientId={selected.requestedId}
      clientName={selected.state === "authorized-client" ? selected.client.name : "Selected client"}
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
      new ActionHostController({
        hints: { clientId },
        journal: (context) => actionQueryJournal(queryClient, context),
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
      <MeriActionWorkflow
        port={state.port}
        lifetimeKey={state.lifetimeKey}
        contextLabel={`Client: ${clientName}. The service checks current authority for every request.`}
      /></div></>
    );
  if (availability !== "authorized-client") return <section role="status"><h1>{availability === "loading" ? "Verifying selected client…" : "Selected client unavailable"}</h1><p>Current client access must be verified before continuing.</p></section>;
  return (
    <section aria-label="Action connection">
      <h1>Recommendation follow-through</h1>
      <p>
        Client: {clientName}. A currently admitted service context is required.
      </p>
      <p role="status">
        {state.status === "connecting"
          ? "Checking the current action context…"
          : state.status === "expired"
            ? "Current action access is unavailable. Former workflow details have been cleared."
            : state.status === "unavailable"
              ? "The current action context could not be verified."
              : "Connect to check the current action context. No recommendation or task request starts automatically."}
      </p>
      <Button
        type="button"
        disabled={state.status === "connecting"}
        onClick={() => void host.connect()}
      >
        Connect action service
      </Button>
    </section>
  );
}
