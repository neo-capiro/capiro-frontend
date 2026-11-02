import type {
  ConversationListPage,
  ConversationSummary,
} from "./history-client";

/** The owned summary that names a discovered conversation: the same canonical row and immutable client scope. */
export function recentSummary(
  conversation: ConversationListPage["conversations"][number],
  summaries: readonly ConversationSummary[] | undefined,
) {
  const row = summaries?.find(
    (item) =>
      item.conversationId === conversation.conversationId &&
      item.status === "active",
  );
  if (!row) return undefined;
  const clients = conversation.scopes.filter(
    (scope) => scope.kind === "client",
  );
  const sameScope =
    row.clientId === null
      ? conversation.scopes.length === 1 &&
        conversation.scopes[0]?.kind === "private-user" &&
        conversation.scopes[0]?.resourceId === conversation.owner.actorId
      : clients.length === 1 && clients[0]?.resourceId === row.clientId;
  return sameScope ? row : undefined;
}
