"use client";
import { useRouter } from "next/navigation";
import { useCapiro } from "../../../shared/capiro/CapiroBoundary";
import {
  firstChatCoreOperationKey,
  firstChatV2OperationKey,
} from "../../../shared/capiro/operations/meri-first-chat";
import type { ConversationAccount } from "../../../shared/meri-conversations/host-controller";
import { firstChatScopeOf } from "../../../shared/meri-conversations/first-chat-intent";
import { conversationHref } from "../../../shared/meri-conversations/conversation-navigation";
import { moveDraftToNewConversation } from "../../../shared/meri-conversations/new-conversation-draft";
import { requireMeriTabStorage } from "../../../shared/meri-conversations/tab-journal";
import type { ResearchSelection } from "../../../shared/meri-conversations/research-context";
import { writeStarterDraft } from "../../../shared/meri-starters/starter-draft";
import { researchLaunchOwner } from "./research-launch";

/** Sends the person's unsent first message to a new conversation of the same scope, as its unsent draft. */
export type SendInNewConversation = (
  draft: string,
  signal: AbortSignal,
) => Promise<void>;

/**
 * The selected conversation's original input is closed to the person's first message (it expired before Meri
 * started it, or belongs to another message): the text moves to a new conversation of the same General or
 * client scope, which then opens. Nothing is sent until the person presses Send there.
 */
export function useSendInNewConversation(
  account: ConversationAccount,
  clientId: string | null,
  conversationId: string | undefined,
): SendInNewConversation {
  const api = useCapiro();
  const router = useRouter();
  return async (draft, signal) => {
    if (!conversationId) throw new Error("No conversation is selected.");
    const moved = await moveDraftToNewConversation({
      scope: firstChatScopeOf({ ...account, selectedClientId: clientId }),
      currentConversationId: conversationId,
      draft,
      intentStorage: window.sessionStorage,
      tabStorage: requireMeriTabStorage(),
      signal,
      createOrReuse: (body, requestSignal) =>
        body.schemaVersion === 2
          ? api.request(
              firstChatV2OperationKey,
              { body },
              { signal: requestSignal },
            )
          : api.request(
              firstChatCoreOperationKey,
              { body },
              { signal: requestSignal },
            ),
    });
    router.push(conversationHref(clientId, moved.conversationId));
  };
}

/**
 * The Research variant: a new Research conversation of the same portfolio, created once per closed conversation
 * through the existing launch journal (an uncertain creation is never replayed), holding the text as its draft.
 */
export function useSendInNewResearchConversation(
  account: ConversationAccount,
  research: ResearchSelection,
): SendInNewConversation {
  const api = useCapiro();
  const router = useRouter();
  return async (draft, signal) => {
    const storage = requireMeriTabStorage();
    if (!storage) throw new Error("This tab cannot hold the draft.");
    const portfolioId = research.scope.researchPortfolioId;
    const owner = researchLaunchOwner(
      account,
      portfolioId,
      storage,
      `research-relaunch:${research.conversationId}`,
    );
    const saved = owner.read();
    if (saved?.state === "unknown")
      throw new Error("Creation has not been confirmed here.");
    const conversationId =
      saved?.state === "created"
        ? saved.conversationId
        : (
            await owner.create(
              () =>
                api.request(
                  "meri.research.conversation.create",
                  { body: { researchPortfolioId: portfolioId } },
                  { signal },
                ),
              signal,
            )
          ).conversationId;
    if (draft.trim() && saved?.state !== "created")
      writeStarterDraft({
        scope: { ...account, clientId: null, conversationId },
        draft,
        storage,
      });
    router.push(
      conversationHref(
        { scopeKind: "research_portfolio", clientId: null },
        conversationId,
      ),
    );
  };
}
