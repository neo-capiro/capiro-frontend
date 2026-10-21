import type { QueryClient } from "@tanstack/react-query";
import {
  clearMeriConversationScope,
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
  if (key.length === 5) return fifth === scope.conversationId;
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
    clearMeriConversationScope(scope, storage);
  } finally {
    // Removing the owned query objects also fences late writers, including memory-only owners.
    cache.removeQueries({
      predicate: (query) =>
        matchesRecovery(query.queryKey, query.state.data, scope),
    });
  }
}
