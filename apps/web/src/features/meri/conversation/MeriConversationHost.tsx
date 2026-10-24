"use client";
import { Button } from "@capiro/ui/button";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { useCapiro } from "../../../shared/capiro/CapiroBoundary";
import {
  firstChatCoreOperationKey,
  firstChatV2OperationKey,
} from "../../../shared/capiro/operations/meri-first-chat";
import { useSelectedClient } from "../../../shared/session/SelectedClient";
import type { ConversationAccount } from "../../../shared/meri-conversations/host-controller";
import {
  canBeginNewChatAfterConflict,
  resolveFirstChatConversation,
} from "../../../shared/meri-conversations/first-chat-bootstrap";
import { useBeginNewChat } from "../../../shared/meri-conversations/stored-conversation-recovery";
import { conversationSelection } from "../../../shared/meri-conversations/selection";
import { newChatIntentEvent } from "../../../shared/meri-conversations/first-chat-intent";
import { useConversationSession } from "./useConversationSession";
import { ConversationView } from "./ConversationView";

export function MeriConversationHost({
  enabled,
  account,
  firstChatBootstrapEnabled = false,
  firstChatBootstrapClientId,
}: {
  enabled: boolean;
  account?: ConversationAccount;
  firstChatBootstrapEnabled?: boolean;
  firstChatBootstrapClientId?: string;
}) {
  const selected = useSelectedClient();
  const params = useSearchParams();
  const selector = conversationSelection(params);
  const general = params.get("scope") === "general" && !params.has("clientId");
  const invalidScope =
    params.has("scope") && (!general || params.getAll("scope").length !== 1);
  const [newChatEpoch, setNewChatEpoch] = useState(0);
  useEffect(() => {
    if (selector.state !== "current") return;
    const restart = () => setNewChatEpoch((epoch) => epoch + 1);
    window.addEventListener(newChatIntentEvent, restart);
    return () => window.removeEventListener(newChatIntentEvent, restart);
  }, [selector.state]);
  if (!enabled)
    return (
      <section aria-labelledby="conversation-availability">
        <h2 id="conversation-availability">Conversations unavailable</h2>
        <p>
          The governed conversation connection is not enabled. Conversations and
          their files cannot be loaded.
        </p>
      </section>
    );
  if (selector.state === "invalid" || invalidScope)
    return (
      <section role="alert">
        <h2>Conversation selection unavailable</h2>
        <p>
          The conversation link is invalid. No other conversation was opened.
        </p>
      </section>
    );
  if (account && general) {
    const key = JSON.stringify([
      account.tenantId,
      account.actorId,
      null,
      selector,
      newChatEpoch,
    ]);
    if (selector.state === "current")
      return firstChatBootstrapEnabled ? (
        <CoreResolvedConversation
          key={key}
          account={account}
          clientId={null}
          scope="General"
        />
      ) : (
        <section role="status">
          <h2>General chat is unavailable</h2>
          <p>The current conversation could not be confirmed.</p>
        </section>
      );
    return (
      <ConnectedConversation
        key={key}
        account={account}
        clientId={null}
        scope="General"
        conversationId={selector.conversationId}
      />
    );
  }
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
  const ineligible = clientIneligibility(
    selected.client,
    firstChatBootstrapEnabled,
    firstChatBootstrapClientId,
  );
  if (ineligible) return <ClientIneligibleNotice reason={ineligible} />;
  if (firstChatBootstrapEnabled && selector.state === "current")
    return (
      <CoreResolvedConversation
        key={JSON.stringify([
          account.tenantId,
          account.actorId,
          selected.client.id,
          newChatEpoch,
        ])}
        account={account}
        clientId={selected.client.id}
        scope={selected.client.name}
      />
    );
  return (
    <ConnectedConversation
      key={JSON.stringify([
        account.tenantId,
        account.actorId,
        selected.client.id,
        selector,
      ])}
      account={account}
      clientId={selected.client.id}
      scope={selected.client.name}
      conversationId={
        selector.state === "selected" ? selector.conversationId : undefined
      }
    />
  );
}

type Ineligibility = "archived" | "not-configured";

function clientIneligibility(
  client: { id: string; status?: string | null },
  firstChatBootstrapEnabled: boolean,
  firstChatBootstrapClientId?: string,
): Ineligibility | null {
  // Core bootstrap and authority context refuse `status: "archived"` clients.
  // Stop before any Core create or Meri session; Core stays the authority.
  if (client.status === "archived") return "archived";
  if (firstChatBootstrapEnabled && client.id !== firstChatBootstrapClientId)
    return "not-configured";
  return null;
}

function ClientIneligibleNotice({ reason }: { reason: Ineligibility }) {
  return reason === "archived" ? (
    <section role="alert">
      <h2>Conversations unavailable for this client</h2>
      <p>
        This client is archived. Restore it or select an active client in
        Portfolio to start a conversation.
      </p>
    </section>
  ) : (
    <section role="alert">
      <h2>Conversation connection unavailable</h2>
      <p>This client is not configured for the current conversation.</p>
    </section>
  );
}

type CoreResolution =
  | { state: "pending" }
  | { state: "ready"; conversationId: string }
  | { state: "error"; canBeginNew: boolean };

/** The Core receipt is verified before mounting a component that can issue a Meri session. */
function CoreResolvedConversation({
  account,
  clientId,
  scope,
}: {
  account: ConversationAccount;
  clientId: string | null;
  scope: string;
}) {
  const api = useCapiro();
  const [attempt, setAttempt] = useState(0);
  const [resolution, setResolution] = useState<CoreResolution>({
    state: "pending",
  });
  const { tenantId, actorId } = account;
  const currentScope =
    clientId === null
      ? { tenantId, actorId, clientId, scopeKind: "general" as const }
      : { tenantId, actorId, clientId };
  const { restart, refuse } = useResolutionControls(setResolution, setAttempt);
  const beginNew = useBeginNewChat(currentScope, restart, refuse);
  useEffect(() => {
    const controller = new AbortController();
    void Promise.resolve()
      .then(() =>
        resolveFirstChatConversation({
          scope:
            clientId === null
              ? { tenantId, actorId, clientId, scopeKind: "general" }
              : { tenantId, actorId, clientId },
          storage: window.sessionStorage,
          signal: controller.signal,
          createOrReuse: (body, signal) =>
            body.schemaVersion === 2
              ? api.request(firstChatV2OperationKey, { body }, { signal })
              : api.request(firstChatCoreOperationKey, { body }, { signal }),
        }),
      )
      .then(({ conversationId }) => {
        if (!controller.signal.aborted)
          setResolution({ state: "ready", conversationId });
      })
      .catch((error: unknown) => {
        if (!controller.signal.aborted)
          setResolution({
            state: "error",
            canBeginNew: canBeginNewChatAfterConflict(
              error,
              clientId === null
                ? { tenantId, actorId, clientId, scopeKind: "general" }
                : { tenantId, actorId, clientId },
              () => window.sessionStorage,
            ),
          });
      });
    return () => controller.abort();
  }, [api, tenantId, actorId, clientId, attempt]);

  if (resolution.state === "pending")
    return (
      <section role="status">
        <h2>Preparing conversation</h2>
        <p>Confirming the current conversation.</p>
      </section>
    );
  if (resolution.state === "error")
    return (
      <section role="alert">
        <h2>Conversation connection unavailable</h2>
        <p>The current conversation could not be confirmed.</p>
        <Button type="button" variant="outline" onClick={restart}>
          Retry conversation
        </Button>
        {resolution.canBeginNew && (
          <Button type="button" onClick={beginNew}>
            New Chat
          </Button>
        )}
      </section>
    );
  return (
    <ConnectedConversation
      key={resolution.conversationId}
      account={account}
      clientId={clientId}
      scope={scope}
      conversationId={resolution.conversationId}
    />
  );
}

function useResolutionControls(
  setResolution: (value: CoreResolution) => void,
  setAttempt: (update: (value: number) => number) => void,
) {
  const restart = useCallback(() => {
    setResolution({ state: "pending" });
    setAttempt((value) => value + 1);
  }, [setResolution, setAttempt]);
  const refuse = useCallback(
    () => setResolution({ state: "error", canBeginNew: false }),
    [setResolution],
  );
  return { restart, refuse };
}

/** One selected conversation; session changes preserve its draft and immutable recovery journal. */
function ConnectedConversation({
  account,
  clientId,
  scope,
  conversationId,
}: {
  account: ConversationAccount;
  clientId: string | null;
  scope: string;
  conversationId?: string | undefined;
}) {
  const session = useConversationSession(account, clientId, conversationId);
  return <ConversationView session={session} scope={scope} />;
}
