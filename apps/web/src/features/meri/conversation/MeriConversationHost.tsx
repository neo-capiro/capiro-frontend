"use client";
import { useSearchParams } from "next/navigation";
import { useSelectedClient } from "../../../shared/session/SelectedClient";
import type { ConversationAccount } from "../../../shared/meri-conversations/host-controller";
import { conversationSelection } from "../../../shared/meri-conversations/selection";
import { MeriLiveConversation } from "./MeriLiveConversation";
import { useConversationSession } from "./useConversationSession";
import { ConversationHistoryStatus } from "./ConversationHistoryStatus";
import { ConnectionPending } from "./ConnectionPending";

export function MeriConversationHost({
  enabled,
  account,
}: {
  enabled: boolean;
  account?: ConversationAccount;
}) {
  const selected = useSelectedClient();
  const selector = conversationSelection(useSearchParams());
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
  if (selector.state === "invalid")
    return (
      <section role="alert">
        <h2>Conversation selection unavailable</h2>
        <p>
          The conversation link is invalid. No other conversation was opened.
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

/** One selected conversation; session changes preserve its draft and immutable recovery journal. */
function ConnectedConversation({
  account,
  clientId,
  scope,
  conversationId,
}: {
  account: ConversationAccount;
  clientId: string;
  scope: string;
  conversationId?: string | undefined;
}) {
  const session = useConversationSession(account, clientId, conversationId);
  const { ready, connection } = session;
  if (!ready || session.latestTarget)
    return <ConnectionPending session={session} scope={scope} />;
  return (
    <MeriLiveConversation
      key={ready.lifetimeKey}
      port={ready.port}
      initialPrompt={connection.pending}
      earlier={session.earlier}
      scope={scope}
      draft={session.draft}
      onDraft={session.setDraft}
      textareaRef={session.textarea}
      onNextTurn={session.startNext}
      nextTurnBlocked={session.nextBlocked}
      promptKey={session.logicalKey}
      savedCurrent={session.savedCurrent}
      acceptedRequest={session.acceptedRequest}
      onSettled={session.refresh}
      historyStatus={<ConversationHistoryStatus session={session} />}
    />
  );
}
