import type { QueryClient } from "@tanstack/react-query";
import { retirableConversationRequestId } from "./query-journal";
import {
  clearMeriConversationScope,
  discardMeriConversationMessages,
  type TabScope,
  type TabStorage,
} from "./tab-journal";

/** Recovery records use two existing key layouts; neither prefix alone establishes a scope. */
function matchesRecovery(
  key: readonly unknown[],
  data: unknown,
  scope: TabScope,
) {
  const [kind, tenant, actor, fourth, fifth, sixth] = key;
  if (tenant !== scope.tenantId || actor !== scope.actorId) return false;
  if (kind === "meri-conversation-intent")
    return (
      key.length === 6 &&
      fourth === scope.conversationId &&
      sixth === scope.clientId
    );
  if (fourth !== scope.clientId) return false;
  if (kind === "meri-conversation-turn")
    return key.length === 5 && fifth === scope.conversationId;
  if (kind !== "meri-conversation-selection") return false;
  if (key.length === 5 || (key.length === 7 && sixth === "research_portfolio"))
    return fifth === scope.conversationId;
  return (
    key.length === 4 &&
    data !== null &&
    typeof data === "object" &&
    "conversationId" in data &&
    data.conversationId === scope.conversationId
  );
}

/** Reauthorization may create fresh owners, never hydrate a revoked prompt from the still-mounted cache. */
export function clearMeriConversationRecovery(
  cache: QueryClient,
  scope: TabScope,
  storage?: TabStorage,
) {
  try {
    clearMeriConversationScope(scope, storage, retirableConversationRequestId);
  } finally {
    // Removing the owned query objects also fences late writers, including memory-only owners.
    cache.removeQueries({
      predicate: (query) =>
        matchesRecovery(query.queryKey, query.state.data, scope),
    });
  }
}

/** "Discard and write a new message": drop this conversation's unrecoverable message records and their
 * cached owners; the selection is kept, so the same conversation stays open for the new message. */
export function discardMeriConversationRecovery(
  cache: QueryClient,
  scope: TabScope,
  storage?: TabStorage,
) {
  try {
    discardMeriConversationMessages(scope, storage);
  } finally {
    cache.removeQueries({
      predicate: (query) =>
        query.queryKey[0] !== "meri-conversation-selection" &&
        matchesRecovery(query.queryKey, query.state.data, scope),
    });
  }
}
