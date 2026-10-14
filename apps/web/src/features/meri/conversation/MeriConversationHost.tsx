"use client";
import {
  useEffect,
  useLayoutEffect,
  useState,
  useSyncExternalStore,
} from "react";
import { useQueryClient } from "@tanstack/react-query";
import { conversationSelectionOwner } from "../../../shared/meri-conversations/query-journal";
import { useSelectedClient } from "../../../shared/session/SelectedClient";
import {
  ConversationHostController,
  type ConversationAccount,
} from "../../../shared/meri-conversations/host-controller";
import { MeriConversationView } from "./MeriConversationView";

export function MeriConversationHost({
  enabled,
  account,
}: {
  enabled: boolean;
  account?: ConversationAccount;
}) {
  const selected = useSelectedClient();
  if (!enabled)
    return (
      <section aria-labelledby="conversation-availability">
        <h2 id="conversation-availability">Conversations unavailable</h2>
        <p>
          The governed conversation connection is not enabled. Recent
          conversations and approval counts cannot be loaded.
        </p>
      </section>
    );
  if (!account || selected.state !== "authorized-client")
    return (
      <section role="status">
        <h2>Conversation connection unavailable</h2>
        <p>
          A verified account and current client are required. Select a permitted
          client in Portfolio.
        </p>
      </section>
    );
  return (
    <ConnectedConversation
      key={`${account.tenantId}:${account.actorId}:${selected.client.id}`}
      account={account}
      clientId={selected.client.id}
    />
  );
}
function ConnectedConversation({
  account,
  clientId,
}: {
  account: ConversationAccount;
  clientId: string;
}) {
  const cache = useQueryClient();
  const [host] = useState(() => {
    const selection = conversationSelectionOwner(cache, account, clientId);
    return new ConversationHostController({
      account,
      hints: selection.hints,
      onBound: selection.record,
    });
  });
  useEffect(() => host.attach(), [host]);
  useLayoutEffect(() => {
    host.setClientAvailable(true);
    return () => host.setClientAvailable(false);
  }, [host]);
  const state = useSyncExternalStore(
    host.subscribe,
    host.getSnapshot,
    host.getSnapshot,
  );
  if (state.status === "ready")
    return <MeriConversationView port={state.port} />;
  return (
    <section className="stack" role="status">
      <h2>
        {state.status === "expired"
          ? "Conversation session expired"
          : "Connect current conversation"}
      </h2>
      <p>
        {state.status === "unavailable"
          ? "The service could not verify this conversation. No sample transcript was substituted."
          : "The service rechecks your account, client and current conversation before issuing a short-lived connection."}
      </p>
      <button
        className="button"
        disabled={state.status === "connecting"}
        onClick={() => void host.connect()}
      >
        {state.status === "connecting"
          ? "Connecting…"
          : "Connect conversation service"}
      </button>
    </section>
  );
}
