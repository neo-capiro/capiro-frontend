"use client";
import { Button } from "@capiro/ui/button";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { useCapiro } from "../../../shared/capiro/CapiroBoundary";
import {
  firstChatCoreOperationKey,
  firstChatV2OperationKey,
} from "../../../shared/capiro/operations/meri-first-chat";
import { useSelectedClient } from "../../../shared/session/SelectedClient";
import type { ConversationAccount } from "../../../shared/meri-conversations/host-controller";
import { resolveFirstChatConversation } from "../../../shared/meri-conversations/first-chat-bootstrap";
import { conversationHref } from "../../../shared/meri-conversations/conversation-navigation";
import { conversationSelection } from "../../../shared/meri-conversations/selection";
import { newChatIntentEvent } from "../../../shared/meri-conversations/first-chat-intent";
import { useConversationSession } from "./useConversationSession";
import { researchRoute } from "../../../shared/meri-conversations/research-context";
import { ResearchConversationHost } from "./ResearchConversationHost";
import { ConversationView } from "./ConversationView";
import { DefaultScopeOpening } from "./DefaultScopeOpening";

export function MeriConversationHost({
  enabled,
  account,
  firstChatBootstrapEnabled = false,
  scopeControl,
}: {
  enabled: boolean;
  account?: ConversationAccount;
  firstChatBootstrapEnabled?: boolean;
  /** The one authorized client/scope control, hosted inside the composer footer. */
  scopeControl?: React.ReactNode;
}) {
  const selected = useSelectedClient();
  const params = useSearchParams();
  const selector = conversationSelection(params);
  const research = researchRoute(params);
  const general = params.get("scope") === "general" && !params.has("clientId");
  const invalidScope =
    research?.state === "invalid" ||
    (!research &&
      params.has("scope") &&
      (!general || params.getAll("scope").length !== 1));
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
        {scopeControl}
      </section>
    );
  if (selector.state === "invalid" || invalidScope)
    return (
      <section role="alert">
        <h2>Conversation selection unavailable</h2>
        <p>
          The conversation link is invalid. No other conversation was opened.
        </p>
        {scopeControl}
      </section>
    );
  if (research?.state === "research")
    return account ? (
      <ResearchConversationHost
        key={JSON.stringify([account, research])}
        account={account}
        conversationId={research.conversationId}
        portfolioId={research.portfolioId}
        canCreate={firstChatBootstrapEnabled}
      />
    ) : (
      <p role="status">
        Verify your account before opening this Research conversation.
      </p>
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
          scopeControl={scopeControl}
        />
      ) : (
        <section role="status">
          <h2>General chat is unavailable</h2>
          <p>The current conversation could not be confirmed.</p>
          {scopeControl}
        </section>
      );
    return (
      <ConnectedConversation
        key={key}
        account={account}
        clientId={null}
        scope="General"
        conversationId={selector.conversationId}
        scopeControl={scopeControl}
      />
    );
  }
  // A link that names a conversation without a scope must never be redirected away from it.
  if (
    account &&
    selected.state === "no-selection" &&
    selector.state === "current"
  )
    return (
      <DefaultScopeOpening
        key={`${account.tenantId}:${account.actorId}`}
        account={account}
        scopeControl={scopeControl}
      />
    );
  if (!account || selected.state !== "authorized-client")
    return (
      <section role="status">
        <h2>Conversation connection unavailable</h2>
        <p>
          {!account
            ? "Your account could not be verified. Reload or sign in again before opening a conversation."
            : selected.state === "no-selection"
              ? "Choose General or a permitted client above to start a conversation."
              : selected.state === "loading"
                ? "Verifying the selected client before opening a conversation."
                : "The selected client is unavailable. Choose General or another permitted client above."}
        </p>
        {scopeControl}
      </section>
    );
  // Core rechecks current client authority on bootstrap and session issuance.
  if (selected.client.status === "archived")
    return <ArchivedClientNotice scopeControl={scopeControl} />;
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
        scopeControl={scopeControl}
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
      scopeControl={scopeControl}
    />
  );
}

function ArchivedClientNotice({
  scopeControl,
}: {
  scopeControl?: React.ReactNode;
}) {
  return (
    <section role="alert">
      <h2>Conversations unavailable for this client</h2>
      <p>
        This client is archived. Restore it or select an active client in
        Portfolio to start a conversation.
      </p>
      {scopeControl}
    </section>
  );
}

type CoreResolution =
  | { state: "pending" }
  | { state: "ready"; conversationId: string }
  | { state: "error" };

/**
 * A scope opened without a conversation id is a new conversation. Core's receipt is verified,
 * then its id goes into the address so a reload or a shared link reopens this conversation and
 * only an explicit New conversation starts another; the host mounts the session from that link.
 */
function CoreResolvedConversation({
  account,
  clientId,
  scopeControl,
}: {
  account: ConversationAccount;
  clientId: string | null;
  scopeControl?: React.ReactNode;
}) {
  const api = useCapiro();
  const router = useRouter();
  const [attempt, setAttempt] = useState(0);
  const [resolution, setResolution] = useState<CoreResolution>({
    state: "pending",
  });
  const { tenantId, actorId } = account;
  useEffect(() => {
    if (resolution.state === "ready")
      router.replace(conversationHref(clientId, resolution.conversationId));
  }, [router, clientId, resolution]);
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
      .catch(() => {
        if (!controller.signal.aborted) setResolution({ state: "error" });
      });
    return () => controller.abort();
  }, [api, tenantId, actorId, clientId, attempt]);

  if (resolution.state === "error")
    return (
      <section role="alert">
        <h2>Conversation connection unavailable</h2>
        <p>The current conversation could not be confirmed.</p>
        <Button
          type="button"
          variant="outline"
          onClick={() => {
            setResolution({ state: "pending" });
            setAttempt((value) => value + 1);
          }}
        >
          Retry conversation
        </Button>
        {scopeControl}
      </section>
    );
  return (
    <section role="status">
      <h2>Preparing conversation</h2>
      <p>Confirming the current conversation.</p>
      {scopeControl}
    </section>
  );
}

/** One selected conversation; session changes preserve its draft and immutable recovery journal. */
function ConnectedConversation({
  account,
  clientId,
  scope,
  conversationId,
  scopeControl,
}: {
  account: ConversationAccount;
  clientId: string | null;
  scope: string;
  conversationId?: string | undefined;
  scopeControl?: React.ReactNode;
}) {
  const session = useConversationSession(account, clientId, conversationId);
  return (
    <ConversationView
      session={session}
      scope={scope}
      scopeControl={scopeControl}
    />
  );
}
