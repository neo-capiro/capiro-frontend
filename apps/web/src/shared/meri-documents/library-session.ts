import {
  listConversations,
  readConversationTranscript,
  type ConversationListPage,
} from "../meri-conversations/history-client";
import { conversationInClient } from "../meri-conversations/history-pages";
import { bootstrapConversationSession } from "../meri-conversations/session";

type Account = { tenantId: string; actorId: string };
type ContextRow = ConversationListPage["conversations"][number];

/** A canonical retained origin identifies a client or General; it grants no access. */
export function libraryOriginClient(
  conversation: ContextRow,
  account: Account,
) {
  if (
    conversation.owner.tenantId !== account.tenantId ||
    conversation.owner.actorId !== account.actorId
  )
    throw new Error("Document account changed");
  const scopes = conversation.scopes;
  if (
    scopes.length === 0 ||
    scopes.some(
      (scope) =>
        scope.tenantId !== account.tenantId ||
        (scope.kind !== "client" &&
          !(
            scope.kind === "private-user" &&
            scope.resourceId === account.actorId
          )),
    )
  )
    throw new Error("Document origin is unavailable");
  const clients = new Set(
    scopes
      .filter((scope) => scope.kind === "client")
      .map((scope) => scope.resourceId),
  );
  if (clients.size === 1) return [...clients][0]!;
  if (clients.size === 0 && scopes.length === 1) return null;
  throw new Error("Document origin is unavailable");
}

/** Bounded discovery only. An empty filtered page can still have another continuation. */
export async function listLibraryContexts({
  account,
  clientId,
  before = null,
  signal,
  fetcher = fetch,
}: {
  account: Account;
  clientId?: string | null;
  before?: ConversationListPage["nextBefore"];
  signal: AbortSignal;
  fetcher?: typeof fetch;
}) {
  const page = await listConversations({ before, limit: 25 }, signal, fetcher);
  const conversations = page.conversations.filter((conversation) => {
    const origin = libraryOriginClient(conversation, account);
    return clientId === undefined || origin === clientId;
  });
  signal.throwIfAborted();
  return { conversations, nextBefore: page.nextBefore };
}

/** Read an already-saved run, then ask the existing current-authority session owner.
 * No first-chat, next-turn, initial-input or model/execution allocation is performed.
 * Terminal status is not rewritten here; current Core/artifact owners decide read access.
 */
export async function bootstrapLibrarySession({
  account,
  conversationId,
  clientId,
  signal,
  fetcher = fetch,
  now = Date.now,
}: {
  account: Account;
  conversationId: string;
  clientId: string | null;
  signal: AbortSignal;
  fetcher?: typeof fetch;
  now?: () => number;
}) {
  const page = await readConversationTranscript(
    { conversationId, limit: 1 },
    signal,
    fetcher,
  );
  const binding = page.latestRun.binding;
  if (
    page.conversation.conversationId !== conversationId ||
    !conversationInClient(page.conversation, account, clientId) ||
    binding.tenantId !== account.tenantId ||
    binding.actorId !== account.actorId ||
    binding.conversationId !== conversationId
  )
    throw new Error("Document origin changed");
  signal.throwIfAborted();
  return bootstrapConversationSession(
    { conversationId, clientId, runId: binding.runId },
    account,
    signal,
    fetcher,
    now,
  );
}
