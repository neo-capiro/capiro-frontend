import type { ResearchSelection } from "../../../shared/meri-conversations/research-context";
import type { QueryClient } from "@tanstack/react-query";
import { conversationSelectionOwner } from "../../../shared/meri-conversations/query-journal";
import { clearMeriConversationRecovery } from "../../../shared/meri-conversations/conversation-recovery";
import {
  requireMeriTabStorage,
  type TabScope,
  type TabStorage,
} from "../../../shared/meri-conversations/tab-journal";

/** Retire revoked recovery first; only a fresh owner may save a subsequently reauthorized run. */
export function renewConversationSelection(
  cache: QueryClient,
  scope: TabScope,
  routeConversationId: string | undefined,
  storage: TabStorage | undefined = requireMeriTabStorage(),
  research?: ResearchSelection,
) {
  clearMeriConversationRecovery(cache, scope, storage);
  return conversationSelectionOwner(
    cache,
    scope,
    scope.clientId,
    routeConversationId,
    storage,
    research,
  );
}
