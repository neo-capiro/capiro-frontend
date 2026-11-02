import { resolveFirstChatConversation } from "./first-chat-bootstrap";
import {
  markFirstChatIntentUsed,
  prepareNewConversation,
  type FirstChatScope,
} from "./first-chat-intent";
import { writeStarterDraft } from "../meri-starters/starter-draft";
import type { TabStorage } from "./tab-journal";

type IntentStorage = Pick<Storage, "getItem" | "setItem">;

/**
 * Moves an unsent message out of a conversation whose original (first) input is closed to it (expired, or
 * held by another message) into a new conversation of the same scope, as that conversation's unsent draft.
 * Nothing is sent: the person reviews it and presses Send there. Core creates the conversation through the
 * ordinary first-chat resolver; the closed conversation is marked used so it is never reopened for this.
 */
export async function moveDraftToNewConversation({
  scope,
  currentConversationId,
  draft,
  intentStorage,
  tabStorage,
  signal,
  createOrReuse,
}: {
  scope: FirstChatScope;
  currentConversationId: string;
  draft: string;
  intentStorage: IntentStorage;
  tabStorage?: TabStorage;
  signal: AbortSignal;
  createOrReuse: Parameters<
    typeof resolveFirstChatConversation
  >[0]["createOrReuse"];
}): Promise<{ conversationId: string }> {
  markFirstChatIntentUsed(scope, currentConversationId, intentStorage);
  prepareNewConversation(scope, currentConversationId, intentStorage);
  const { conversationId } = await resolveFirstChatConversation({
    scope,
    storage: intentStorage,
    signal,
    createOrReuse,
  });
  signal.throwIfAborted();
  if (conversationId === currentConversationId)
    throw new Error("A new conversation could not be started.");
  if (draft.trim())
    writeStarterDraft({
      scope: {
        tenantId: scope.tenantId,
        actorId: scope.actorId,
        clientId: scope.clientId,
        conversationId,
      },
      draft,
      ...(tabStorage ? { storage: tabStorage } : {}),
    });
  return { conversationId };
}
